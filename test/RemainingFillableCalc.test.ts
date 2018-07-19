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
    makerAddress = web3.eth.accounts[5];
    takerAddress = web3.eth.accounts[6];
    deployedMarketContract = await MarketContract.createAndValidate(web3, contractAddress);
    collateralTokenAddress = await deployedMarketContract.COLLATERAL_TOKEN_ADDRESS;
    collateralToken = await ERC20.createAndValidate(web3, collateralTokenAddress);
    collateralPoolAddress = await deployedMarketContract.MARKET_COLLATERAL_POOL_ADDRESS;
    initialCredit = new BigNumber(1e23);
    orderQty = new BigNumber(3);
    price = new BigNumber(100000);
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    // Transfer initial credit amount of tokens to maker and taker and deposit as collateral
    await collateralToken.transferTx(makerAddress, initialCredit).send({ from: deploymentAddress });
    await collateralToken
      .approveTx(collateralPoolAddress, initialCredit)
      .send({ from: makerAddress });
    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, initialCredit, {
      from: makerAddress
    });

    await collateralToken.transferTx(takerAddress, initialCredit).send({ from: deploymentAddress });
    await collateralToken
      .approveTx(collateralPoolAddress, initialCredit)
      .send({ from: takerAddress });
    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, initialCredit, {
      from: takerAddress
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

  it('Checks the fillable with no fees', async () => {
    fees = new BigNumber(0);

    let makerFillable: BigNumber;
    let takerFillable: BigNumber;

    const signedOrder: SignedOrder = await createSignedOrderAsync(
      web3.currentProvider,
      orderLibAddress,
      contractAddress,
      new BigNumber(Math.floor(Date.now() / 1000) + 60 * 60),
      constants.NULL_ADDRESS,
      makerAddress,
      fees,
      takerAddress,
      fees,
      orderQty,
      price,
      orderQty,
      Utils.generatePseudoRandomSalt()
    );

    const orderHash = await createOrderHashAsync(
      web3.currentProvider,
      orderLibAddress,
      signedOrder
    );

    const calc = new RemainingFillableCalculator(
      market,
      collateralPoolAddress,
      collateralTokenAddress,
      signedOrder,
      orderHash
    );

    let neededCollateral = await market.calculateNeededCollateralAsync(
      contractAddress,
      orderQty,
      price
    );

    makerFillable = await calc.computeRemainingMakerFillable();
    takerFillable = await calc.computeRemainingTakerFillable();

    await collateralToken
      .transferTx(takerAddress, neededCollateral)
      .send({ from: deploymentAddress });
    await collateralToken
      .approveTx(collateralPoolAddress, neededCollateral)
      .send({ from: takerAddress });
    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, neededCollateral, {
      from: takerAddress
    });

    expect(
      await market.getQtyFilledOrCancelledFromOrderAsync(contractAddress, orderHash.toString())
    ).toEqual(new BigNumber(0));

    const fillQty = 1;
    await market.tradeOrderAsync(signedOrder, new BigNumber(fillQty), {
      from: takerAddress,
      gas: 400000
    });

    expect(
      await market.getQtyFilledOrCancelledFromOrderAsync(contractAddress, orderHash.toString())
    ).toEqual(new BigNumber(fillQty));

    makerFillable = await calc.computeRemainingMakerFillable();
    takerFillable = await calc.computeRemainingTakerFillable();

    // maker deposits more collateral to allow fill the order
    await collateralToken
      .transferTx(makerAddress, neededCollateral)
      .send({ from: deploymentAddress });
    await collateralToken
      .approveTx(collateralPoolAddress, neededCollateral)
      .send({ from: makerAddress });
    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, new BigNumber(6e22), {
      from: makerAddress
    });

    takerFillable = await calc.computeRemainingTakerFillable();

    // taker fills half of the fillable
    try {
      await market.tradeOrderAsync(signedOrder, takerFillable.dividedBy(2), {
        from: takerAddress,
        gas: 400000
      });
    } catch (e) {
      expect(e).toEqual(new Error(MarketError.OrderFilledOrCancelled));
    }

    takerFillable = await calc.computeRemainingTakerFillable();

    // taker fills the remaining part of the order
    try {
      await market.tradeOrderAsync(signedOrder, takerFillable, {
        from: takerAddress,
        gas: 400000
      });
    } catch (e) {
      expect(e).toEqual(new Error(MarketError.OrderFilledOrCancelled));
    }

    makerFillable = await calc.computeRemainingMakerFillable();
    takerFillable = await calc.computeRemainingTakerFillable();

    const totalFilled = await market.getQtyFilledOrCancelledFromOrderAsync(
      contractAddress,
      orderHash.toString()
    );

    expect(makerFillable).toEqual(new BigNumber(0));
    expect(takerFillable).toEqual(new BigNumber(0));
    expect(totalFilled).toEqual(orderQty);
    expect.assertions(5);
  });

  it('Checks the fillable with fees, maker does not have enough to cover', async () => {
    const makerFee = new BigNumber(1e32);
    const takerFee = new BigNumber(0);

    const signedOrder: SignedOrder = await createSignedOrderAsync(
      web3.currentProvider,
      orderLibAddress,
      contractAddress,
      new BigNumber(Math.floor(Date.now() / 1000) + 60 * 60),
      deploymentAddress,
      makerAddress,
      makerFee,
      takerAddress,
      takerFee,
      orderQty,
      price,
      orderQty,
      Utils.generatePseudoRandomSalt()
    );

    const orderHash = await createOrderHashAsync(
      web3.currentProvider,
      orderLibAddress,
      signedOrder
    );

    const calc = new RemainingFillableCalculator(
      market,
      collateralPoolAddress,
      collateralTokenAddress,
      signedOrder,
      orderHash
    );

    try {
      await calc.computeRemainingMakerFillable();
    } catch (e) {
      expect(e).toEqual(new Error(MarketError.InsufficientBalanceForTransfer));
    }
    expect.assertions(1);
  });

  it('Checks the fillable with fees, taker does not have enough to cover', async () => {
    const makerFee = new BigNumber(0);
    const takerFee = new BigNumber(1e32);

    const signedOrder: SignedOrder = await createSignedOrderAsync(
      web3.currentProvider,
      orderLibAddress,
      contractAddress,
      new BigNumber(Math.floor(Date.now() / 1000) + 60 * 60),
      deploymentAddress,
      makerAddress,
      makerFee,
      takerAddress,
      takerFee,
      orderQty,
      price,
      orderQty,
      Utils.generatePseudoRandomSalt()
    );

    const orderHash = await createOrderHashAsync(
      web3.currentProvider,
      orderLibAddress,
      signedOrder
    );

    const calc = new RemainingFillableCalculator(
      market,
      collateralPoolAddress,
      collateralTokenAddress,
      signedOrder,
      orderHash
    );

    try {
      await calc.computeRemainingTakerFillable();
    } catch (e) {
      expect(e).toEqual(new Error(MarketError.InsufficientBalanceForTransfer));
    }
    expect.assertions(1);
  });

  it('Checks the fillable with fees, maker and taker have enough to cover', async () => {
    const makerFee = new BigNumber(100);
    const takerFee = new BigNumber(100);

    let makerFillable: BigNumber;
    let takerFillable: BigNumber;

    const signedOrder: SignedOrder = await createSignedOrderAsync(
      web3.currentProvider,
      orderLibAddress,
      contractAddress,
      new BigNumber(Math.floor(Date.now() / 1000) + 60 * 60),
      constants.NULL_ADDRESS,
      makerAddress,
      fees,
      takerAddress,
      fees,
      orderQty,
      price,
      orderQty,
      Utils.generatePseudoRandomSalt()
    );

    const orderHash = await createOrderHashAsync(
      web3.currentProvider,
      orderLibAddress,
      signedOrder
    );

    const calc = new RemainingFillableCalculator(
      market,
      collateralPoolAddress,
      collateralTokenAddress,
      signedOrder,
      orderHash
    );

    let neededCollateral = await market.calculateNeededCollateralAsync(
      contractAddress,
      orderQty,
      price
    );

    makerFillable = await calc.computeRemainingMakerFillable();
    takerFillable = await calc.computeRemainingTakerFillable();

    expect(makerFillable.isEqualTo(takerFillable));
  });
});
