import { BigNumber } from 'bignumber.js';

// Types
import { MarketError } from '../types';
import { SignedOrder } from '@marketprotocol/types';

import { Provider } from '@0xproject/types';
import { ERC20TokenContractWrapper } from '../contract_wrappers/ERC20TokenContractWrapper';
import { Market } from '../Market';

import Web3 from 'web3';

import { getUserAccountBalanceAsync } from '../lib/Collateral';

/**
 * This class includes the functionality to calculate remaining amount of the order.
 */
export class RemainingFillableCalculator {
  // region Members
  // *****************************************************************
  // ****                     Members                             ****
  // *****************************************************************
  //
  private _market: Market;
  private _provider: Provider;
  private _signedOrder: SignedOrder;
  private _collateralPoolAddress: string;
  private _collateralTokenAddress: string;
  private _erc20ContractWrapper: ERC20TokenContractWrapper;

  // endregion // members

  // region Constructors
  // *****************************************************************
  // ****                     Constructors                        ****
  // *****************************************************************
  //
  constructor(
    market: Market,
    collateralPoolAddress: string,
    collateralTokenAddress: string,
    signedOrder: SignedOrder
  ) {
    this._market = market;
    this._provider = market.getProvider();
    this._collateralTokenAddress = collateralTokenAddress;
    this._collateralPoolAddress = collateralPoolAddress;
    this._signedOrder = signedOrder;
    this._erc20ContractWrapper = market.erc20TokenContractWrapper;
  }
  //
  //
  // endregion // Constructors

  // region Public Methods
  // *****************************************************************
  // ****                     Public Methods                      ****
  // *****************************************************************

  public async computeRemainingMakerFillable(): Promise<BigNumber | null> {
    console.log('+computeRemainingMakerFillable()');

    const makerAvailableCollateral = await this._getAvailableCollateral(this._signedOrder.maker);
    console.log(
      `Maker's ${
        this._signedOrder.maker
      } available collateral in pool is ${makerAvailableCollateral}`
    );

    const hasAvailableFeeFunds: boolean = await this._hasMakerSufficientFundsForFee();

    console.log(makerAvailableCollateral);
    console.log(hasAvailableFeeFunds);

    if (!hasAvailableFeeFunds) {
      return Promise.reject<BigNumber>(new Error(MarketError.InsufficientBalanceForTransfer));
    }

    const orderHash = await this._market.createOrderHashAsync(
      this._market.orderLib.address,
      this._signedOrder
    );

    const qtyFilledOrCancelled = await this._market.getQtyFilledOrCancelledFromOrderAsync(
      this._signedOrder.contractAddress,
      orderHash
    );

    console.log(orderHash);
    console.log(qtyFilledOrCancelled);
    console.log(this._signedOrder.orderQty);
    console.log(this._signedOrder.remainingQty);

    console.log('-computeRemainingMakerFillable()');

    return makerAvailableCollateral;
  }

  public async computeRemainingTakerFillable(): Promise<BigNumber | null> {
    console.log('+computeRemainingTakerFillable()');
    const takerAvailableCollateral = await this._getAvailableCollateral(this._signedOrder.taker);
    const hasAvailableFeeFunds: boolean = await this._hasTakerSufficientFundsForFee();

    if (!hasAvailableFeeFunds) {
      return Promise.reject<BigNumber>(new Error(MarketError.InsufficientBalanceForTransfer));
    }
    console.log('-computeRemainingTakerFillable()');
    return takerAvailableCollateral;
  }

  // endregion // Public Methods

  // region Private Methods
  // *****************************************************************
  // ****                     Private Methods                     ****
  // *****************************************************************

  private async _hasMakerSufficientFundsForFee(): Promise<boolean> {
    console.log('+_hasMakerSufficientFundsForFee()');
    const makerMktBalance = await this._getAvailableFeeFunds(this._signedOrder.maker);
    const makerFeeNeeded = this._signedOrder.takerFee;

    console.log(makerMktBalance);
    console.log(makerFeeNeeded);
    console.log('-_hasMakerSufficientFundsForFee()');
    return makerMktBalance >= makerFeeNeeded;
  }

  private async _hasTakerSufficientFundsForFee(): Promise<boolean> {
    const takerMktBalance = await this._getAvailableFeeFunds(this._signedOrder.taker);
    const takerFeeNeeded = this._signedOrder.takerFee;

    return takerMktBalance >= takerFeeNeeded;
  }

  private async _getAvailableFeeFunds(accountAddress: string): Promise<BigNumber> {
    console.log('+_getAvailableFeeFunds()');
    const funds = await this._erc20ContractWrapper.getBalanceAsync(
      this._collateralTokenAddress,
      accountAddress
    );
    console.log(funds);
    console.log('-_getAvailableFeeFunds()');
    return funds;
  }

  private async _getAvailableCollateral(accountAddress: string): Promise<BigNumber | null> {
    console.log('+_getAvailableCollateral()');
    const balance = await this._market.getUserAccountBalanceAsync(
      this._collateralPoolAddress,
      accountAddress
    );
    console.log(balance);
    console.log('-_getAvailableCollateral()');
    return balance;
  }
  // endregion // Private Methods
}
