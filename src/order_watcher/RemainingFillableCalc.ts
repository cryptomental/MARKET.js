import { BigNumber } from 'bignumber.js';

// Types
import { MarketError } from '../types';
import { SignedOrder } from '@marketprotocol/types';

import { Provider } from '@0xproject/types';
import { ERC20TokenContractWrapper } from '../contract_wrappers/ERC20TokenContractWrapper';
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
  private _provider: Provider;
  private _signedOrder: SignedOrder;
  private _collateralPoolAddress: string;
  private _erc20ContractWrapper: ERC20TokenContractWrapper;

  private _makerAvailableCollateral: BigNumber;
  private _takerAvailableCollateral: BigNumber;
  private _makerAvailableFeeFunds: BigNumber;
  private _takerAvailableFeeFunds: BigNumber;

  // endregion // members

  // region Constructors
  // *****************************************************************
  // ****                     Constructors                        ****
  // *****************************************************************
  //
  constructor(web3: Web3, collateralPoolAddress: string, signedOrder: SignedOrder) {
    this._provider = web3.currentProvider;
    this._collateralPoolAddress = collateralPoolAddress;
    this._signedOrder = signedOrder;
    this._erc20ContractWrapper = new ERC20TokenContractWrapper(web3);
  }
  //
  //
  // endregion//Constructors

  // region Public Methods
  // *****************************************************************
  // ****                     Public Methods                      ****
  // *****************************************************************

  public async computeRemainingMakerFillable(): Promise<BigNumber> {
    this._makerAvailableCollateral = await this._getAvailableCollateral(this._signedOrder.maker);
    const hasAvailableFeeFunds: boolean = await this._hasMakerSufficientFundsForFee();

    if (!hasAvailableFeeFunds) {
      return Promise.reject<BigNumber>(new Error(MarketError.InsufficientBalanceForTransfer));
    }

    return this._makerAvailableCollateral;
  }

  public async computeRemainingTakerFillable(): Promise<BigNumber> {
    this._takerAvailableCollateral = await this._getAvailableCollateral(this._signedOrder.taker);
    const hasAvailableFeeFunds: boolean = await this._hasTakerSufficientFundsForFee();

    if (!hasAvailableFeeFunds) {
      return Promise.reject<BigNumber>(new Error(MarketError.InsufficientBalanceForTransfer));
    }

    return this._makerAvailableCollateral;
  }

  // endregion //Public Methods

  // region Private Methods
  // *****************************************************************
  // ****                     Private Methods                     ****
  // *****************************************************************

  private async _hasMakerSufficientFundsForFee(): Promise<boolean> {
    const makerMktBalance = await this._getAvailableFeeFunds(this._signedOrder.maker);
    const makerFeeNeeded = this._signedOrder.takerFee;

    return makerMktBalance >= makerFeeNeeded;
  }

  private async _hasTakerSufficientFundsForFee(): Promise<boolean> {
    const takerMktBalance = await this._getAvailableFeeFunds(this._signedOrder.taker);
    const takerFeeNeeded = this._signedOrder.takerFee;

    return takerMktBalance >= takerFeeNeeded;
  }

  private async _getAvailableFeeFunds(accountAddress: string): Promise<BigNumber> {
    return new BigNumber(
      await this._erc20ContractWrapper.getBalanceAsync(
        this._signedOrder.contractAddress,
        accountAddress
      )
    );
  }

  private async _getAvailableCollateral(accountAddress: string): Promise<BigNumber> {
    return getUserAccountBalanceAsync(this._provider, this._collateralPoolAddress, accountAddress);
  }
  // endregion //Private Methods
}
