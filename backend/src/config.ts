import 'dotenv/config';

export const config = {
  port: Number(process.env.BACKEND_PORT || 4000),
  fullHost: process.env.TRON_FULL_HOST || 'https://api.shasta.trongrid.io',
  apiKey: process.env.TRON_API_KEY || '',
  usdt: process.env.USDT_CONTRACT_ADDRESS || '',
  spender: process.env.ALLOWANCE_SPENDER_ADDRESS || '',
  executorAddress: process.env.EXECUTOR_ADDRESS || '',
  executorPrivateKey: process.env.EXECUTOR_PRIVATE_KEY || '',
  threshold: 5_000_000n
};
