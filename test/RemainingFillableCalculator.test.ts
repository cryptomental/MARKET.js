import { RemainingFillableCalculator } from '../src/order_watcher/RemainingFillableCalculator';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { Market, Utils } from '../src';
import { constants } from '../src/constants';

describe('RemainingFillableCalculator', () => {
  const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545'));
  const TRUFFLE_NETWORK_ID = `4447`;

  let market: Market = new Market(web3.currentProvider);

  beforeAll(async () => {
    // test suite setup
  });

  beforeEach(async () => {
    // test case setup
  });

  afterEach(async () => {
    // test case teardown
  });

  afterAll(async () => {
    // test suite teardown
  });

  it('correctly returns fully fillable amounts with zero fees', () => {
    async () => {
      // test case body
    };
  });

  it('correctly returns fully fillable amounts with non-zero Maker fees', () => {
    async () => {
      // test case body
    };
  });
});
