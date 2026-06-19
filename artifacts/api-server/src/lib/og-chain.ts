import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  toHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ogNewton = defineChain({
  id: 16602,
  name: "0G Newton Testnet",
  nativeCurrency: { name: "0G Token", symbol: "A0GI", decimals: 18 },
  rpcUrls: { default: { http: ["https://evmrpc-testnet.0g.ai"] } },
  blockExplorers: {
    default: { name: "0G Scan", url: "https://chainscan-newton.0g.ai" },
  },
  testnet: true,
});

const OG_EXPLORER = "https://chainscan-newton.0g.ai";

type ChainClients = {
  walletClient: ReturnType<typeof createWalletClient>;
  publicClient: ReturnType<typeof createPublicClient>;
  serverAddress: `0x${string}`;
};

let _cached: ChainClients | null = null;

export function getOGChainClients(): ChainClients | null {
  if (_cached) return _cached;
  const pk = process.env.OG_PRIVATE_KEY as Hex | undefined;
  if (!pk) return null;
  const account = privateKeyToAccount(pk);
  _cached = {
    walletClient: createWalletClient({
      account,
      chain: ogNewton,
      transport: http("https://evmrpc-testnet.0g.ai"),
    }),
    publicClient: createPublicClient({
      chain: ogNewton,
      transport: http("https://evmrpc-testnet.0g.ai"),
    }),
    serverAddress: account.address,
  };
  return _cached;
}

export interface AIInteractionRecord {
  id: string;
  userId: string;
  type: "chat" | "briefing";
  query: string;
  responseSummary: string;
  timestamp: number;
  txHash?: string;
  txStatus: "pending" | "confirmed" | "no_funds" | "failed";
  explorerUrl?: string;
}

export const aiHistory = new Map<string, AIInteractionRecord[]>();

export function recordAIInteraction(
  userId: string,
  type: "chat" | "briefing",
  query: string,
  responseSummary: string,
): AIInteractionRecord {
  const record: AIInteractionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    query: query.slice(0, 120),
    responseSummary: responseSummary.slice(0, 200),
    timestamp: Date.now(),
    txStatus: "pending",
  };

  const existing = aiHistory.get(userId) ?? [];
  existing.unshift(record);
  if (existing.length > 50) existing.splice(50);
  aiHistory.set(userId, existing);

  const c = getOGChainClients();
  if (!c) {
    record.txStatus = "failed";
    return record;
  }

  (async () => {
    try {
      const balance = await c.publicClient.getBalance({ address: c.serverAddress });
      if (balance === 0n) {
        record.txStatus = "no_funds";
        return;
      }
      const payload = JSON.stringify({
        app: "brainiac",
        v: 2,
        type,
        userId,
        query: record.query,
        summary: record.responseSummary,
        ts: record.timestamp,
      });
      const hash = await c.walletClient.sendTransaction({
        to: c.serverAddress,
        value: 0n,
        data: toHex(payload) as Hex,
      });
      record.txHash = hash;
      record.txStatus = "confirmed";
      record.explorerUrl = `${OG_EXPLORER}/tx/${hash}`;
    } catch {
      record.txStatus = "failed";
    }
  })().catch(() => {});

  return record;
}
