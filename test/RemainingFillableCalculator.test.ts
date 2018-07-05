import Web3 from 'web3';
import BigNumber from 'bignumber.js';

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
  isValidSignatureAsync,
  signOrderHashAsync
} from '../src/lib/Order';

import { constants } from '../src/constants';
import { Market, Utils } from '../src';
import { getContractAddress } from './utils';

import { RemainingFillableCalculator } from '../src/order_watcher/RemainingFillableCalculator';

const TRUFFLE_NETWORK_URL = `http://localhost:9545`;
const TRUFFLE_NETWORK_ID = `4447`;

describe('RemainingFillableCalculator', () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(TRUFFLE_NETWORK_URL));
  const config: MARKETProtocolConfig = {
    networkId: constants.NETWORK_ID_TRUFFLE
  };
  let market: Market;
  const orderLifetimeSec: BigNumber = new BigNumber(60); // One minute order lifetime.
  const initialCredit: BigNumber = new BigNumber(1000); // 1000 Tokens initial credit.

  let distributionAccount: string;
  let makerAccount: string;
  let takerAccount: string;

  let orderLibAddress: string;

  let marketContractRegistry: MarketContractRegistry;
  let marketContractRegistryAddress: string;

  let marketContractAddress: string;
  let collateralPoolAddress: string;

  let deployedMarketContract: MarketContract;

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
    orderLibAddress = getContractAddress('OrderLib', TRUFFLE_NETWORK_ID);

    // Set up Market Contract
    marketContractAddress = (await marketContractRegistry.getAddressWhiteList)[0];
    deployedMarketContract = await MarketContract.createAndValidate(web3, marketContractAddress);

    // Set up Collateral Token
    const collateralTokenAddress: string = await deployedMarketContract.COLLATERAL_TOKEN_ADDRESS;
    collateralToken = await ERC20.createAndValidate(web3, collateralTokenAddress);

    // Set up Collateral Pool
    collateralPoolAddress = await deployedMarketContract.MARKET_COLLATERAL_POOL_ADDRESS;
    const collateralPool: MarketCollateralPool = await MarketCollateralPool.createAndValidate(
      web3,
      collateralPoolAddress
    );

    // withdraw all existing maker and taker collateral from the pool
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
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, makerCollateral, {
      from: makerAccount
    });
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, takerCollateral, {
      from: takerAccount
    });
    // Both Maker and Taker account need enough tokens for collateral.
    // Send them tokens from Distribution Account.
    await collateralToken
      .transferTx(makerAccount, initialCredit)
      .send({ from: distributionAccount });
    await collateralToken
      .transferTx(takerAccount, initialCredit)
      .send({ from: distributionAccount });
  });

  beforeEach(async () => {
    // Test case setup.
    // Before each test case Maker and Taker accounts deposit collateral into the collateral pool.

    await collateralToken
      .approveTx(collateralPoolAddress, initialCredit)
      .send({ from: makerAccount });
    await collateralToken
      .approveTx(collateralPoolAddress, initialCredit)
      .send({ from: takerAccount });

    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, initialCredit, {
      from: makerAccount
    });
    await depositCollateralAsync(web3.currentProvider, collateralPoolAddress, initialCredit, {
      from: takerAccount
    });

    // Collateral tokens are in the pool. Get current timestamp and set order expiration timestamp.
    currentUnixTimestampSec = Utils.getCurrentUnixTimestampSec();
    expirationUnixTimestampSec = currentUnixTimestampSec.plus(orderLifetimeSec);
  });

  afterEach(async () => {
    // test case teardown, withdraw all collateral from the pool
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
      `After test Maker collateral ${makerCollateral} taker collateral ${takerCollateral}`
    );
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, makerCollateral, {
      from: makerAccount
    });
    await withdrawCollateralAsync(web3.currentProvider, collateralPoolAddress, takerCollateral, {
      from: takerAccount
    });
  });

  afterAll(async () => {
    // test suite teardown
    // Be nice and send all collateral back to the distribution account.
  });

  async function createSignedOrderAsyncWithFees(
    orderQty: BigNumber,
    makerFee: BigNumber,
    takerFee: BigNumber
  ): Promise<SignedOrder> {
    const signedOrder = await market.createSignedOrderAsync(
      orderLibAddress,
      marketContractAddress,
      expirationUnixTimestampSec,
      constants.NULL_ADDRESS,
      makerAccount,
      makerFee,
      constants.NULL_ADDRESS,
      takerFee,
      orderQty,
      new BigNumber(1),
      orderQty,
      Utils.generatePseudoRandomSalt()
    );
    return signedOrder;
  }

  it('correctly returns fully fillable amount with zero fee', async () => {
    const qty = new BigNumber(10);
    const makerFee = new BigNumber(0);
    const takerFee = new BigNumber(0);
    const signedOrder = await createSignedOrderAsync(
      web3.currentProvider,
      orderLibAddress,
      marketContractAddress,
      expirationUnixTimestampSec,
      constants.NULL_ADDRESS,
      makerAccount,
      makerFee,
      constants.NULL_ADDRESS,
      takerFee,
      qty,
      new BigNumber(1),
      qty,
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

    console.log(`Signed Order `, signedOrder);
    const filledQty = await market.tradeOrderAsync(signedOrder, qty, {
      from: takerAccount,
      gas: 700000
    });
    console.log(`Filled qty `, filledQty);
    expect(filledQty).toEqual(qty);
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
