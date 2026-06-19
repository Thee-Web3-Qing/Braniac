import { Router } from "express";
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { aiHistory, historyStore, recordHistory } from "../lib/og-chain";

const router = Router();

const ogNewton = defineChain({
  id: 16602,
  name: "0G Newton Testnet",
  nativeCurrency: { name: "0G Token", symbol: "A0GI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Scan", url: "https://chainscan-newton.0g.ai" },
  },
  testnet: true,
});

const OG_RPC = "https://evmrpc-testnet.0g.ai";
const OG_EXPLORER = "https://chainscan-newton.0g.ai";

export interface LoginRecord {
  userId: string;
  walletAddress?: string;
  loginMethod: string;
  timestamp: number;
  txHash?: string;
  txStatus: "confirmed" | "pending" | "no_funds" | "failed";
  errorReason?: string;
}

const loginHistory = new Map<string, LoginRecord[]>();

type Clients = {
  walletClient: ReturnType<typeof createWalletClient>;
  publicClient: ReturnType<typeof createPublicClient>;
  serverAddress: `0x${string}`;
};

let cached: Clients | null = null;

function getClients(): Clients | null {
  if (cached) return cached;
  const pk = process.env.OG_PRIVATE_KEY as Hex | undefined;
  if (!pk) return null;
  const account = privateKeyToAccount(pk);
  cached = {
    walletClient: createWalletClient({ account, chain: ogNewton, transport: http(OG_RPC) }),
    publicClient: createPublicClient({ chain: ogNewton, transport: http(OG_RPC) }),
    serverAddress: account.address,
  };
  return cached;
}

router.get("/status", async (_req, res) => {
  const c = getClients();
  if (!c) return res.json({ configured: false });
  try {
    const balance = await c.publicClient.getBalance({ address: c.serverAddress });
    return res.json({
      configured: true,
      serverAddress: c.serverAddress,
      balanceA0GI: (Number(balance) / 1e18).toFixed(6),
      funded: balance > 0n,
      faucetUrl: "https://faucet.0g.ai",
      chain: { id: 16602, name: "0G Newton Testnet", explorer: OG_EXPLORER },
    });
  } catch (err) {
    return res.json({
      configured: true,
      serverAddress: c.serverAddress,
      balanceA0GI: "0.000000",
      funded: false,
      error: "RPC error checking balance",
      faucetUrl: "https://faucet.0g.ai",
      chain: { id: 16602, name: "0G Newton Testnet", explorer: OG_EXPLORER },
    });
  }
});

router.post("/login", async (req, res) => {
  const { userId, walletAddress, loginMethod, displayName } = req.body as {
    userId?: string;
    walletAddress?: string;
    loginMethod?: string;
    displayName?: string;
  };

  if (!userId) return res.status(400).json({ error: "userId required" });

  const record: LoginRecord = {
    userId,
    walletAddress,
    loginMethod: loginMethod ?? "unknown",
    timestamp: Date.now(),
    txStatus: "pending",
  };

  const c = getClients();

  if (c) {
    const payload = JSON.stringify({
      app: "brainiac",
      v: 1,
      userId,
      wallet: walletAddress ?? null,
      method: loginMethod ?? "unknown",
      name: displayName ?? null,
      ts: record.timestamp,
    });

    try {
      const balance = await c.publicClient.getBalance({ address: c.serverAddress });

      if (balance === 0n) {
        record.txStatus = "no_funds";
      } else {
        const hash = await c.walletClient.sendTransaction({
          to: c.serverAddress,
          value: 0n,
          data: toHex(payload) as Hex,
        });
        record.txHash = hash;
        record.txStatus = "confirmed";
      }
    } catch (err: unknown) {
      record.txStatus = "failed";
      record.errorReason = err instanceof Error ? err.message : String(err);
    }
  } else {
    record.txStatus = "failed";
    record.errorReason = "OG_PRIVATE_KEY not configured";
  }

  const existing = loginHistory.get(userId) ?? [];
  existing.unshift(record);
  if (existing.length > 100) existing.splice(100);
  loginHistory.set(userId, existing);

  return res.json({
    record,
    serverAddress: c?.serverAddress ?? null,
    explorerUrl: record.txHash ? `${OG_EXPLORER}/tx/${record.txHash}` : null,
  });
});

router.get("/history/:userId", (req, res) => {
  const { userId } = req.params;
  const records = loginHistory.get(userId) ?? [];
  const c = getClients();
  return res.json({
    records,
    serverAddress: c?.serverAddress ?? null,
    chain: { id: 16602, name: "0G Newton Testnet", explorer: OG_EXPLORER },
  });
});

router.get("/ai-history/:userId", (req, res) => {
  const { userId } = req.params;
  const records = aiHistory.get(decodeURIComponent(userId)) ?? [];
  return res.json({
    records,
    chain: { id: 16602, name: "0G Newton Testnet", explorer: OG_EXPLORER },
  });
});

router.post("/save-history", (req, res) => {
  const { userId, type, sessionId, preview } = req.body as {
    userId?: string; type?: string; sessionId?: string; preview?: string;
  };
  if (!userId || !type || !sessionId) {
    return res.status(400).json({ error: "userId, type, sessionId required" });
  }
  const validTypes = ["chat", "content", "community"] as const;
  if (!validTypes.includes(type as typeof validTypes[number])) {
    return res.status(400).json({ error: "type must be chat, content, or community" });
  }
  const record = recordHistory(userId, type as "chat" | "content" | "community", sessionId, preview ?? "");
  return res.json({ record, explorerUrl: record.explorerUrl ?? null });
});

router.get("/session-history/:userId", (req, res) => {
  const { userId } = req.params;
  const records = historyStore.get(decodeURIComponent(userId)) ?? [];
  return res.json({
    records,
    chain: { id: 16602, name: "0G Newton Testnet", explorer: OG_EXPLORER },
  });
});

export default router;
