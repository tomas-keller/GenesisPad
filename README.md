# GenesisPad

GenesisPad is a privacy-first launchpad for creating ERC7984 tokens on Sepolia. It couples Zama's FHEVM stack with a factory contract and a React + Vite interface so anyone can define token metadata (name, symbol, capped supply, initial ETH reference price) and let users mint for free while balances stay encrypted on-chain.

## Why GenesisPad
- Launch encrypted ERC7984 assets without wiring the FHE toolchain yourself.
- Preserve privacy: supplies are public, but balances stay confidential through FHEVM.
- Simple UX: a single factory handles deployments, indexing, and free minting controls.
- Transparent pricing anchor: store an ETH-denominated starting price for discovery and analytics.
- Built for Sepolia out of the box, with reproducible ABIs and tests to keep the stack reliable.

## What It Solves
- Reduces the integration burden of combining ERC7984, Zama FHEVM, and deployment tooling.
- Standardizes token metadata and indexing so the frontend can enumerate every created token without custom APIs.
- Provides a free-mint flow with supply limits, making it easy to bootstrap communities without payment rails.
- Separates reads (viem) and writes (ethers) for safer wallet interactions and clearer gas/error handling.

## Core Features
- **GenesisTokenFactory** deploys ERC7984 tokens, records metadata, and exposes `getTokens` for UI consumption.
- **GenesisToken** enforces immutable max supply, free minting, an initial ETH price hint, and a `details` view for UIs.
- **Tasks** (`tasks/genesis.ts`) let you create/list/mint tokens directly from Hardhat.
- **Frontend** (`app/src`) lists all factory deployments, creates new tokens, and mints remaining supply with wallet gating.
- **Tests** (`test/GenesisTokenFactory.ts`) cover creation, supply checks, and registry counts to prevent regressions.

## Tech Stack
- **Smart contracts**: Hardhat + TypeScript, @fhevm/hardhat-plugin, `confidential-contracts-v91` ERC7984 base, Solidity 0.8.27.
- **Privacy**: Zama FHEVM configuration via `ZamaEthereumConfig` with encrypted amounts (`FHE.asEuint64`, `euint64`).
- **Frontend**: React + Vite + TypeScript, RainbowKit for wallet onboarding, Wagmi/Viem for reads, Ethers v6 for writes, no Tailwind or env-based config.
- **Tooling**: hardhat-deploy for repeatable deployments, TypeChain for typed contracts, ESLint/Prettier/Solhint for quality.
- **Docs**: Zama guides in `docs/zama_llm.md` and relayer notes in `docs/zama_doc_relayer.md`.

## Repository Layout
- `contracts/` — `GenesisTokenFactory.sol`, `GenesisToken` implementation, and the reference `ConfidentialUSDT.sol`.
- `deploy/` — `deploy.ts` hardhat-deploy script for the factory.
- `tasks/` — CLI utilities for addresses, creation, listing, and minting.
- `test/` — Contract test suite (local and Sepolia variants).
- `deployments/sepolia/` — Generated ABIs/artifacts for the deployed contracts; copy these to the frontend config.
- `app/` — React + Vite dapp that surfaces creation and minting flows (uses `app/src/config/contracts.ts` for ABIs and addresses).
- `docs/` — FHEVM reference materials.

## Getting Started (Contracts)
### Prerequisites
- Node.js 20+ and npm.
- A Sepolia account with ETH for gas; deployment uses `process.env.PRIVATE_KEY` (no mnemonic).
- Infura endpoint key in `process.env.INFURA_API_KEY`.

### Install dependencies
```bash
npm install
```

### Environment
Create a `.env` file in the repo root:
```
PRIVATE_KEY=0xabc...            # required for Sepolia deploys
INFURA_API_KEY=your_infura_key  # required for Sepolia RPC
ETHERSCAN_API_KEY=optional      # for verification
REPORT_GAS=true                 # optional, enables gas reporter
```
`hardhat.config.ts` loads these values via `dotenv`; only the private key array is used for accounts.

### Build, lint, and test
```bash
npm run compile          # Build contracts
npm run test             # Unit tests on Hardhat network
npm run coverage         # Solidity coverage
npm run lint             # Solhint + ESLint + Prettier check
npm run clean            # Clear artifacts/cache/types
```

### Local development
```bash
npm run chain            # Start a Hardhat node (31337)
npm run deploy:localhost # Deploy the factory to localhost
npx hardhat task:list-tokens --network localhost
```

### Deploy to Sepolia
```bash
npm run deploy:sepolia
```
- Requires `PRIVATE_KEY` and `INFURA_API_KEY` set.
- Verify after deployment: `npm run verify:sepolia -- <FACTORY_ADDRESS>`.
- Generated ABIs/artifacts land in `deployments/sepolia/GenesisTokenFactory.json` and `GenesisToken.json`; these power the frontend.

### Hardhat tasks (Genesis workflow)
- Factory address: `npx hardhat task:factory-address --network <network>`
- Create token: `npx hardhat task:create-token --network <network> --name "USD Confidential" --symbol cUSD --supply 1000000 --price 0.01`
- List tokens: `npx hardhat task:list-tokens --network <network>`
- Mint: `npx hardhat task:mint-token --network <network> --token <addr> --to <recipient> --amount 1000`

## Frontend (app/)
### Install & run
```bash
cd app
npm install
npm run dev
```
- Network: Sepolia only; the app will show a warning if you are on another chain.
- Config: set `FACTORY_ADDRESS` in `app/src/config/contracts.ts` to the deployed factory. Keep ABIs in sync by copying from `deployments/sepolia/*.json` after each deploy. No frontend environment variables are used.

### UI flow
- Connect wallet with RainbowKit.
- Create token: enter name, symbol, total supply (uint64), and an initial ETH price hint; submits `createToken` to the factory with an ethers signer.
- Discover tokens: list comes from `getTokens` (viem read), showing minted/remaining supply, creator, and stored price.
- Mint: anyone can mint free allocations up to the cap using `mint` on each token contract.

## Advantages
- End-to-end privacy via ERC7984 and FHEVM while keeping supply and price signals transparent.
- Single source of truth: factory-driven registry for frontends and analytics.
- Free minting path lowers onboarding friction; supply guardrails prevent runaway inflation.
- Typed tooling, tests, and deploy scripts reduce integration risk across environments.

## Future Work
- Add subgraph/indexer support for richer analytics and historical mint data.
- Extend to mainnet or additional L2s once FHEVM support lands.
- Integrate oracle-based price feeds to update the ETH reference price on-chain.
- Automate ABI syncing to the frontend and provide CI checks for contract/frontend parity.
- Expand UI with token-level dashboards (holders, mint history) and relayer-driven confidential operations.

## License
BSD-3-Clause-Clear. See `LICENSE` for details.
