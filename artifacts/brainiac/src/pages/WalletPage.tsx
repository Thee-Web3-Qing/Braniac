import { useState, useRef, useEffect } from "react";
import { Plus, ExternalLink, TrendingUp, TrendingDown, X, Copy, Check, Pencil, ArrowUpDown, Layers, Cpu, RefreshCw, Database, Loader2 } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";
import { getWalletActivity, activityToText, getActiveProtocols, getTotalYield } from "../lib/wallet-activity";
import { saveToOG, formatCID, OG_EXPLORER, type OGRecord } from "../lib/og-storage";

type Wallet = {
  id: number;
  address: string;
  label: string;
  chain: string;
  pnl: string;
  positive: boolean;
};

type AlchemyToken = {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
};

type AlchemyTx = {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset: string;
  category: string;
  timestamp: string;
  block: number;
};

const initialWallets: Wallet[] = [
  { id: 1, address: "0x7f3a9c8d2e1b4f56789ab0c3d4e5f6789e2b", label: "Main Wallet",    chain: "Ethereum", pnl: "+$2,340", positive: true },
  { id: 2, address: "0xc91d4b7a2e9f3c8d1b5e6f7a8b9c0d1e4f7a", label: "Trading Wallet", chain: "Base",     pnl: "-$180",   positive: false },
];

const CHAINS = ["Ethereum", "Base", "Arbitrum", "Solana", "Polygon"];
const short = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

const TYPE_COLORS: Record<string, string> = {
  swap:     "bg-blue-500/10 text-blue-400",
  deposit:  "bg-green-500/10 text-green-400",
  withdraw: "bg-yellow-500/10 text-yellow-400",
  stake:    "bg-purple-500/10 text-purple-400",
  claim:    "bg-cyan-500/10 text-cyan-400",
  mint:     "bg-orange-500/10 text-orange-400",
  bridge:   "bg-primary/10 text-primary",
  external: "bg-muted text-muted-foreground",
  erc20:    "bg-blue-500/10 text-blue-400",
  erc721:   "bg-orange-500/10 text-orange-400",
};

const QUICK_QUESTIONS = [
  "What did I buy into this week?",
  "How much yield have I earned?",
  "Which protocol is giving my best returns?",
  "What positions should I consider exiting?",
  "Find me better yield opportunities right now",
  "What's my total DeFi exposure?",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

function InlineRename({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const commit = () => { if (draft.trim()) onSave(draft.trim()); };
  return (
    <input ref={ref} value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onSave(value); }}
      className="bg-background border border-primary/50 rounded-lg px-2 py-0.5 text-foreground text-base md:text-lg font-display font-bold focus:outline-none w-44 md:w-56" />
  );
}

function AddWalletModal({ onClose, onAdd }: { onClose: () => void; onAdd: (label: string, address: string, chain: string) => void }) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("Ethereum");

  const detectChain = (addr: string) => {
    if (addr.startsWith("0x") && addr.length === 42) return "Ethereum";
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return "Solana";
    return "Ethereum";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddress(val);
    setChain(detectChain(val));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-foreground">Track a wallet</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Paste any EVM or Solana address</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-muted-foreground text-xs block mb-1.5">Wallet address</label>
            <input data-testid="input-wallet-address" type="text" placeholder="0x... or Solana address" value={address}
              onChange={handleChange}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs block mb-1.5">Label <span className="text-muted-foreground/40">(give it a name you'll remember)</span></label>
            <input data-testid="input-wallet-label" type="text" placeholder="e.g. SAFELOCK, Airdrop Hunter, Cold Storage" value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs block mb-1.5">Chain</label>
            <select data-testid="select-chain" value={chain} onChange={(e) => setChain(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer">
              {CHAINS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button data-testid="button-track-wallet"
            onClick={() => { if (address.trim() && label.trim()) { onAdd(label.trim(), address.trim(), chain); onClose(); } }}
            disabled={!address.trim() || !label.trim()}
            className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors">
            Track wallet
          </button>
        </div>
      </div>
    </div>
  );
}

function OGBadge({ record }: { record: OGRecord }) {
  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
      <Database size={11} className="text-cyan-400 shrink-0" />
      <span className="text-xs text-muted-foreground">Saved to 0G</span>
      <span className="text-xs text-muted-foreground/50 font-mono">{formatCID(record.cid)}</span>
      <a href={OG_EXPLORER} target="_blank" rel="noopener noreferrer"
        className="text-xs text-cyan-400 hover:text-cyan-300 ml-auto transition-colors">
        View on 0G
      </a>
    </div>
  );
}

function useAlchemyBalances(address: string, chain: string) {
  const [data, setData] = useState<{ nativeBalance: string; nativeSymbol: string; tokens: AlchemyToken[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || chain === "Solana" || chain === "Polygon") return;
    setLoading(true);
    setError(null);
    fetch(`/api/wallet/balances/${address}?chain=${chain}`)
      .then((r) => r.json())
      .then((d: { nativeBalance?: string; nativeSymbol?: string; tokens?: AlchemyToken[]; error?: string }) => {
        if (d.error) setError(d.error);
        else setData({ nativeBalance: d.nativeBalance ?? "0", nativeSymbol: d.nativeSymbol ?? "ETH", tokens: d.tokens ?? [] });
      })
      .catch(() => setError("Failed to fetch balances"))
      .finally(() => setLoading(false));
  }, [address, chain]);

  return { data, loading, error };
}

