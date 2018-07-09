import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import {
  ERC20,
  MarketCollateralPool,
  MarketContract,
  MarketContractRegistry,
  MARKETProtocolConfig,
  SignedOrder
} from '@marketprotocol/types';

import {
  depositCollateralAsync,
  getUserAccountBalanceAsync,
  withdrawCollateralAsync
} from '../src/lib/Collateral';

import {
  createOrderHashAsync,
  createSignedOrderAsync,
  isValidSignatureAsync
} from '../src/lib/Order';

import { constants } from '../src/constants';
import { Market, Utils } from '../src';
import { getContractAddress } from './utils';

describe('RemainingFillableCalculator', () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(constants.PROVIDER_URL_TRUFFLE));
  const config: MARKETProtocolConfig = {
    networkId: constants.NETWORK_ID_TRUFFLE
  };
  let market: Market;
  const orderLifetimeSec: BigNumber = new BigNumber(60); // One minute order lifetime.
  let initialCredit: BigNumber; // 1 000 000 Tokens initial credit.

  let distributionAccount: string;
  let makerAccount: string;
  let takerAccount: string;

  let orderLibAddress: string;

  let contractAddress: string;
  let collateralTokenAddress: string;
  let collateralPoolAddress: string;

  let deployedMarketContract: MarketContract;
  let collateralPool: MarketCollateralPool;
  let collateralToken: ERC20;

  let currentUnixTimestampSec: BigNumber;
  let expirationUnixTimestampSec: BigNumber;

  // Test suite setup.
  beforeAll(async () => {
    market = new Market(web3.currentProvider, config);
    distributionAccount = web3.eth.accounts[0];
    makerAccount = web3.eth.accounts[1];
    takerAccount = web3.eth.accounts[2];

    // Get OrderLib address to be able to create an order.
    orderLibAddress = getContractAddress('OrderLib', constants.NETWORK_ID_TRUFFLE);

    // Get Market Contract address
    contractAddress = (await market.marketContractRegistry.getAddressWhiteList)[0];

    deployedMarketContract = await MarketContract.createAndValidate(web3, contractAddress);
    expect(await deployedMarketContract.isCollateralPoolContractLinked).toBe(true);
    expect(await deployedMarketContract.isSettled).toBe(false);

    collateralTokenAddress = await deployedMarketContract.COLLATERAL_TOKEN_ADDRESS;
    collateralToken = await ERC20.createAndValidate(web3, collateralTokenAddress);
  });

  beforeEach(async () => {
    // Test case setup.
  });

  afterEach(async () => {
    // test case teardown, withdraw all collateral from the pool
    /*
    const makerCollateral: BigNumber = await getUserAccountBalanceAsync(
      web3.currentProvider,
      collateralPoolAddress,
      makerAccount
    );
    const takerCollateral: BigNumber = await getUserAccountBalanceAsync(
      web3.currentProvider,
      collateralPoolAddress,
      takerAccount
    );
    console.log(
      `Withdrawing all maker collateral ${makerCollateral} tand aker collateral ${takerCollateral} from the pool.`
    );
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, makerCollateral, {
      from: makerAccount
    });
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, takerCollateral, {
      from: takerAccount
    });
    */
  });

  afterAll(async () => {
    // test suite teardown
    // Be nice and send all collateral back to the distribution account.
  });

  it('correctly returns fully fillable amount with zero fee', async () => {
    const expirationTimestamp = new BigNumber(Math.floor(Date.now() / 1000) + 60 * 60);
    const maker = web3.eth.accounts[1];
    const taker = web3.eth.accounts[2];
    const deploymentAddress = web3.eth.accounts[0];

    initialCredit = new BigNumber(1e22);

    // Both maker and taker account need enough tokens for collateral.  Our deployment address
    // should have all of the tokens and be able to send them.
    await collateralToken.transferTx(maker, initialCredit).send({ from: deploymentAddress });
    await collateralToken.transferTx(taker, initialCredit).send({ from: deploymentAddress });

    // now both maker and taker addresses need to deposit collateral into the collateral pool.
    const collateralPoolAddress = await deployedMarketContract.MARKET_COLLATERAL_POOL_ADDRESS;
    const collateralPool = await MarketCollateralPool.createAndValidate(
      web3,
      collateralPoolAddress
    );
    expect(await collateralPool.linkedAddress).toBe(deployedMarketContract.address);

    await collateralToken.approveTx(collateralPoolAddress, initialCredit).send({ from: maker });

    await collateralToken.approveTx(collateralPoolAddress, initialCredit).send({ from: taker });

    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, initialCredit, {
      from: maker
    });

    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, initialCredit, {
      from: taker
    });

    const fees: BigNumber = new BigNumber(0);
    const orderQty: BigNumber = new BigNumber(1);
    const price: BigNumber = new BigNumber(1);

    const signedOrder: SignedOrder = await createSignedOrderAsync(
      web3.currentProvider,
      orderLibAddress,
      contractAddress,
      expirationTimestamp,
      constants.NULL_ADDRESS,
      maker,
      fees,
      constants.NULL_ADDRESS,
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

    expect(
      await isValidSignatureAsync(
        web3.currentProvider,
        orderLibAddress,
        signedOrder,
        orderHash.toString()
      )
    ).toBe(true);

    expect(
      await market.tradeOrderAsync(signedOrder, new BigNumber(2), {
        from: taker,
        gas: 400000
      })
    ).toEqual(new BigNumber(1));
  });

  it('correctly returns fully fillable amount with non-zero fee', () => {
    async () => {
      // test case body
    };
  });

  it('correctly returns partially fillable amount with zero fee', () => {
    async () => {
      // test case body
    };
  });

  it('correctly returns partially fillable amount with non-zero fee', () => {
    async () => {
      // test case body
    };
  });

  it('correctly returns non-fillable amount with zero fee', () => {
    async () => {
      // test case body
    };
  });

  it('correctly returns non-fillable amount when amount of collateral is enough only to cover the fee', () => {
    async () => {
      // test case body
    };
  });
});
