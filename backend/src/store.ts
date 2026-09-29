export type WalletRecord = { address: string; createdAt: string; lastBalance: string; status: 'active' | 'paused' };
export type TransactionRecord = { id: string; wallet: string; amount: string; receiverId: number; status: string; createdAt: string; error?: string };

const wallets = new Map<string, WalletRecord>();
const transactions: TransactionRecord[] = [];
export const store = {
  wallets,
  transactions,
  add(address: string) { const record = { address, createdAt: new Date().toISOString(), lastBalance: '0', status: 'active' as const }; wallets.set(address, record); return record; },
  remove(address: string) { return wallets.delete(address); },
  log(tx: TransactionRecord) { transactions.unshift(tx); return tx; }
};
