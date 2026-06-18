import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Zap, Wallet, MessageSquare, TrendingUp, ArrowRight, Plus, Bell, TrendingDown, Sparkles, RefreshCw, ChevronDown } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

const feedItems = [
  { id: 1, source: "Discord", server: "Bankless DAO", msg: "Alpha drop: New DEX launching on Base tomorrow with $200K liquidity incentives. Early LPs get 3x boost.", time: "2m ago", hot: true },
  { id: 2, source: "Telegram", server: "Crypto Signals", msg: "Whale wallet 0x7f3a moved 500 ETH to Binance 20 mins ago. Keep watch on price action.", time: "11m ago", hot: true },
  { id: 3, source: "Discord", server: "Base Builders", msg: "Community vote results: Proposal #14 passed with 78% approval. Treasury allocation confirmed.", time: "34m ago", hot: false },
  { id: 4, source: "Telegram", server: "NFT Alpha", msg: "Floor on Pudgy Penguins up 12% in the last hour. Volume spike on Blur.", time: "1h ago", hot: false },
];

const wallets = [
  { address: "0x7f3a...9e2b", label: "Main Wallet", chain: "Ethereum", projects: 14, pnl: "+$2,340", positive: true },
  { address: "0xc91d...4f7a", label: "Trading Wallet", chain: "Base", projects: 7, pnl: "-$180", positive: false },
];

const communities = [
  { name: "Bankless DAO", source: "Discord" },
  { name: "Crypto Signals", source: "Telegram" },
  { name: "Base Builders", source: "Discord" },
  { name: "NFT Alpha", source: "Telegram" },
];

const QUICK_PROMPTS = [
  "What did I miss this week?",
  "Any important announcements?",
  "How are my tokens performing?",
  "Anything time-sensitive I should act on?",
];

const TIME_RANGES = [
  { key: "24h", label: "24 hours" },
  { key: "7d",  label: "7 days" },
  { key: "30d", label: "30 days" },
];

