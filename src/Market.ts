import BigNumber from 'bignumber.js';
import Web3 from 'web3';

// Types
import { Provider } from '@0xproject/types';
import { ITxParams } from '@marketprotocol/types';
import { ECSignature, Order, SignedOrder } from './types/Order';

import { assert } from './assert';

import {
  depositCollateralAsync,
  getUserAccountBalanceAsync,
  settleAndCloseAsync,
  withdrawCollateralAsync
} from './lib/Collateral';

import { getAddressWhiteListAsync, getCollateralPoolContractAddressAsync } from './lib/Contract';

import {
  deployMarketCollateralPoolAsync,
  deployMarketContractOraclizeAsync
} from './lib/Deployment';

import {
  createOrderHashAsync,
  createSignedOrderAsync,
  signOrderHashAsync,
  tradeOrderAsync
} from './lib/Order';

/**
 * The `Market` class is the single entry-point into the MARKET.js library.
 * It contains all of the library's functionality and all calls to the library
 * should be made through a `Market` instance.
 */
export class Market {
  private _web3: Web3;

  /**
   * Instantiates a new Market instance that provides the public interface to the Market library.
   * @param {Provider} provider    The Provider instance you would like the Market library to use
   *                               for interacting with the Ethereum network.
   * @return {Market}              An instance of the Market class.
   */
  constructor(provider: Provider) {
    assert.isWeb3Provider('provider', provider);
    this._web3 = new Web3();
    this._web3.setProvider(provider);
  }

  // PROVIDER METHODS

  /**
   * Sets a new web3 provider for MARKET.js. Updating the provider will stop all
   * subscriptions so you will need to re-subscribe to all events relevant to your app after this call.
   * @param {Provider} provider    The Web3Provider you would like the MARKET.js library to use from now on.
   * @returns {void}
   */
  public setProvider(provider: Provider): void {
    this._web3.setProvider(provider);
  }

  /**
   * Get the provider instance currently used by MARKET.js
   * @return {Provider}    Web3 provider instance
   */
  public getProvider(): Provider {
    return this._web3.currentProvider;
  }

  // COLLATERAL METHODS

  /**
   * Deposits collateral to a traders account for a given contract address.
   * @param {string} collateralPoolContractAddress    Address of the MarketCollateralPool
   * @param {BigNumber | number} depositAmount        Amount of ERC20 collateral to deposit
   * @param {ITxParams} txParams                      Transaction parameters
   * @returns {Promise<boolean>}                      true if successful
   */
  public async depositCollateralAsync(
    collateralPoolContractAddress: string,
    depositAmount: BigNumber | number,
    txParams: ITxParams = {}
  ): Promise<boolean> {
    return depositCollateralAsync(
      this._web3.currentProvider,
      collateralPoolContractAddress,
      depositAmount,
      txParams
    );
  }

  /**
   * Gets the user's currently unallocated token balance
   * @param {string} collateralPoolContractAddress    Address of the MarketCollateralPool
   * @param {BigNumber | string} userAddress          Address of user
   * @returns {Promise<BigNumber|null>}               The user's currently unallocated token balance
   */
  public async getUserAccountBalanceAsync(
    collateralPoolContractAddress: string,
    userAddress: string
  ): Promise<BigNumber | null> {
    return getUserAccountBalanceAsync(
      this._web3.currentProvider,
      collateralPoolContractAddress,
      userAddress
    );
  }

  /**
   * Close all open positions post settlement and withdraws all collateral from a expired contract
   * @param {string} collateralPoolContractAddress    Address of the MarketCollateralPool
   * @param {ITxParams} txParams                      Transaction parameters
   * @returns {Promise<boolean>}                      true if successful
   */
  public async settleAndCloseAsync(
    collateralPoolContractAddress: string,
    txParams: ITxParams = {}
  ): Promise<boolean> {
    return settleAndCloseAsync(this._web3.currentProvider, collateralPoolContractAddress, txParams);
  }

  /**
   * Withdraws collateral from a traders account back to their own address.
   * @param {string} collateralPoolContractAddress    Address of the MarketCollateralPool
   * @param {BigNumber | number} withdrawAmount       Amount of ERC20 collateral to withdraw
   * @param {ITxParams} txParams                      Transaction parameters
   * @returns {Promise<boolean>}                      true if successful
   */
  public async withdrawCollateralAsync(
    collateralPoolContractAddress: string,
    withdrawAmount: BigNumber | number,
    txParams: ITxParams = {}
  ): Promise<boolean> {
    return withdrawCollateralAsync(
      this._web3.currentProvider,
      collateralPoolContractAddress,
      withdrawAmount,
      txParams
    );
  }

  // CONTRACT METHODS

  /**
   * Gets the collateral pool contract address
   * @param {string} marketContractAddress    Address of the Market contract
   * @returns {Promise<string>}               The user's currently unallocated token balance
   */
  public async getCollateralPoolContractAddressAsync(
    marketContractAddress: string
  ): Promise<string> {
    return getCollateralPoolContractAddressAsync(this._web3.currentProvider, marketContractAddress);
  }

  /**
   * Get all whilelisted contracts
   * @param {string} marketContractAddress    Address of the Market contract
   * @returns {Promise<string>}               The user's currently unallocated token balance
   */
  public async getAddressWhiteListAsync(marketContractAddress: string): Promise<string[]> {
    return getAddressWhiteListAsync(this._web3.currentProvider, marketContractAddress);
  }

