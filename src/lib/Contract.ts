import BigNumber from 'bignumber.js';

import { MarketContract } from '@marketprotocol/types';
import { MarketError } from '../types';

/***
 * Contract library fetches and hold all the necessary information about
 * a market contract.
 */
export class Contract {
  // region Members
  // *****************************************************************
  // ****                     Members                             ****
  // *****************************************************************
  private readonly _marketContract: MarketContract;
  private _fromBlockNumber: number = 0;
  private _toBlockNumber?: number;

  // endregion // Members

  // region Constructors
  // *****************************************************************
  // ****                     Constructors                        ****
  // *****************************************************************
  /***
   * Creates a Contract library instance with the specified parameters
   * @param {MarketContract} marketContract   MarketContract
   * @param {number} blockNumber              block number to filter events from
   */
  public constructor(
    marketContract: MarketContract,
    blockNumber?: number
  ) {
    this._marketContract = marketContract;
    this._fromBlockNumber = blockNumber ? blockNumber : 0;
    this._toBlockNumber = blockNumber;
  }
  // endregion // Constructors

  // region Public Methods
  // *****************************************************************
  // ****                     Public Methods                      ****
  // *****************************************************************

  /***
   * Fetches filled quantity for this order.
   * @returns {Promise<[]OrderFilledEvent]>}
   */
  get orderFilledEvents(): Promise<[]OrderFilledEvent]> {
    return (async () => {
      let stopEventWatcher = async () => {
        return;
      };

      try {
        const events = await Promise.race([
          this._getEvents(stopEventWatcher),
          this._watchForError()
        ]);
        return events;
      } catch (err) {
        await stopEventWatcher();
        return Promise.reject(err);
      }
    })();
  }

  // endregion // Public Methods
  // region Private Methods
  // *****************************************************************
  // ****                     Private Methods                     ****
  // *****************************************************************

  /***
   * Tries to fetch filledQty for this Order.
   * If nothing found, watches for when it is found.
   *
   * @param {() => Promise<void>} stopWatcher stop watching for filled Qty
   * @returns {Promise<BigNumber>}
   * @private
   */
  private _fetchOrWatchEvents(stopWatcher: () => Promise<void>): Promise<[]Event> {
    return new Promise<[]Event]>(async (resolve, reject) => {
      const watchFilter = { fromBlock: this._fromBlockNumber, toBlock: this._toBlockNumber };
      const orderFilledEvent = this._marketContract.OrderFilledEvent({ maker: this._order.maker });

      // try fetching events
      const eventLogs = await orderFilledEvent.get(watchFilter);
      let foundEvent = eventLogs.find(eventLog => eventLog.transactionHash === this.txHash);
      if (foundEvent) {
        resolve(new BigNumber(foundEvent.args.filledQty));
        return;
      }

      // if none found, watch for event
      stopWatcher = orderEvent.watch(watchFilter, (err, eventLog) => {
        if (err) {
          console.log(err);
        }

        if (eventLog.transactionHash === this.txHash) {
          stopWatcher()
            .then(function() {
              return resolve(new BigNumber(eventLog.args.filledQty));
            })
            .catch(reject);
        }
      });
    });
  }
}
