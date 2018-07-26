import BigNumber from 'bignumber.js';

export interface OrderFilledEvent {
  maker: string;
  taker: string;
  feeRecipient: string;
  filledQty: BigNumber;
  paidMakerFee: BigNumber;
  paidTakerFee: BigNumber;
  price: BigNumber;
  txHash: string;
  blockNumber: number | null;
}