  // DEPLOYMENT METHODS

  /**
   * Calls our factory to create a new MarketCollateralPool that is then linked to the supplied
   * marketContractAddress.
   * @param {string} marketCollateralPoolAddress
   * @param {string} marketContractAddress
   * @param {ITxParams} txParams
   * @returns {Promise<string>}                   Transaction ofsuccessful deployment.
   */
  public async deployMarketCollateralPoolAsync(
    marketCollateralPoolAddress: string,
    marketContractAddress: string,
    txParams: ITxParams = {}
  ): Promise<string> {
    return deployMarketCollateralPoolAsync(
      this._web3.currentProvider,
      marketCollateralPoolAddress,
      marketContractAddress,
      txParams
    );
  }

  /**
   * calls our factory that deploys a MarketContractOraclize and then adds it to
   * the MarketContractRegistry.
   * @param {string} marketContractFactoryAddress
   * @param {string} contractName
   * @param {string} collateralTokenAddress
   * @param {BigNumber[]} contractSpecs
   * @param {string} oracleDataSource
   * @param {string} oracleQuery
   * @param {ITxParams} txParams
   * @returns {Promise<string | BigNumber>}         Deployed address of the new Market Contract.
   */
  public async deployMarketContractOraclizeAsync(
    marketContractFactoryAddress: string,
    contractName: string,
    collateralTokenAddress: string,
    contractSpecs: BigNumber[], // not sure why this is a big number from the typedefs?
    oracleDataSource: string,
    oracleQuery: string,
    txParams: ITxParams = {}
  ): Promise<string | BigNumber> {
    return deployMarketContractOraclizeAsync(
      this._web3.currentProvider,
      marketContractFactoryAddress,
      contractName,
      collateralTokenAddress,
      contractSpecs,
      oracleDataSource,
      oracleQuery,
      txParams
    );
  }

  // ORDER METHODS

  /**
   * Computes the orderHash for a supplied order.
   * @param {string} orderLibAddress       Address of the deployed OrderLib.
   * @param {Order | SignedOrder} order    An object that conforms to the Order or SignedOrder interface definitions.
   * @return {Promise<string>}             The resulting orderHash from hashing the supplied order.
   */
  public async createOrderHashAsync(
    orderLibAddress: string,
    order: Order | SignedOrder
  ): Promise<string> {
    return createOrderHashAsync(this._web3.currentProvider, orderLibAddress, order);
  }

  /**
   * Signs an orderHash and returns it's elliptic curve signature.
   * @param {string} orderHash       Hex encoded orderHash to sign.
   * @param {string} signerAddress   The hex encoded Ethereum address you wish to sign it with. This address
   *                                 must be available via the Provider supplied to MARKET.js.
   * @return {Promise<ECSignature>}  An object containing the Elliptic curve signature parameters generated
   *                                 by signing the orderHash.
   */
  public async signOrderHashAsync(orderHash: string, signerAddress: string): Promise<ECSignature> {
    return signOrderHashAsync(this._web3.currentProvider, orderHash, signerAddress);
  }

  /***
   * Creates and signs a new order given the arguments provided
   * @param {string} orderLibAddress          address of the deployed OrderLib.sol
   * @param {string} contractAddress          address of the deployed MarketContract.sol
   * @param {BigNumber} expirationTimestamp   unix timestamp
   * @param {string} feeRecipient             address of account to receive fees
   * @param {string} maker                    address of maker account
   * @param {BigNumber} makerFee              fee amount for maker to pay
   * @param {string} taker                    address of taker account
   * @param {BigNumber} takerFee              fee amount for taker to pay
   * @param {BigNumber} orderQty              qty of Order
   * @param {BigNumber} price                 price of Order
   * @param {BigNumber} remainingQty          qty remaining
   * @param {BigNumber} salt                  used to ensure unique order hashes
   * @return {Promise<SignedOrder>}
   */
  public async createSignedOrderAsync(
    orderLibAddress: string,
    contractAddress: string,
    expirationTimestamp: BigNumber,
    feeRecipient: string,
    maker: string,
    makerFee: BigNumber,
    taker: string,
    takerFee: BigNumber,
    orderQty: BigNumber,
    price: BigNumber,
    remainingQty: BigNumber,
    salt: BigNumber
  ): Promise<SignedOrder> {
    return createSignedOrderAsync(
      this._web3.currentProvider,
      orderLibAddress,
      contractAddress,
      expirationTimestamp,
      feeRecipient,
      maker,
      makerFee,
      taker,
      takerFee,
      orderQty,
      price,
      remainingQty,
      salt
    );
  }

  /**
   * Trades an order and returns success or error.
   * @param {SignedOrder} signedOrder        An object that conforms to the SignedOrder interface. The
   *                                         signedOrder you wish to validate.
   * @param {BigNumber} fillQty              The amount of the order that you wish to fill.
   * @param {ITxParams} txParams             Transaction params of web3.
   * @return {Promise<BigNumber | number>}   Qty that was able to be filled.
   */
  public async tradeOrderAsync(
    signedOrder: SignedOrder,
    fillQty: BigNumber,
    txParams: ITxParams = {}
  ): Promise<BigNumber | number> {
    return tradeOrderAsync(this._web3.currentProvider, signedOrder, fillQty, txParams);
  }
}