function useAlchemyTxs(address: string, chain: string) {
  const [txs, setTxs] = useState<AlchemyTx[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = () => {
    if (!address || chain === "Solana" || chain === "Polygon") return;
    setLoading(true);
    setError(null);
    fetch(`/api/wallet/transactions/${address}?chain=${chain}&limit=20`)
      .then((r) => r.json())
      .then((d: { transactions?: AlchemyTx[]; error?: string }) => {
        if (d.error) setError(d.error);
        else setTxs(d.transactions ?? []);
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch_(); }, [address, chain]);

  return { txs, loading, error, refetch: fetch_ };
}

function ActivityTab({ wallet }: { wallet: Wallet }) {
  const isMock = wallet.address.length < 42;
  const { txs, loading, error, refetch } = useAlchemyTxs(wallet.address, wallet.chain);

  const mockActivity = getWalletActivity(wallet.chain);
  const protocols    = getActiveProtocols(mockActivity);
  const totalYield   = getTotalYield(mockActivity);

  const isReal = !isMock && txs !== null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Protocols used",   value: protocols.length.toString() },
          { label: "Total yield",      value: `$${totalYield}` },
          { label: "Active positions", value: mockActivity.filter((a) => a.type === "deposit" || a.type === "stake").length.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl px-3 py-2.5">
            <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
            <p className="text-foreground font-display font-semibold text-sm">{s.value}</p>
          </div>
        ))}
      </div>

      {!isMock && protocols.length > 0 && (
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-muted-foreground text-xs mb-2">Active in</p>
          <div className="flex flex-wrap gap-1.5">
            {protocols.map((p) => (
              <span key={p} className="text-xs bg-background border border-border text-foreground px-2.5 py-1 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground text-sm">
            {isReal ? "Live on-chain activity" : "On-chain activity"}
          </h3>
          <div className="flex items-center gap-2">
            {isReal && <span className="text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Live</span>}
            {!isMock && (
              <button onClick={refetch} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" /> Fetching from Alchemy...
          </div>
        )}

        {error && !loading && (
          <div className="px-4 py-3 text-red-400 text-xs">{error}</div>
        )}

        {isReal && !loading && (
          <div className="divide-y divide-border">
            {txs!.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No transactions found.</div>
            )}
            {txs!.map((tx) => (
              <div key={tx.hash} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="mt-0.5 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${TYPE_COLORS[tx.category] || "bg-muted text-muted-foreground"}`}>
                    {tx.category}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs font-medium font-mono truncate">{short(tx.to || tx.from)}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{tx.value} {tx.asset}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <a href={`https://${wallet.chain === "Ethereum" ? "etherscan.io" : wallet.chain === "Base" ? "basescan.org" : "arbiscan.io"}/tx/${tx.hash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground/40 hover:text-primary transition-colors">
                    <ExternalLink size={11} />
                  </a>
                  <p className="text-muted-foreground/50 text-xs">{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {isMock && !loading && (
          <div className="divide-y divide-border">
            {mockActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="mt-0.5 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${TYPE_COLORS[a.type] || "bg-muted text-muted-foreground"}`}>
                    {a.type}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs font-medium truncate">{a.protocol}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-0.5">{a.description}</p>
                  {a.apy && <p className="text-green-400 text-xs mt-0.5">{a.apy} APY {a.yieldEarned ? `— ${a.yieldEarned}` : ""}</p>}
                  {!a.apy && a.yieldEarned && <p className="text-cyan-400 text-xs mt-0.5">{a.yieldEarned}</p>}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-foreground text-xs font-medium">{a.usdValue}</p>
                  <p className="text-muted-foreground/50 text-xs">{a.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IntelTab({ wallet }: { wallet: Wallet }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ogRecord, setOgRecord] = useState<OGRecord | null>(null);

  const ask = async (q: string) => {
    setAnswer(null); setError(null); setOgRecord(null); setLoading(true);
    const activity = getWalletActivity(wallet.chain);
    try {
      const res = await fetch("/api/brain/wallet-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          label: wallet.label,
          address: wallet.address,
          chain: wallet.chain,
          activity: activityToText(activity).split("\n").map((line) => {
            const match = line.match(/\[(.*?)\] (\w+) on (.*?): (.*?) — (\$[\d,]+)(.*)?$/);
            if (!match) return null;
            return { date: match[1], type: match[2].toLowerCase(), protocol: match[3], description: match[4], usdValue: match[5] };
          }).filter(Boolean),
        }),
      });
      const data = await res.json() as { answer?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error);
      const ans = data.answer ?? "";
      setAnswer(ans);
      const rec = saveToOG(`wallet-intel:${wallet.id}:${Date.now()}`, { question: q, answer: ans, wallet: wallet.label });
      setOgRecord(rec as OGRecord);
    } catch {
      setError("Could not get an answer. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-muted-foreground text-xs mb-2">Quick questions</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => { setQuery(q); ask(q); }}
              className="text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground px-2.5 py-1 rounded-full transition-colors">
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <textarea rows={2} value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (query.trim()) ask(query); } }}
          placeholder={`Ask anything about your ${wallet.label}...`}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-20 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none" />
        <button onClick={() => { if (query.trim()) ask(query); }} disabled={loading || !query.trim()}
          className="absolute right-3 bottom-3 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
          {loading ? <RefreshCw size={11} className="animate-spin" /> : <Cpu size={11} />}
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {loading && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground text-xs">Reading your on-chain history...</span>
          </div>
          <div className="space-y-2">
            {[70, 50, 85, 40].map((w, i) => (
              <div key={i} className="h-2 bg-border rounded animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      )}

      {error && !loading && <p className="text-red-400 text-xs">{error}</p>}

      {answer && !loading && (
        <div className="bg-card border border-border rounded-xl p-4">
          <pre className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">{answer}</pre>
          {ogRecord && <OGBadge record={ogRecord} />}
        </div>
      )}

      <p className="text-muted-foreground/40 text-xs">
        All Q&A history is stored on 0G decentralized storage — your data stays yours.
      </p>
    </div>
  );
}

function OverviewTab({ wallet, renamingId, onStartRename, onSaveRename }: {
  wallet: Wallet;
  renamingId: number | null;
  onStartRename: () => void;
  onSaveRename: (v: string) => void;
}) {
  const isMock = wallet.address.length < 42;
  const { data: balanceData, loading: balLoading } = useAlchemyBalances(wallet.address, wallet.chain);
  const mockActivity = getWalletActivity(wallet.chain);
  const protocols    = getActiveProtocols(mockActivity);
  const projects     = mockActivity
    .filter((a) => a.type === "deposit" || a.type === "stake" || a.type === "mint")
    .map((a) => ({ name: a.protocol, type: a.type === "mint" ? "NFT" : "DeFi", status: "active", value: a.usdValue, apy: a.apy, date: a.date }));

  const explorerBase = wallet.chain === "Ethereum" ? "etherscan.io" : wallet.chain === "Base" ? "basescan.org" : "arbiscan.io";

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 group/rename">
              {renamingId === wallet.id ? (
                <InlineRename value={wallet.label} onSave={onSaveRename} />
              ) : (
                <>
                  <p className="font-display font-bold text-foreground text-base md:text-lg">{wallet.label}</p>
                  <button onClick={onStartRename}
                    className="text-muted-foreground/30 hover:text-muted-foreground transition-colors opacity-0 group-hover/rename:opacity-100">
                    <Pencil size={13} />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground/60 text-xs font-mono">{short(wallet.address)}</span>
              <CopyButton text={wallet.address} />
              <a href={`https://${explorerBase}/address/${wallet.address}`}
                target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-1 justify-end text-base md:text-lg font-display font-bold ${wallet.positive ? "text-green-400" : "text-red-400"}`}>
              {wallet.positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {wallet.pnl}
            </div>
            <p className="text-muted-foreground/50 text-xs mt-0.5">est. P&L</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Chain",        value: wallet.chain },
            { label: "Protocols",    value: protocols.length.toString() },
            { label: "Native bal.",  value: balLoading ? "..." : balanceData ? `${parseFloat(balanceData.nativeBalance).toFixed(4)} ${balanceData.nativeSymbol}` : isMock ? "demo" : "n/a" },
          ].map((s) => (
            <div key={s.label} className="bg-background rounded-xl px-3 py-2.5">
              <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
              <p className="text-foreground font-display font-semibold text-sm truncate">{s.value}</p>
            </div>
          ))}
        </div>

        {balanceData && balanceData.tokens.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-muted-foreground text-xs mb-2">Token balances</p>
            <div className="space-y-1.5">
              {balanceData.tokens.slice(0, 5).map((t) => (
                <div key={t.address} className="flex items-center justify-between">
                  <span className="text-foreground text-xs">{t.symbol}</span>
                  <span className="text-muted-foreground text-xs font-mono">{parseFloat(t.balance).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-foreground text-sm">Active positions</h3>
        </div>
        {projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No active positions yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border border-border">
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{p.name}</p>
                  <p className="text-muted-foreground/50 text-xs">{p.date}</p>
                </div>
                {p.apy && <span className="text-green-400 text-xs shrink-0 hidden sm:inline">{p.apy}</span>}
                <span className="text-foreground text-sm font-medium shrink-0">{p.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const INNER_TABS = [
  { id: "overview",  label: "Overview",     icon: Layers },
  { id: "activity",  label: "Activity",     icon: ArrowUpDown },
  { id: "intel",     label: "Intelligence", icon: Cpu },
] as const;

type InnerTab = typeof INNER_TABS[number]["id"];

export default function WalletPage() {
  const { wallets: privyWallets } = useWallets();
  const privySeeded = useRef(false);
  const [wallets, setWallets]           = useState<Wallet[]>(initialWallets);
  const [activeWalletId, setActiveWalletId] = useState(initialWallets[0].id);
  const [innerTab, setInnerTab]         = useState<InnerTab>("overview");
  const [renamingId, setRenamingId]     = useState<number | null>(null);
  const [showModal, setShowModal]       = useState(false);

  // Seed wallet list from Privy connected wallets (fires once when wallets load)
  useEffect(() => {
    if (privySeeded.current || privyWallets.length === 0) return;
    privySeeded.current = true;
    const seeds: Wallet[] = privyWallets.map((w, i) => ({
      id: i + 1,
      address: w.address,
      label: w.chainType === "solana" ? "My Solana Wallet" : "My Wallet",
      chain: w.chainType === "solana" ? "Solana" : "Ethereum",
      pnl: "",
      positive: true,
    }));
    setWallets(seeds);
    setActiveWalletId(seeds[0].id);
  }, [privyWallets]);

  const wallet = wallets.find((w) => w.id === activeWalletId)!;

  const addWallet = (label: string, address: string, chain: string) => {
    const newId = Math.max(...wallets.map((w) => w.id)) + 1;
    setWallets((prev) => [...prev, { id: newId, address, label, chain, pnl: "loading...", positive: true }]);
    setActiveWalletId(newId);
    setInnerTab("overview");
  };

  const renameWallet = (v: string) => {
    setWallets((prev) => prev.map((w) => w.id === renamingId ? { ...w, label: v } : w));
    setRenamingId(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      {showModal && <AddWalletModal onClose={() => setShowModal(false)} onAdd={addWallet} />}

      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Wallet Memory</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Your on-chain history as an intelligence layer</p>
        </div>
        <button data-testid="button-add-wallet" onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 md:px-4 py-2 rounded-xl transition-colors">
          <Plus size={14} />
          <span className="hidden sm:inline">Track wallet</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-none pb-0.5">
        {wallets.map((w) => (
          <button key={w.id} data-testid={`button-wallet-tab-${w.id}`}
            onClick={() => { setActiveWalletId(w.id); setInnerTab("overview"); }}
            className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl border text-sm transition-all shrink-0 ${
              activeWalletId === w.id
                ? "bg-primary/15 border-primary/40 text-foreground"
                : "bg-card border-border text-muted-foreground hover:border-border/80"
            }`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${w.positive ? "bg-green-400" : "bg-red-400"}`} />
            <span className="font-medium">{w.label}</span>
            <span className="font-mono text-xs text-muted-foreground/60 hidden sm:inline">{short(w.address)}</span>
          </button>
        ))}
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground text-sm transition-all shrink-0">
          <Plus size={13} /> Add
        </button>
      </div>

      <div className="flex gap-1 mb-5 bg-card border border-border rounded-xl p-1">
        {INNER_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} data-testid={`button-inner-tab-${id}`}
            onClick={() => setInnerTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              innerTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon size={12} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {innerTab === "overview" && (
        <OverviewTab wallet={wallet} renamingId={renamingId}
          onStartRename={() => setRenamingId(wallet.id)} onSaveRename={renameWallet} />
      )}
      {innerTab === "activity" && <ActivityTab wallet={wallet} />}
      {innerTab === "intel"    && <IntelTab    wallet={wallet} />}
    </div>
  );
}
