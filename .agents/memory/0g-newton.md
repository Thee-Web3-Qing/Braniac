---
name: 0G Newton testnet integration
description: How Brainiac writes login records to 0G Newton testnet EVM chain and what's needed to activate it
---

# 0G Newton EVM Integration

## What was built
- API server route `artifacts/api-server/src/routes/og.ts` uses `viem` to write login events as calldata transactions to 0G Newton testnet
- Server wallet address: `0x5F8788ecF7C8F82b425AB8b45eF014517167A81b` (private key stored as `OG_PRIVATE_KEY` env var)
- Chain ID: 16602, RPC: `https://evmrpc-testnet.0g.ai`, Explorer: `https://chainscan-newton.0g.ai`
- Frontend auto-records login in `AppLayout.tsx` via `recordLoginOnOG()` (fire-and-forget, once per session)
- `OGLoginHistory` component in profile panel shows records with real tx hashes + explorer links

## What's needed to go live
- Fund the server wallet from `https://faucet.0g.ai` with A0GI tokens
- Faucet is web-UI-only — no public API; user must visit manually and paste `0x5F8788ecF7C8F82b425AB8b45eF014517167A81b`
- Until funded, login events are stored in-memory only with `txStatus: "no_funds"`

**Why:**
- `@0glabs/0g-ts-sdk` is NOT on npm; 0G storage indexer endpoints were 503 during build
- 0G EVM chain (chain 16602) is the reliable integration point — confirmed live
- Server pays gas (not the user) for clean UX

**How to apply:**
- If 0G storage indexer becomes available, could add real file storage layer on top
- For demo: fund the wallet once, all subsequent logins get real on-chain tx hashes
