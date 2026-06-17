import { Router } from "express";

const router = Router();

const ALCHEMY_BASE = "https://eth-mainnet.g.alchemy.com/v2";
const ALCHEMY_BASE_CHAIN = "https://base-mainnet.g.alchemy.com/v2";
const ALCHEMY_ARB_CHAIN = "https://arb-mainnet.g.alchemy.com/v2";

function alchemyUrl(chain: string, apiKey: string): string {
  if (chain === "Base")     return `${ALCHEMY_BASE_CHAIN}/${apiKey}`;
  if (chain === "Arbitrum") return `${ALCHEMY_ARB_CHAIN}/${apiKey}`;
  return `${ALCHEMY_BASE}/${apiKey}`;
}

async function alchemyRpc(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`Alchemy ${res.status}`);
  const data = await res.json() as { result?: unknown; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

router.get("/balances/:address", async (req, res) => {
  const { address } = req.params;
  const chain = (req.query.chain as string) || "Ethereum";
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Alchemy not configured" });

  try {
    const url = alchemyUrl(chain, apiKey);

    const [ethBalance, tokenBalances] = await Promise.all([
      alchemyRpc(url, "eth_getBalance", [address, "latest"]),
      alchemyRpc(url, "alchemy_getTokenBalances", [address, "erc20"]),
    ]);

    const ethWei = BigInt(ethBalance as string);
    const ethValue = Number(ethWei) / 1e18;

    const rawTokens = (tokenBalances as { tokenBalances?: Array<{ contractAddress: string; tokenBalance: string }> })?.tokenBalances ?? [];

    const nonZero = rawTokens
      .filter((t) => t.tokenBalance && t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000")
      .slice(0, 15);

    const tokenDetails = await Promise.all(
      nonZero.map(async (t) => {
        try {
          const meta = await alchemyRpc(url, "alchemy_getTokenMetadata", [t.contractAddress]) as {
            name?: string; symbol?: string; decimals?: number; logo?: string;
          };
          const raw = BigInt(t.tokenBalance);
          const decimals = meta.decimals ?? 18;
          const balance = Number(raw) / Math.pow(10, decimals);
          return {
            address: t.contractAddress,
            symbol: meta.symbol ?? "???",
            name: meta.name ?? "Unknown Token",
            balance: balance.toFixed(4),
            decimals,
          };
        } catch {
          return null;
        }
      })
    );

    return res.json({
      address,
      chain,
      nativeBalance: ethValue.toFixed(6),
      nativeSymbol: chain === "Ethereum" ? "ETH" : chain === "Base" ? "ETH" : "ETH",
      tokens: tokenDetails.filter(Boolean),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Failed to fetch balances: ${msg}` });
  }
});

router.get("/transactions/:address", async (req, res) => {
  const { address } = req.params;
  const chain = (req.query.chain as string) || "Ethereum";
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Alchemy not configured" });

  try {
    const url = alchemyUrl(chain, apiKey);

    const result = await alchemyRpc(url, "alchemy_getAssetTransfers", [{
      fromAddress: address,
      category: ["external", "erc20", "erc721", "erc1155"],
      order: "desc",
      maxCount: `0x${limit.toString(16)}`,
      withMetadata: true,
    }]) as {
      transfers?: Array<{
        blockNum: string;
        hash: string;
        from: string;
        to: string | null;
        value: number | null;
        asset: string | null;
        category: string;
        metadata?: { blockTimestamp?: string };
      }>;
    };

    const txs = (result?.transfers ?? []).map((t) => ({
      hash: t.hash,
      from: t.from,
      to: t.to ?? "",
      value: t.value?.toFixed(6) ?? "0",
      asset: t.asset ?? "ETH",
      category: t.category,
      timestamp: t.metadata?.blockTimestamp ?? "",
      block: parseInt(t.blockNum, 16),
    }));

    return res.json({ address, chain, transactions: txs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Failed to fetch transactions: ${msg}` });
  }
});

router.get("/nfts/:address", async (req, res) => {
  const { address } = req.params;
  const chain = (req.query.chain as string) || "Ethereum";
  const apiKey = process.env.ALCHEMY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Alchemy not configured" });

  try {
    const baseUrl = alchemyUrl(chain, apiKey).replace("/v2/", "/nft/v3/");
    const nftUrl = `${baseUrl}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=20`;

    const r = await fetch(nftUrl);
    if (!r.ok) return res.json({ nfts: [] });
    const data = await r.json() as {
      ownedNfts?: Array<{
        name?: string;
        description?: string;
        image?: { cachedUrl?: string };
        collection?: { name?: string };
        contract?: { address: string };
      }>;
      totalCount?: number;
    };

    const nfts = (data.ownedNfts ?? []).map((n) => ({
      name: n.name ?? "Unnamed NFT",
      collection: n.collection?.name ?? "Unknown Collection",
      image: n.image?.cachedUrl ?? null,
      contractAddress: n.contract?.address ?? "",
    }));

    return res.json({ address, chain, nfts, totalCount: data.totalCount ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Failed to fetch NFTs: ${msg}` });
  }
});

export default router;
