import { BigNumber } from 'bignumber.js';
import Web3 from 'web3';

import {
  deployMarketCollateralPoolAsync,
  deployMarketContractOraclizeAsync
} from '../src/lib/Deployment';
import { getContractAddress } from './utils';

// Types
import {
  ITxParams,
  MarketCollateralPoolFactory,
  MarketContractFactoryOraclize,
  MarketContractOraclize
} from '@marketprotocol/types';

describe('Deployment Tests', () => {
  const TRUFFLE_NETWORK_ID = `4447`;
  const GAS_LIMIT = 4000000;
  const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545'));
  let deployMarketContract: MarketContractOraclize;

  it('Deploys a MARKET Contract Correctly', async () => {
    const factoryAddress = getContractAddress('MarketContractFactoryOraclize', TRUFFLE_NETWORK_ID);
    const collateralTokenAddress = getContractAddress('CollateralToken', TRUFFLE_NETWORK_ID);
    const quickExpirationTimeStamp: BigNumber = new BigNumber(
      Math.floor(Date.now() / 1000) + 60 * 60
    ); // expires in an hour
    const contractSpecs = [
      new BigNumber(50000),
      new BigNumber(150000),
      new BigNumber(2),
      new BigNumber(1e18),
      quickExpirationTimeStamp
    ];
    const txParams: ITxParams = { from: web3.eth.accounts[1], gas: GAS_LIMIT };
    const contractName: string = 'TestContract';
    const oracleDataSource: string = 'URL';
    const oracleQuery: string =
      'json(https://api.kraken.com/0/public/Ticker?pair=ETHUSD).result.XETHZUSD.c.0';
    const deployedAddress = await deployMarketContractOraclizeAsync(
      web3.currentProvider,
      factoryAddress,
      contractName,
      collateralTokenAddress,
      contractSpecs,
      oracleDataSource,
      oracleQuery,
      txParams
    );

    deployMarketContract = await MarketContractOraclize.createAndValidate(web3, deployedAddress);

    expect(await deployMarketContract.CONTRACT_NAME).toEqual(contractName);
    expect(await deployMarketContract.COLLATERAL_TOKEN_ADDRESS).toEqual(collateralTokenAddress);
    expect(await deployMarketContract.creator).toEqual(web3.eth.accounts[1]);
    expect(await deployMarketContract.EXPIRATION).toEqual(quickExpirationTimeStamp);
    expect(await deployMarketContract.ORACLE_DATA_SOURCE).toEqual(oracleDataSource);
    expect(await deployMarketContract.ORACLE_QUERY).toEqual(oracleQuery);
    expect(await deployMarketContract.MARKET_COLLATERAL_POOL_ADDRESS).toEqual(
      '0x0000000000000000000000000000000000000000'
    );
  });

  it('Deploys and links a MARKET Collateral Pool Correctly', async () => {
    const collateralPoolFactoryAddress = getContractAddress(
      'MarketCollateralPoolFactory',
      TRUFFLE_NETWORK_ID
    );
    const txParams: ITxParams = { from: web3.eth.accounts[1], gas: GAS_LIMIT };
    await deployMarketCollateralPoolAsync(
      web3.currentProvider,
      collateralPoolFactoryAddress,
      deployMarketContract.address,
      txParams
    );

    expect(await deployMarketContract.isCollateralPoolContractLinked).toEqual(true);
    expect(await deployMarketContract.COLLATERAL_POOL_FACTORY_ADDRESS).toEqual(
      collateralPoolFactoryAddress
    );
    expect(await deployMarketContract.MARKET_COLLATERAL_POOL_ADDRESS).not.toEqual(
      '0x0000000000000000000000000000000000000000'
    );
  });
});
