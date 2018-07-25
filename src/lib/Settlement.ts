import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import * as Decoder from 'ethereum-input-data-decoder';

// Types
import { Provider, Transaction } from '@0xproject/types';
import {
  CollateralToken,
  ITxParams,
  MarketCollateralPool,
  MarketToken
} from '@marketprotocol/types';

import { MarketError } from '../types';
import { ERC20TokenContractWrapper } from '../contract_wrappers/ERC20TokenContractWrapper';

/**
 * Gets the history of fills for a given contract address.
 * @param {Provider} provider                       Web3 provider instance.
 * @param {string} collateralPoolContractAddress    address of the MarketCollateralPool
 * @param {string} fromBlock                        from block #
 * @param {string} toBlock                          to block #
 * @param {string} userAddress                      only search for deposits/withdrawals to/from a specified address
 * @returns {Promise<CollateralEvent[]>} 
 */
export async function getCollateralEventsAsync(
    provider: Provider,
    collateralPoolContractAddress: string,
    fromBlock: number|string = '0x0',
    toBlock: number|string = 'latest',
    userAddress: string|null = null,
  ): Promise<CollateralEvent[]> {
    const web3: Web3 = new Web3();
    web3.setProvider(provider);
  
    const collateralPool: MarketCollateralPool = new MarketCollateralPool(
      web3,
      collateralPoolContractAddress
    );
  
    let collateralEvents: CollateralEvent[] = [];
  
    const logs = await collateralPool.UpdatedUserBalanceEvent({}).get({
      fromBlock: fromBlock,
      toBlock: toBlock
    });
    for (let e of logs) {
      const transaction = await new Promise<Transaction>((resolve, reject) => {
        web3.eth.getTransaction(e.transactionHash, (err: Error, tx: Transaction) => {
          if (err) {
            reject(err);
          } 
          resolve(tx);
        });
      });
      const decoder = new Decoder.default(collateralPool.contractAbi);
      const input = decoder.decodeData(transaction.input);
      const event: CollateralEvent = {
        type: input.name === 'depositTokensForTrading' ? 'deposit' : 'withdrawal',
        from: input.name === 'depositTokensForTrading' ? transaction.from : transaction.to,
        to: input.name === 'depositTokensForTrading' ? transaction.to : transaction.from,
        amount: input.inputs[0],
        blockNumber: transaction.blockNumber,
        txHash: transaction.hash
      };
      if (!userAddress) {
        collateralEvents.push(event);
      } 
      if ((userAddress === transaction.from) || (userAddress === transaction.to)) {
          collateralEvents.push(event);
      }
    }
    return collateralEvents;
  }
