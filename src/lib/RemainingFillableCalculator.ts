import { BigNumber } from 'bignumber.js';

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
  private _collateralPoolContractAddress: string;

  constructor(
    /* Signed Order provides:
     *    contractAddress: contractAddress,
     *    expirationTimestamp: expirationTimestamp,
     *    feeRecipient: feeRecipient,
     *    maker: maker,
     *    makerFee: makerFee,
     *    orderQty: orderQty,
     *    price: price,
     *    remainingQty: remainingQty,
     *    salt: salt,
     *    taker: taker,
     *    takerFee: takerFee,
     *    ecSignature:
     */
    /* getUserAccountBalanceAsync(collateralPoolContractAddress: string,
                                   userAddress: string) : Promise<BigNumber>
        provides unallocated token balance for a user.

     */
    signedOrder: SignedOrder,
    collateralPoolContractAddress: string,
    transferrableMakerTokenAmount: BigNumber,
    transferrableMakerFeeTokenAmount: BigNumber,
    remainingMakerTokenAmount: BigNumber
  ) {
    this._signedOrder = signedOrder;
    this._collateralPoolContractAddress = collateralPoolContractAddress;
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
