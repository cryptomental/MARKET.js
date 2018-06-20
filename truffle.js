module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: process.env.TRUFFLE_DEVELOP_HOST || '127.0.0.1',
      port: process.env.TRUFFLE_DEVELOP_PORT || 9545,
      network_id: '*' // Match any network id
    },
    coverage: {
      host: process.env.TRUFFLE_DEVELOP_HOST || '127.0.0.1',
      port: process.env.TRUFFLE_DEVELOP_PORT || 9545,
      network_id: '*' // Match any network id
    }
  }
};
