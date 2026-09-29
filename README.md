# TRON Allowance Spending DApp

A TRON EVM-compatible TRC-20 USDT allowance application. The frontend preserves the supplied mobile send form and adds TronLink connection, network status, approval state, and transaction notifications.

## Safety model

Users explicitly approve `AllowanceSpender` with the standard TRC-20 `approve(spender, amount)` call. The contract never holds user funds. An authorized executor can call only `executeTransfer`, which checks executor permission, receiver selection, allowance, and balance before calling `transferFrom` directly to `RECEIVER1` or `RECEIVER2`. The backend never calls `transferFrom` itself.

This project intentionally has no subscriptions or recurring payment billing. The monitor is threshold based and only handles wallets registered through the API after approval.

## Setup

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env`. For mainnet, set `TRON_FULL_HOST=https://api.trongrid.io`, provide a Trongrid `TRON_API_KEY`, use a funded `DEPLOYER_PRIVATE_KEY`, and set both receiver addresses. Never commit `.env` or an executor key.
3. Compile with `npm run contract:compile`.
4. Run the contract tests with `npm run contract:test`. This expects a local TRON full node at `http://127.0.0.1:9090` and a funded key in `DEPLOYER_PRIVATE_KEY`.
5. Verify the deployer has enough TRX for the deployment fee, then deploy to TRON mainnet with `node scripts/validate-tron-env.js deploy && npx tronbox migrate --network mainnet`. The migration uses `USDT_CONTRACT_ADDRESS`, `RECEIVER1_ADDRESS`, `RECEIVER2_ADDRESS`, and the optional `EXECUTOR_ADDRESS`.
6. The migration output contains the deployed contract address and transaction ID. To check the contract on-chain, query `https://api.trongrid.io/v1/contracts/<DEPLOYED_CONTRACT_ADDRESS>` with the same Trongrid API key, or open `https://tronscan.org/#/contract/<DEPLOYED_CONTRACT_ADDRESS>/code`.
7. Put the deployed contract address in `ALLOWANCE_SPENDER_ADDRESS` and `NEXT_PUBLIC_ALLOWANCE_SPENDER_ADDRESS`.
8. Run `npm run dev` for Next.js and the Express monitor.

The deployment command fails early with the missing environment variable names when the setup is incomplete. For mainnet, confirm the deployer wallet's TRX balance before submitting the transaction and wait for TronBox to report confirmation. Use a funded test wallet for local testing; never use a mainnet key for local testing.

The frontend runs at `http://localhost:3000`; the API runs at `http://localhost:4000`.

## Production checklist

Use a dedicated executor hot wallet with limited TRX, an API gateway, durable database storage, authenticated admin endpoints for executor management, encrypted secret storage, structured logging, rate limits, monitoring, contract audit, and explicit legal/user consent. Replace the in-memory backend store with PostgreSQL or another durable store before production. Test on Shasta before mainnet.

## Contract management

The deployer is stored as `owner`. The owner can add or remove multiple executor addresses. Receiver addresses and the token address are immutable constructor values. Use TronBox migrations in `migrations/` for deployment and verification against the exact deployed bytecode.
