import { BigNumber } from 'bignumber.js';
import { SignedOrder } from '@marketprotocol/types';
import { Provider } from '@0xproject/types';

/**
 * A calculator thatr returns fillable order qty available to Taker,
 * and Maker. Uses MARKET CollateralPool to retrieve remaining unallocated balance.
 */
export class RemainingFillableCalculator {
  // region Members
  // *****************************************************************
  // ****                     Members                             ****
  // *****************************************************************
  //
  // private variables initialized in constructor
  private _provider: Provider;
  private _signedOrder: SignedOrder;

  // private variables initialized by methods
  private _collateralPoolContractAddress: string = '';
  private _remainingMakerTokenAmount: BigNumber = new BigNumber(0);
  private _remainingTakerTokenAmount: BigNumber = new BigNumber(0);
  private _remainingMakerFeeAmount: BigNumber = new BigNumber(0);
  private _remainingTakerFeeAmount: BigNumber = new BigNumber(0);
  // endregion // Members

  // region Constructors
  // *****************************************************************
  // ****                     Constructors                        ****
  // *****************************************************************
  //
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
    web3: Provider,
    signedOrder: SignedOrder,
    collateralPoolContractAddress: string
  ) {
    this._provider = web3;
    this._signedOrder = signedOrder;
    this._collateralPoolContractAddress = collateralPoolContractAddress;
  }
  // endregion // Constructors

  // region Public Methods
  // *****************************************************************
  // ****                     Public Methods                      ****
  // *****************************************************************
  public async computeRemainingMakerFillable(): Promise<BigNumber> {
    return new BigNumber(0);
  }
  public async computeRemainingTakerFillable(): Promise<BigNumber> {
    return new BigNumber(0);
  }
  // endregion // Public Methods

  // region Private Methods
  // *****************************************************************
  // ****                     Private Methods                     ****
  // *****************************************************************
  private _hasMakerSufficientFunds(): boolean {
    return false;
  }
  private _hasTakerSufficientFunds(): boolean {
    return false;
  }
  private _calculatePartiallyFillableMakerTokenAmount(): BigNumber {
    return new BigNumber(0);
  }
  // endregion // Private Methods
}
