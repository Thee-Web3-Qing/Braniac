import { useState } from "react";
import { Plus, Search, RefreshCw, X, MessageSquare, Send, Filter } from "lucide-react";

const SOURCES = ["All", "Discord", "Telegram"];
const TAGS = ["All", "Alpha", "Whale Alert", "Vote", "Launch", "NFT"];

const mockFeed = [
  { id: 1, source: "Discord", server: "Bankless DAO", msg: "Alpha drop: New DEX launching on Base tomorrow with $200K liquidity incentives. Early LPs get 3x boost. Contract will be deployed at 14:00 UTC.", time: "2m ago", tag: "Alpha", hot: true },
  { id: 2, source: "Telegram", server: "Crypto Signals Pro", msg: "Whale wallet 0x7f3a moved 500 ETH to Binance 20 mins ago. Keep watch on price action in the next hour. Pattern seen before recent dip.", time: "11m ago", tag: "Whale Alert", hot: true },
  { id: 3, source: "Discord", server: "Base Builders", msg: "Community vote results are in: Proposal #14 passed with 78% approval. Treasury allocation of 50K USDC confirmed for Q3 grants.", time: "34m ago", tag: "Vote", hot: false },
  { id: 4, source: "Telegram", server: "NFT Alpha", msg: "Floor on Pudgy Penguins up 12% in the last hour. Volume spike on Blur — 340 ETH traded in 60 minutes. Sentiment shift incoming?", time: "1h ago", tag: "NFT", hot: false },
  { id: 5, source: "Discord", server: "DeFi Digest", msg: "New yield strategy dropping on Arbitrum: 18% APY on stablecoin pairs via Camelot V4. Audited by Certik. Launching Thursday.", time: "2h ago", tag: "Alpha", hot: false },
  { id: 6, source: "Telegram", server: "Layer Zero Insiders", msg: "LayerZero airdrop snapshot confirmed. Must have at least 5 cross-chain transactions. Deadline is end of June.", time: "3h ago", tag: "Launch", hot: true },
  { id: 7, source: "Discord", server: "NFT Hunters", msg: "New mint alert: 'ApeXplorer' by 0xMarcus dropping in 6 hours. Free mint + 0.01 ETH cover gas. 5000 supply. Allowlist open.", time: "4h ago", tag: "NFT", hot: false },
  { id: 8, source: "Telegram", server: "Crypto Signals Pro", msg: "SOL/BTC pair showing bullish divergence on 4H chart. Key resistance at $182. Break above could trigger 15% move.", time: "5h ago", tag: "Alpha", hot: false },
];

const connectedSources = [
  { name: "Bankless DAO", source: "Discord", count: "47 today" },
  { name: "Crypto Signals Pro", source: "Telegram", count: "23 today" },
  { name: "Base Builders", source: "Discord", count: "15 today" },
  { name: "NFT Alpha", source: "Telegram", count: "8 today" },
];

function ConnectModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Connect a community</h3>
          <button data-testid="button-close-modal" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm mb-4">Choose where to pull signals from:</p>
              {[
                { id: "discord", name: "Discord Server", desc: "Connect via webhook — no bot install needed", emoji: "🟣", color: "border-primary/30 hover:border-primary/60" },
                { id: "telegram", name: "Telegram Group", desc: "Add our bot to any group or channel", emoji: "🔵", color: "border-cyan-500/30 hover:border-cyan-500/60" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  data-testid={`button-select-${opt.id}`}
                  onClick={() => { setSelected(opt.id); setStep(2); }}
                  className={`w-full flex items-center gap-4 p-4 bg-background border ${opt.color} rounded-xl transition-all text-left`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <p className="text-foreground text-sm font-medium">{opt.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {selected === "discord" ? "Paste your Discord webhook URL:" : "Add @BrainiacBot to your Telegram group, then paste the invite link:"}
              </p>
              <input
                data-testid="input-webhook-url"
                type="text"
                placeholder={selected === "discord" ? "https://discord.com/api/webhooks/..." : "https://t.me/..."}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <input
                data-testid="input-community-name"
                type="text"
                placeholder="Give this community a name (e.g. Bankless DAO)"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <div className="flex gap-3">
                <button
                  data-testid="button-back"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-border text-muted-foreground rounded-xl text-sm hover:border-border/80 transition-colors"
                >
                  Back
                </button>
                <button
                  data-testid="button-connect-confirm"
                  onClick={onClose}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
                >
                  Connect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [activeSource, setActiveSource] = useState("All");
  const [activeTag, setActiveTag] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = mockFeed.filter((item) => {
    const matchSource = activeSource === "All" || item.source === activeSource;
    const matchTag = activeTag === "All" || item.tag === activeTag;
    const matchSearch = !search || item.msg.toLowerCase().includes(search.toLowerCase()) || item.server.toLowerCase().includes(search.toLowerCase());
    return matchSource && matchTag && matchSearch;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-foreground text-2xl">Feed Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Signal from your communities, filtered by AI</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="button-refresh"
            className="w-9 h-9 bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button
            data-testid="button-connect"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={14} /> Connect
          </button>
        </div>
      </div>

      {/* Connected sources */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {connectedSources.map((src) => (
          <div key={src.name} data-testid={`card-source-${src.name.replace(" ", "-").toLowerCase()}`} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-xs font-medium truncate">{src.name}</p>
              <p className="text-muted-foreground/60 text-xs">{src.count}</p>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${src.source === "Discord" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-400"}`}>
              {src.source}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
          <Search size={13} className="text-muted-foreground" />
          <input
            data-testid="input-search"
            type="text"
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none w-40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s}
              data-testid={`button-filter-source-${s.toLowerCase()}`}
              onClick={() => setActiveSource(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${activeSource === s ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground border border-transparent"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {TAGS.map((t) => (
            <button
              key={t}
              data-testid={`button-filter-tag-${t.toLowerCase().replace(" ", "-")}`}
              onClick={() => setActiveTag(t)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${activeTag === t ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <div
            key={item.id}
            data-testid={`card-feed-item-${item.id}`}
            className="bg-card border border-border hover:border-border/80 rounded-2xl p-4 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${item.source === "Discord" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-400"}`}>
                {item.source}
              </span>
              <span className="text-muted-foreground/60 text-xs">{item.server}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-background text-muted-foreground ml-1">{item.tag}</span>
              {item.hot && <span className="text-xs text-orange-400">🔥</span>}
              <span className="text-muted-foreground/50 text-xs ml-auto">{item.time}</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{item.msg}</p>
            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                data-testid={`button-draft-from-${item.id}`}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <MessageSquare size={11} /> Draft from this
              </button>
              <button
                data-testid={`button-share-${item.id}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ml-auto"
              >
                <Send size={11} /> Share
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Filter size={20} className="text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm">No signals match your filters.</p>
            <button
              data-testid="button-clear-filters"
              onClick={() => { setActiveSource("All"); setActiveTag("All"); setSearch(""); }}
              className="text-primary text-xs mt-1 hover:text-primary/80 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
