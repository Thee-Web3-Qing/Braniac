import { useState } from "react";
import { Link } from "wouter";
import { Zap, Wallet, MessageSquare, TrendingUp, ArrowRight, Plus, Bell, TrendingDown } from "lucide-react";

const mockFeed = [
  { id: 1, source: "Discord", server: "Bankless DAO", msg: "Alpha drop: New DEX launching on Base tomorrow with $200K liquidity incentives. Early LPs get 3x boost.", time: "2m ago", hot: true },
  { id: 2, source: "Telegram", server: "Crypto Signals", msg: "Whale wallet 0x7f3a moved 500 ETH to Binance 20 mins ago. Keep watch on price action.", time: "11m ago", hot: true },
  { id: 3, source: "Discord", server: "Base Builders", msg: "Community vote results are in: Proposal #14 passed with 78% approval. Treasury allocation confirmed.", time: "34m ago", hot: false },
  { id: 4, source: "Telegram", server: "NFT Alpha", msg: "Floor on Pudgy Penguins up 12% in the last hour. Volume spike on Blur.", time: "1h ago", hot: false },
];

const mockWallets = [
  { address: "0x7f3a...9e2b", label: "Main Wallet", chain: "Ethereum", projects: 14, pnl: "+$2,340", positive: true },
  { address: "0xc91d...4f7a", label: "Trading Wallet", chain: "Base", projects: 7, pnl: "-$180", positive: false },
];

export default function DashboardPage() {
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted-foreground text-sm mb-1">{greeting} 👋</p>
          <h1 className="font-display font-bold text-foreground text-2xl">Your Web3 Brain</h1>
        </div>
        <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Plus size={14} /> Connect source
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "New signals", value: "12", sub: "last 24h", icon: <Zap size={14} className="text-cyan-400" />, color: "text-cyan-400" },
          { label: "Communities", value: "4", sub: "connected", icon: <MessageSquare size={14} className="text-primary" />, color: "text-primary" },
          { label: "Wallets", value: "2", sub: "tracked", icon: <Wallet size={14} className="text-purple-400" />, color: "text-purple-400" },
          { label: "Drafts", value: "8", sub: "AI-ready", icon: <TrendingUp size={14} className="text-green-400" />, color: "text-green-400" },
        ].map((s) => (
          <div
            key={s.label}
            data-testid={`card-stat-${s.label.toLowerCase().replace(" ", "-")}`}
            className="bg-card border border-border rounded-2xl p-4 hover:border-border/80 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-2">
              {s.icon}
              <span className="text-muted-foreground text-xs">{s.label}</span>
            </div>
            <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-muted-foreground/60 text-xs mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Live Feed */}
        <div className="md:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
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
            {mockFeed.map((item) => (
              <div
                key={item.id}
                data-testid={`card-feed-${item.id}`}
                className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    item.source === "Discord"
                      ? "bg-primary/15 text-primary"
                      : "bg-cyan-500/15 text-cyan-400"
                  }`}>
                    {item.source}
                  </span>
                  <span className="text-muted-foreground/60 text-xs">{item.server}</span>
                  {item.hot && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-400 ml-auto">🔥 Hot</span>
                  )}
                  <span className={`text-muted-foreground/50 text-xs ${item.hot ? "" : "ml-auto"}`}>{item.time}</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{item.msg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Wallets */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground text-sm">Wallets</h2>
              <Link href="/wallet" className="text-primary text-xs hover:text-primary/80 flex items-center gap-1 transition-colors">
                View <ArrowRight size={11} />
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {mockWallets.map((w) => (
                <div key={w.address} data-testid={`card-wallet-${w.address}`} className="bg-background rounded-xl p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-foreground text-xs font-medium">{w.label}</p>
                    <span className={`text-xs font-medium flex items-center gap-1 ${w.positive ? "text-green-400" : "text-red-400"}`}>
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
                <button
                  data-testid="button-add-wallet"
                  className="flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground text-xs py-2 w-full border border-dashed border-border rounded-xl transition-colors"
                >
                  <Plus size={12} /> Add wallet
                </button>
              </Link>
            </div>
          </div>

          {/* Quick Draft */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-display font-semibold text-foreground text-sm mb-3">Quick Draft</h2>
            <p className="text-muted-foreground text-xs mb-3 leading-relaxed">Let AI turn today's feed into a thread or Space recap.</p>
            <Link href="/brain">
              <button
                data-testid="button-open-brain"
                className="block w-full text-center bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-sm font-medium py-2.5 rounded-xl transition-all"
              >
                Open Brain →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
