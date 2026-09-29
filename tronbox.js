require('dotenv').config();

module.exports = {
  networks: {
    development: { privateKey: process.env.DEPLOYER_PRIVATE_KEY || '', userFeePercentage: 1, feeLimit: 1000000000, fullHost: process.env.TRON_FULL_HOST || 'http://127.0.0.1:9090' },
    shasta: { privateKey: process.env.DEPLOYER_PRIVATE_KEY || '', userFeePercentage: 1, feeLimit: 1000000000, fullHost: 'https://api.shasta.trongrid.io',network_id: '2', headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '' } },
    mainnet: { privateKey: process.env.DEPLOYER_PRIVATE_KEY || '', userFeePercentage: 1, feeLimit: 1000000000, fullHost: 'https://api.trongrid.io', network_id: '1', headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '' } }
  },
  compilers: { solc: { version: '0.8.20' } }
};
