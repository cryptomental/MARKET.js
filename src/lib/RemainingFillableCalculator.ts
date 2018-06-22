/**
 * A calculator that allows to determine if an order is valid.
 * Returns fillable order qty available to Maker and Taker,
 * Uses MARKET CollateralPool to retrieve remaining unallocated balance.
 */
export class RemainingFillableCalculator {
  private _transferrableMakerTokenAmount: BigNumber;
  private _transferrableMakerFeeTokenAmount: BigNumber;
  private _remainingMakerTokenAmount: BigNumber;
  private _remainingMakerFeeAmount: BigNumber;

  constructor(
    signedOrder: SignedOrder,
    transferrableMakerTokenAmount: BigNumber,
    transferrableMakerFeeTokenAmount: BigNumber,
    remainingMakerTokenAmount: BigNumber
  ) {
    this._signedOrder = signedOrder;
    this._transferrableMakerTokenAmount = transferrableMakerTokenAmount;
    this._transferrableMakerFeeTokenAmount = transferrableMakerFeeTokenAmount;
    this._remainingMakerTokenAmount = remainingMakerTokenAmount;
  }
  public computeRemainingMakerFillable(): BigNumber {
    return new BigNumber(0);
  }
  public computeRemainingTakerFillable(): BigNumber {
    return new BigNumber(0);
  }
  private _hasSufficientFundsForFeeAndTransferAmount(): boolean {
    return False;
  }
  private _calculatePartiallyFillableMakerTokenAmount(): BigNumber {
    return new BigNumber(0);
  }
}