function BriefingCard() {
  const { wallets: privyWallets } = useWallets();
  const [timeRange, setTimeRange] = useState("7d");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [liveFeed, setLiveFeed] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pull real Telegram messages for briefing context
  useEffect(() => {
    fetch("/api/telegram/updates?limit=30")
      .then((r) => r.json())
      .then((d: { messages?: Array<{ text: string; chatTitle?: string }> }) => {
        if (d.messages?.length) {
          setLiveFeed(d.messages.map((m) => `[${m.chatTitle ?? "Telegram"}] ${m.text}`));
        }
      })
      .catch(() => {});
  }, []);

  const ask = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    setBrief(null);
    setError(null);
    setLoading(true);
    setCollapsed(false);

    // Use real Privy wallets if connected, otherwise fall back to demo
    const realWallets = privyWallets.length > 0
      ? privyWallets.map((w, i) => ({
          label: i === 0 ? "My Wallet" : `Wallet ${i + 1}`,
          address: w.address,
          chain: w.chainType === "solana" ? "Solana" : "Ethereum",
        }))
      : wallets;

    const feedContext = liveFeed.length > 0 ? liveFeed.slice(0, 20).join("\n") : undefined;

    try {
      const res = await fetch("/api/brain/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, timeRange, wallets: realWallets, communities, feedContext }),
      });
      const data = await res.json() as { brief?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error);
      setBrief(data.brief ?? null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6 md:mb-8">
      {/* Header row */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 md:px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <span className="font-display font-semibold text-foreground text-sm">Ask Brainiac</span>
          <span className="text-muted-foreground/50 text-xs hidden sm:inline">Get a personalized catch-up</span>
        </div>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${collapsed ? "" : "rotate-180"}`} />
      </button>

      {!collapsed && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3 border-t border-border pt-4">
          {/* Time range */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs shrink-0">Looking back:</span>
            <div className="flex gap-1">
              {TIME_RANGES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTimeRange(t.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    timeRange === t.key
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => { setQuery(p); ask(p); }}
                className="text-xs border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground px-2.5 py-1 rounded-full transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Free-text input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
              placeholder={`e.g. "Fill me in on my Main Wallet tokens and any announcements I missed this week"`}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-24 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none leading-relaxed"
            />
            <button
              onClick={() => ask()}
              disabled={loading || !query.trim()}
              className="absolute right-3 bottom-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {loading ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {loading ? "..." : "Ask"}
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bg-background rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-muted-foreground text-xs">Brainiac is reading your feed and wallets...</span>
              </div>
              {[70, 50, 85, 40, 65].map((w, i) => (
                <div key={i} className="h-2.5 bg-border rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          {/* Brief output */}
          {brief && !loading && (
            <div className="bg-background rounded-xl border border-border p-4">
              <pre className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">{brief}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <p className="text-muted-foreground text-sm mb-0.5">{greeting}</p>
          <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Your Web3 Brain</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="button-notifications"
            className="relative w-9 h-9 bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          </button>
          <Link href="/feed">
            <button
              data-testid="button-connect-source"
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 md:px-4 py-2 rounded-xl transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Connect source</span>
              <span className="sm:hidden">Connect</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-6 md:mb-8">
        {[
          { label: "New signals",  value: "12", sub: "last 24h",  icon: <Zap size={14} className="text-cyan-400" />,          color: "text-cyan-400" },
          { label: "Communities", value: "4",  sub: "connected", icon: <MessageSquare size={14} className="text-primary" />,   color: "text-primary" },
          { label: "Wallets",     value: "2",  sub: "tracked",   icon: <Wallet size={14} className="text-purple-400" />,       color: "text-purple-400" },
          { label: "Alerts",      value: "8",  sub: "unread",    icon: <TrendingUp size={14} className="text-green-400" />,    color: "text-green-400" },
        ].map((s) => (
          <div
            key={s.label}
            data-testid={`card-stat-${s.label.toLowerCase().replace(" ", "-")}`}
            className="bg-card border border-border rounded-2xl p-3.5 md:p-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              {s.icon}
              <span className="text-muted-foreground text-xs truncate">{s.label}</span>
            </div>
            <p className={`font-display font-bold text-xl md:text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-muted-foreground/60 text-xs mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Briefing / Ask Brainiac */}
      <BriefingCard />

      {/* Main grid: wallets+draft first on mobile, feed second */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-5">

        {/* Right column: wallets + quick draft */}
        <div className="order-first md:order-last space-y-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground text-sm">Wallets</h2>
              <Link href="/wallet" className="text-primary text-xs hover:text-primary/80 flex items-center gap-1 transition-colors">
                View <ArrowRight size={11} />
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {wallets.map((w) => (
                <div key={w.address} data-testid={`card-wallet-${w.address}`} className="bg-background rounded-xl p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-foreground text-xs font-medium">{w.label}</p>
                    <span className={`text-xs font-medium flex items-center gap-1 shrink-0 ml-2 ${w.positive ? "text-green-400" : "text-red-400"}`}>
                      {w.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {w.pnl}
                    </span>
                  </div>
                  <p className="text-muted-foreground/50 text-xs font-mono">{w.address}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground bg-card px-1.5 py-0.5 rounded border border-border">{w.chain}</span>
                    <span className="text-xs text-muted-foreground/60">{w.projects} projects</span>
                  </div>
                </div>
              ))}
              <Link href="/wallet">
                <button data-testid="button-add-wallet" className="flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground text-xs py-2 w-full border border-dashed border-border rounded-xl transition-colors">
                  <Plus size={12} /> Add wallet
                </button>
              </Link>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-display font-semibold text-foreground text-sm mb-1.5">Create from feed</h2>
            <p className="text-muted-foreground text-xs mb-3 leading-relaxed">Turn today's signals into a thread, recap, or alpha brief when you're ready to share.</p>
            <Link href="/brain">
              <button data-testid="button-open-brain" className="block w-full text-center bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-sm font-medium py-2.5 rounded-xl transition-all">
                Create →
              </button>
            </Link>
          </div>
        </div>

        {/* Live Feed */}
        <div className="md:col-span-2 order-last md:order-first bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 md:px-5 py-3.5 md:py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <h2 className="font-display font-semibold text-foreground text-sm">Live Feed</h2>
            </div>
            <Link href="/feed" className="text-primary text-xs hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {feedItems.map((item, idx) => (
              <div
                key={item.id}
                data-testid={`card-feed-${item.id}`}
                className={`px-4 md:px-5 py-3 md:py-3.5 hover:bg-white/[0.02] transition-colors ${idx >= 2 ? "hidden md:block" : ""}`}
              >
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${item.source === "Discord" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-400"}`}>
                    {item.source}
                  </span>
                  <span className="text-muted-foreground/60 text-xs truncate max-w-[120px] md:max-w-none">{item.server}</span>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    {item.hot && <span className="text-xs text-orange-400">Hot</span>}
                    <span className="text-muted-foreground/50 text-xs">{item.time}</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{item.msg}</p>
              </div>
            ))}
          </div>
          <div className="md:hidden px-4 py-3 border-t border-border">
            <Link href="/feed" className="text-primary text-xs flex items-center gap-1 hover:text-primary/80 transition-colors">
              See all signals <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
