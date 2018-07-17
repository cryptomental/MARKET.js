import Web3 from 'web3';
import BigNumber from 'bignumber.js';

import { ERC20, MarketContract, MARKETProtocolConfig, SignedOrder } from '@marketprotocol/types';

import { MarketError } from '../src/types';
import { Market, Utils } from '../src';
import { constants } from '../src/constants';

import {
  depositCollateralAsync,
  getUserAccountBalanceAsync,
  withdrawCollateralAsync
} from '../src/lib/Collateral';

import { createOrderHashAsync, createSignedOrderAsync } from '../src/lib/Order';

import { getContractAddress } from './utils';
import { RemainingFillableCalculator } from '../src/order_watcher/RemainingFillableCalc';

describe('Remaining Fillable Calculator', async () => {
  let web3;
  let config: MARKETProtocolConfig;
  let market: Market;
  let orderLibAddress: string;
  let contractAddresses: string[];
  let contractAddress: string;
  let deploymentAddress: string;
  let makerAddress: string;
  let takerAddress: string;
  let deployedMarketContract: MarketContract;
  let collateralTokenAddress: string;
  let collateralToken: ERC20;
  let collateralPoolAddress;
  let initialCredit: BigNumber;
  let fees: BigNumber;
  let orderQty: BigNumber;
  let price: BigNumber;

  beforeAll(async () => {
    web3 = new Web3(new Web3.providers.HttpProvider(constants.PROVIDER_URL_TRUFFLE));
    config = { networkId: constants.NETWORK_ID_TRUFFLE };
    market = new Market(web3.currentProvider, config);
    orderLibAddress = getContractAddress('OrderLib', constants.NETWORK_ID_TRUFFLE);
    contractAddresses = await market.marketContractRegistry.getAddressWhiteList;
    contractAddress = contractAddresses[0];
    deploymentAddress = web3.eth.accounts[0];
    makerAddress = web3.eth.accounts[1];
    takerAddress = web3.eth.accounts[2];
    deployedMarketContract = await MarketContract.createAndValidate(web3, contractAddress);
    collateralTokenAddress = await deployedMarketContract.COLLATERAL_TOKEN_ADDRESS;
    collateralToken = await ERC20.createAndValidate(web3, collateralTokenAddress);
    collateralPoolAddress = await deployedMarketContract.MARKET_COLLATERAL_POOL_ADDRESS;
    initialCredit = new BigNumber(1e23);
    orderQty = new BigNumber(100);
    price = new BigNumber(100000);
  });

  beforeEach(async () => {
    // Transfer initial credit amount of tokens to maker and deposit as collateral
    await collateralToken.transferTx(makerAddress, initialCredit).send({ from: deploymentAddress });
    await collateralToken
      .approveTx(collateralPoolAddress, initialCredit)
      .send({ from: makerAddress });
    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, initialCredit, {
      from: makerAddress
    });
  });

  afterEach(async () => {
    // Clean up. Withdraw all maker's and taker's collateral.
    const makerCollateral = await getUserAccountBalanceAsync(
      web3.currentProvider,
      collateralPoolAddress,
      makerAddress
    );
    const takerCollateral = await getUserAccountBalanceAsync(
      web3.currentProvider,
      collateralPoolAddress,
      takerAddress
    );
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, makerCollateral, {
      from: makerAddress
    });
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, takerCollateral, {
      from: takerAddress
    });
  });

  it('Checks the remaining fillable', async () => {
    jest.setTimeout(30000);
    let remainingFillable: BigNumber;

    fees = new BigNumber(0);
    const signedOrder: SignedOrder = await createSignedOrderAsync(
      web3.currentProvider,
      orderLibAddress,
      contractAddress,
      new BigNumber(Math.floor(Date.now() / 1000) + 60 * 60),
      constants.NULL_ADDRESS,
      makerAddress,
      fees,
      constants.NULL_ADDRESS,
      fees,
      new BigNumber(3),
      price,
      new BigNumber(3),
      Utils.generatePseudoRandomSalt()
    );

    console.log('Order signed');

    const calc = new RemainingFillableCalculator(
      market,
      collateralPoolAddress,
      collateralTokenAddress,
      signedOrder
    );

    let neededCollateral = await market.calculateNeededCollateralAsync(
      contractAddress,
      new BigNumber(3),
      price
    );

    console.log(`neededCollateral ${neededCollateral}`);

    let currentTakerCollateral = await getUserAccountBalanceAsync(
      web3.currentProvider,
      collateralPoolAddress,
      takerAddress
    );

    console.log(`currentTakerCollateral ${currentTakerCollateral}`);
    console.log(`Sending ${neededCollateral.minus(currentTakerCollateral)}`);

    await collateralToken
      .transferTx(takerAddress, neededCollateral.minus(currentTakerCollateral).times(2))
      .send({ from: deploymentAddress });
    await collateralToken
      .approveTx(collateralPoolAddress, neededCollateral.minus(currentTakerCollateral).times(2))
      .send({ from: takerAddress });
    await depositCollateralAsync(
      web3.currentProvider,
      collateralPoolAddress,
      neededCollateral.minus(currentTakerCollateral).times(2),
      {
        from: takerAddress
      }
    );

    currentTakerCollateral = await getUserAccountBalanceAsync(
      web3.currentProvider,
      collateralPoolAddress,
      takerAddress
    );

    console.log(`currentTakerCollateral ${currentTakerCollateral}`);

    await collateralToken
      .transferTx(makerAddress, neededCollateral)
      .send({ from: deploymentAddress });
    await collateralToken
      .approveTx(collateralPoolAddress, neededCollateral)
      .send({ from: makerAddress });
    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, neededCollateral, {
      from: makerAddress
    });

    let currentMakerCollateral = await getUserAccountBalanceAsync(
      web3.currentProvider,
      collateralPoolAddress,
      makerAddress
    );

    console.log(`currentMakerCollateral ${currentMakerCollateral}`);

    remainingFillable = await calc.computeRemainingMakerFillable();
    console.log(`remainingFillable ${remainingFillable}`);

    const orderHash = await createOrderHashAsync(
      web3.currentProvider,
      orderLibAddress,
      signedOrder
    );

    expect(
      await market.getQtyFilledOrCancelledFromOrderAsync(contractAddress, orderHash.toString())
    ).toEqual(new BigNumber(0));

    const fillQty = 2;
    console.log(`Trying to trade`);
    await market.tradeOrderAsync(signedOrder, new BigNumber(fillQty), {
      from: takerAddress,
      gas: 800000
    });

    expect(
      await market.getQtyFilledOrCancelledFromOrderAsync(contractAddress, orderHash.toString())
    ).toEqual(new BigNumber(fillQty));

    expect.assertions(2);
    try {
      await market.tradeOrderAsync(signedOrder, new BigNumber(1), {
        from: takerAddress,
        gas: 400000
      });
    } catch (e) {
      expect(e).toEqual(new Error(MarketError.OrderFilledOrCancelled));
    }
    remainingFillable = await calc.computeRemainingMakerFillable();
    console.log(`remainingFillable ${remainingFillable}`);
  });
});
