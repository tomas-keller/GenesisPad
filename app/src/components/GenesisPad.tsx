import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { formatEther } from 'viem';
import { Header } from './Header';
import { FACTORY_ABI, FACTORY_ADDRESS, GENESIS_TOKEN_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import '../styles/GenesisPad.css';

type TokenMetadata = {
  address: string;
  name: string;
  symbol: string;
  maxSupply: bigint;
  mintedSupply: bigint;
  initialPriceWei: bigint;
  creator: string;
};

type FactoryTokenResponse = {
  token: `0x${string}`;
  name: string;
  symbol: string;
  maxSupply: bigint;
  mintedSupply: bigint;
  initialPriceWei: bigint;
  creator: `0x${string}`;
};

type FormState = {
  name: string;
  symbol: string;
  supply: string;
  price: string;
};

const numberFormatter = new Intl.NumberFormat('en-US');
const PLACEHOLDER_FACTORY = '0x0000000000000000000000000000000000000000';

export function GenesisPad() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const signer = useEthersSigner();

  const [formState, setFormState] = useState<FormState>({
    name: '',
    symbol: '',
    supply: '',
    price: '',
  });
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mintInputs, setMintInputs] = useState<Record<string, string>>({});

  const isSepolia = useMemo(() => chainId === 11155111, [chainId]);
  const factoryConfigured = FACTORY_ADDRESS.toLowerCase() !== PLACEHOLDER_FACTORY;

  const fetchTokens = useCallback(async () => {
    if (!publicClient) return;
    if (!factoryConfigured) {
      setErrorMessage('Deploy the factory on Sepolia and update FACTORY_ADDRESS in config/contracts.ts');
      setTokens([]);
      return;
    }

    try {
      setLoadingTokens(true);
      setErrorMessage(null);
      const result = (await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getTokens',
      })) as readonly FactoryTokenResponse[];

      const normalized: TokenMetadata[] = result.map((item) => ({
        address: item.token,
        name: item.name,
        symbol: item.symbol,
        maxSupply: item.maxSupply,
        mintedSupply: item.mintedSupply,
        initialPriceWei: item.initialPriceWei,
        creator: item.creator,
      }));

      setTokens(normalized);
    } catch (error) {
      console.error(error);
      setErrorMessage('Unable to load tokens from the factory.');
    } finally {
      setLoadingTokens(false);
    }
  }, [factoryConfigured, publicClient]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const resetForm = () =>
    setFormState({
      name: '',
      symbol: '',
      supply: '',
      price: '',
    });

  const handleCreateToken = async (event: FormEvent) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!isConnected) {
      setErrorMessage('Connect your wallet to create a token.');
      return;
    }

    if (!factoryConfigured) {
      setErrorMessage('Factory address is not set. Deploy to Sepolia and update the config to continue.');
      return;
    }

    if (!signer) {
      setErrorMessage('Signer unavailable. Please reconnect your wallet.');
      return;
    }

    const trimmedName = formState.name.trim();
    const trimmedSymbol = formState.symbol.trim();

    if (!trimmedName || !trimmedSymbol) {
      setErrorMessage('Name and symbol are required.');
      return;
    }

    const maxSupply = BigInt(formState.supply || '0');
    if (maxSupply <= 0) {
      setErrorMessage('Total supply must be greater than zero.');
      return;
    }

    const initialPriceWei = ethers.parseEther(formState.price || '0');

    try {
      const signerInstance = await signer;
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signerInstance);

      setStatusMessage('Creating token...');
      const tx = await factory.createToken(trimmedName, trimmedSymbol, maxSupply, initialPriceWei);
      await tx.wait();

      setStatusMessage('Token created successfully.');
      resetForm();
      await fetchTokens();
    } catch (error) {
      console.error(error);
      setErrorMessage('Token creation failed.');
    }
  };

  const handleMintChange = (tokenAddress: string, value: string) => {
    if (!/^\d*$/.test(value)) return;
    setMintInputs((prev: Record<string, string>) => ({ ...prev, [tokenAddress]: value }));
  };

  const mintToken = async (tokenAddress: string) => {
    setStatusMessage(null);
    setErrorMessage(null);

    if (!isConnected) {
      setErrorMessage('Connect your wallet to mint tokens.');
      return;
    }

    if (!signer) {
      setErrorMessage('Signer unavailable. Please reconnect your wallet.');
      return;
    }

    if (!factoryConfigured) {
      setErrorMessage('Factory address is not set. Deploy to Sepolia and update the config to continue.');
      return;
    }

    const amountInput = mintInputs[tokenAddress] || '1';
    const mintAmount = BigInt(amountInput);

    if (mintAmount <= 0) {
      setErrorMessage('Enter an amount greater than zero.');
      return;
    }

    const recipient = address || (await (await signer).getAddress());

    try {
      const signerInstance = await signer;
      const tokenContract = new ethers.Contract(tokenAddress, GENESIS_TOKEN_ABI, signerInstance);

      setStatusMessage(`Minting ${mintAmount.toString()} tokens...`);
      const tx = await tokenContract.mint(recipient, mintAmount);
      await tx.wait();

      setStatusMessage('Mint successful.');
      await fetchTokens();
    } catch (error) {
      console.error(error);
      setErrorMessage('Mint failed. Please check remaining supply.');
    }
  };

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <section className="intro">
          <div>
            <p className="eyebrow">Confidential token launchpad</p>
            <h1>Ship ERC7984 assets with on-chain privacy</h1>
            <p className="lead">
              Define your token name, symbol, capped supply, and starting ETH price. Deploy the ERC7984 contract, then
              let anyone mint for free while balances stay encrypted.
            </p>
            {!isSepolia && (
              <div className="network-warning">
                Connect to the Sepolia network to interact with the deployed contracts.
              </div>
            )}
          </div>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-value">{numberFormatter.format(tokens.length)}</div>
              <div className="stat-label">Tokens created</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{isConnected ? 'Wallet ready' : 'Connect to begin'}</div>
              <div className="stat-label">Account status</div>
            </div>
          </div>
        </section>

        <section className="grid">
          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Create token</p>
                <h2>Deploy new ERC7984</h2>
              </div>
              <span className="pill">Factory</span>
            </div>
            <form className="form" onSubmit={handleCreateToken}>
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="Confidential USD"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="field">
                <span>Symbol</span>
                <input
                  type="text"
                  value={formState.symbol}
                  onChange={(e) => setFormState({ ...formState, symbol: e.target.value })}
                  placeholder="cUSD"
                  autoComplete="off"
                  required
                />
              </label>
              <label className="field">
                <span>Total supply</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formState.supply}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value)) {
                      setFormState({ ...formState, supply: e.target.value });
                    }
                  }}
                  placeholder="100000000"
                  required
                />
              </label>
              <label className="field">
                <span>Initial price (ETH)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formState.price}
                  onChange={(e) => setFormState({ ...formState, price: e.target.value })}
                  placeholder="0.01"
                />
              </label>
              <button type="submit" className="primary" disabled={!isConnected}>
                {isConnected ? 'Deploy token' : 'Connect wallet'}
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Tokens</p>
                <h2>Live deployments</h2>
              </div>
              <button className="ghost" onClick={fetchTokens} type="button">
                Refresh
              </button>
            </div>

            {statusMessage && <div className="status success">{statusMessage}</div>}
            {errorMessage && <div className="status error">{errorMessage}</div>}
            {loadingTokens && <div className="status">Loading tokens...</div>}

            <div className="token-list">
              {tokens.length === 0 && !loadingTokens && (
                <div className="empty">No ERC7984 tokens deployed yet. Create the first one.</div>
              )}

              {tokens.map((token) => {
                const remaining = token.maxSupply - token.mintedSupply;
                const priceLabel = formatEther(token.initialPriceWei || 0n);
                const mintValue = mintInputs[token.address] ?? '1';

                return (
                  <div key={token.address} className="token-card">
                    <div className="token-top">
                      <div>
                        <div className="token-name">
                          {token.name} <span className="token-symbol">{token.symbol}</span>
                        </div>
                        <div className="token-address">{token.address}</div>
                      </div>
                      <span className="pill neutral">{priceLabel} ETH</span>
                    </div>
                    <div className="token-meta">
                      <div>
                        <p>Supply</p>
                        <strong>
                          {token.mintedSupply.toString()} / {token.maxSupply.toString()}
                        </strong>
                      </div>
                      <div>
                        <p>Remaining</p>
                        <strong>{remaining.toString()}</strong>
                      </div>
                      <div>
                        <p>Creator</p>
                        <strong className="monospace">{token.creator}</strong>
                      </div>
                    </div>
                    <div className="mint-row">
                      <label className="mint-input">
                        <span>Mint amount</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={mintValue}
                          onChange={(e) => handleMintChange(token.address, e.target.value)}
                        />
                      </label>
                      <button
                        className="secondary"
                        onClick={() => mintToken(token.address)}
                        type="button"
                        disabled={!isConnected || remaining === 0n}
                      >
                        {remaining === 0n ? 'Sold out' : 'Mint free'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
