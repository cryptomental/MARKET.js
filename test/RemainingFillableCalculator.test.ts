import Web3 from 'web3';
import BigNumber from 'bignumber.js';

import {
  ERC20,
  MarketCollateralPool,
  MarketContract,
  MarketContractRegistry
} from '@marketprotocol/types';

import {
  depositCollateralAsync,
  getUserAccountBalanceAsync,
  withdrawCollateralAsync
} from '../src/lib/Collateral';

import { constants } from '../src/constants';
import { Market, Utils } from '../src';
import { getContractAddress } from './utils';

import { RemainingFillableCalculator } from '../src/order_watcher/RemainingFillableCalculator';
import { SignedOrder } from '../src/types/Order';

const TRUFFLE_NETWORK_URL = `http://localhost:9545`;
const TRUFFLE_NETWORK_ID = `4447`;

describe('RemainingFillableCalculator', () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(TRUFFLE_NETWORK_URL));
  const market: Market = new Market(web3.currentProvider);
  const orderLifetimeSec: BigNumber = new BigNumber(60); // One minute.
  const initialCredit: BigNumber = new BigNumber(1000); // 1000 Tokens initial credit.

  let orderHash: string;

  let distributionAccount: string;
  let makerAccount: string;
  let takerAccount: string;

  let orderLibAddress: string;

  let marketContractRegistry: MarketContractRegistry;
  let marketContractRegistryAddress: string;

  let marketContractAddress: string;
  let deployedMarketContract: MarketContract;

  let collateralToken: ERC20;

  let currentUnixTimestampSec: BigNumber;
  let expirationUnixTimestampSec: BigNumber;

  // Test suite setup.
  beforeAll(async () => {
    // Assign Truffle accounts
    distributionAccount = web3.eth.accounts[0];
    makerAccount = web3.eth.accounts[1];
    takerAccount = web3.eth.accounts[2];

    // Get OrderLib address to be able to create an order.
    orderLibAddress = getContractAddress('OrderLib', TRUFFLE_NETWORK_ID);

    // Set up Market Contract Registry
    marketContractRegistryAddress = getContractAddress(
      'MarketContractRegistry',
      TRUFFLE_NETWORK_ID
    );
    marketContractRegistry = await MarketContractRegistry.createAndValidate(
      web3,
      marketContractRegistryAddress
    );

    // Set up Market Contract
    marketContractAddress = (await marketContractRegistry.getAddressWhiteList)[0];
    deployedMarketContract = await MarketContract.createAndValidate(web3, marketContractAddress);

    // Set up Collateral Token
    const collateralTokenAddress: string = await deployedMarketContract.COLLATERAL_TOKEN_ADDRESS;
    collateralToken = await ERC20.createAndValidate(web3, collateralTokenAddress);

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
    const collateralPoolAddress: string = await deployedMarketContract.MARKET_COLLATERAL_POOL_ADDRESS;
    const collateralPool: MarketCollateralPool = await MarketCollateralPool.createAndValidate(
      web3,
      collateralPoolAddress
    );
    expect(await collateralPool.linkedAddress).toBe(deployedMarketContract.address);

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
  });

  afterAll(async () => {
    // test suite teardown
    // Be nice and send all collateral back to the distribution account.
  });

  async function createSignedOrderWithFees(
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
      new BigNumber(100),
      new BigNumber(5000),
      new BigNumber(100),
      Utils.generatePseudoRandomSalt()
    );
    return signedOrder;
  }

  it('correctly returns fully fillable amount with zero fee', () => {
    async () => {
      const signedOrder = createSignedOrderWithFees(new BigNumber(0), new BigNumber(0));
    };
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
