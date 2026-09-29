require('dotenv').config();

const mode = process.argv[2] || 'deploy';
const required = ['DEPLOYER_PRIVATE_KEY'];

if (mode === 'deploy') {
  required.push('USDT_CONTRACT_ADDRESS', 'RECEIVER1_ADDRESS', 'RECEIVER2_ADDRESS');
}

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing ${mode} environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

if (mode === 'test' && process.env.TRON_FULL_HOST === 'http://127.0.0.1:9090') {
  console.log('Using the local Tron node at http://127.0.0.1:9090.');
}