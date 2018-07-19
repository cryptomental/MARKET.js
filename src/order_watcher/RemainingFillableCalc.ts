import { BigNumber } from 'bignumber.js';

// Types
import { MarketError } from '../types';
import { SignedOrder } from '@marketprotocol/types';

import { Provider } from '@0xproject/types';
import { ERC20TokenContractWrapper } from '../contract_wrappers/ERC20TokenContractWrapper';
import { Market } from '../Market';

/**
 * This class includes the functionality to calculate remaining fillable amount of the order.
 * Amount fillable depends on order, a new one or partially filled and amount of collateral.
 */
export class RemainingFillableCalculator {
  // region Members
  // *****************************************************************
  // ****                     Members                             ****
  // *****************************************************************
  //
  private _market: Market;
  private _signedOrder: SignedOrder;
  private _signedOrderHash: string;
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
    signedOrder: SignedOrder,
    signedOrderHash: string
  ) {
    this._market = market;
    this._collateralTokenAddress = collateralTokenAddress;
    this._collateralPoolAddress = collateralPoolAddress;
    this._signedOrder = signedOrder;
    this._signedOrderHash = signedOrderHash;
    this._erc20ContractWrapper = market.erc20TokenContractWrapper;
  }
  //
  //
  // endregion // Constructors

  // region Public Methods
  // *****************************************************************
  // ****                     Public Methods                      ****
  // *****************************************************************

  public async computeRemainingMakerFillable(): Promise<BigNumber> {
    let fillableQty: BigNumber;
    const hasAvailableFeeFunds: boolean = await this._hasMakerSufficientFundsForFee();

    if (!hasAvailableFeeFunds) {
      return Promise.reject<BigNumber>(new Error(MarketError.InsufficientBalanceForTransfer));
    }

    const makerAvailableCollateral = await this._getAvailableCollateral(this._signedOrder.maker);
    const neededCollateral = await this._market.calculateNeededCollateralAsync(
      this._signedOrder.contractAddress,
      this._signedOrder.orderQty,
      this._signedOrder.price
    );

    const alreadyFilledOrCancelled = await this._market.getQtyFilledOrCancelledFromOrderAsync(
      this._signedOrder.contractAddress,
      this._signedOrderHash
    );

    const remainingToFill = this._signedOrder.orderQty.minus(alreadyFilledOrCancelled);

    fillableQty = makerAvailableCollateral
      .dividedBy(neededCollateral)
      .times(this._signedOrder.orderQty);

    return BigNumber.min(fillableQty, remainingToFill);
  }

  public async computeRemainingTakerFillable(): Promise<BigNumber | null> {
    const makerFillable = await this.computeRemainingMakerFillable();
    const takerAvailableCollateral = await this._getAvailableCollateral(this._signedOrder.taker);
    const hasAvailableFeeFunds: boolean = await this._hasTakerSufficientFundsForFee();

    if (!hasAvailableFeeFunds) {
      return Promise.reject<BigNumber>(new Error(MarketError.InsufficientBalanceForTransfer));
    }

    const neededCollateral = await this._market.calculateNeededCollateralAsync(
      this._signedOrder.contractAddress,
      this._signedOrder.orderQty,
      this._signedOrder.price
    );

    let takerFillable = takerAvailableCollateral
      .dividedBy(neededCollateral)
      .times(this._signedOrder.orderQty);

    return BigNumber.min(makerFillable, takerFillable);
  }

  // endregion // Public Methods

  // region Private Methods
  // *****************************************************************
  // ****                     Private Methods                     ****
  // *****************************************************************

  private async _hasMakerSufficientFundsForFee(): Promise<boolean> {
    const makerMktBalance = await this._getAvailableFeeFunds(this._signedOrder.maker);
    const makerFeeNeeded = this._signedOrder.makerFee;

    return makerMktBalance.gte(makerFeeNeeded);
  }

  private async _hasTakerSufficientFundsForFee(): Promise<boolean> {
    const takerMktBalance = await this._getAvailableFeeFunds(this._signedOrder.taker);
    const takerFeeNeeded = this._signedOrder.takerFee;

    return takerMktBalance.gte(takerFeeNeeded);
  }

  private async _getAvailableFeeFunds(accountAddress: string): Promise<BigNumber> {
    const funds = await this._erc20ContractWrapper.getBalanceAsync(
      this._collateralTokenAddress,
      accountAddress
    );
    return funds;
  }

  private async _getAvailableCollateral(accountAddress: string): Promise<BigNumber> {
    const balance = await this._market.getUserAccountBalanceAsync(
      this._collateralPoolAddress,
      accountAddress
    );
    return balance || new BigNumber(0);
  }
  // endregion // Private Methods
}
