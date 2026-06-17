import { useState } from "react";
import { Plus, Search, RefreshCw, X, MessageSquare, Send, Filter, Check, Copy, ExternalLink } from "lucide-react";

const SOURCES = ["All", "Discord", "Telegram"];
const TAGS = ["All", "Alpha", "Whale Alert", "Vote", "Launch", "NFT"];

const mockFeed = [
  { id: 1, source: "Discord", server: "Bankless DAO", msg: "Alpha drop: New DEX launching on Base tomorrow with $200K liquidity incentives. Early LPs get 3x boost. Contract will be deployed at 14:00 UTC.", time: "2m ago", tag: "Alpha", hot: true },
  { id: 2, source: "Telegram", server: "Crypto Signals Pro", msg: "Whale wallet 0x7f3a moved 500 ETH to Binance 20 mins ago. Keep watch on price action in the next hour. Pattern seen before recent dip.", time: "11m ago", tag: "Whale Alert", hot: true },
  { id: 3, source: "Discord", server: "Base Builders", msg: "Community vote results are in: Proposal #14 passed with 78% approval. Treasury allocation of 50K USDC confirmed for Q3 grants.", time: "34m ago", tag: "Vote", hot: false },
  { id: 4, source: "Telegram", server: "NFT Alpha", msg: "Floor on Pudgy Penguins up 12% in the last hour. Volume spike on Blur. 340 ETH traded in 60 minutes.", time: "1h ago", tag: "NFT", hot: false },
  { id: 5, source: "Discord", server: "DeFi Digest", msg: "New yield strategy dropping on Arbitrum: 18% APY on stablecoin pairs via Camelot V4. Audited by Certik. Launching Thursday.", time: "2h ago", tag: "Alpha", hot: false },
  { id: 6, source: "Telegram", server: "Layer Zero Insiders", msg: "LayerZero airdrop snapshot confirmed. Must have at least 5 cross-chain transactions. Deadline is end of June.", time: "3h ago", tag: "Launch", hot: true },
  { id: 7, source: "Discord", server: "NFT Hunters", msg: "New mint alert: ApeXplorer by 0xMarcus dropping in 6 hours. Free mint + 0.01 ETH for gas. 5000 supply. Allowlist open.", time: "4h ago", tag: "NFT", hot: false },
  { id: 8, source: "Telegram", server: "Crypto Signals Pro", msg: "SOL/BTC pair showing bullish divergence on 4H chart. Key resistance at $182. Break above could trigger 15% move.", time: "5h ago", tag: "Alpha", hot: false },
];

const connectedSources = [
  { name: "Bankless DAO", source: "Discord", count: "47 today" },
  { name: "Crypto Signals Pro", source: "Telegram", count: "23 today" },
  { name: "Base Builders", source: "Discord", count: "15 today" },
  { name: "NFT Alpha", source: "Telegram", count: "8 today" },
];

const DISCORD_STEPS = [
  { n: "1", title: "Open your Discord server", sub: "Go to Server Settings in the bottom-left" },
  { n: "2", title: "Integrations > Webhooks", sub: "Create a new webhook and name it Brainiac" },
  { n: "3", title: "Copy the webhook URL", sub: "Click Copy Webhook URL and paste it below" },
];

function CopyableText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-2 w-full bg-background border border-border rounded-xl px-4 py-3 text-left hover:border-primary/40 transition-colors group"
    >
      <span className="flex-1 text-foreground text-sm font-mono">{value}</span>
      {copied
        ? <Check size={14} className="text-green-400 shrink-0" />
        : <Copy size={14} className="text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />}
    </button>
  );
}

function ConnectModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"discord" | "telegram">("discord");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [name, setName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    if (!name.trim()) return;
    setConnecting(true);
    setTimeout(() => { setConnecting(false); setConnected(true); }, 1400);
    setTimeout(() => onClose(), 2600);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Connect a community</h3>
          <button data-testid="button-close-modal" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-border">
          {(["discord", "telegram"] as const).map((t) => (
            <button
              key={t}
              data-testid={`button-tab-${t}`}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "discord" ? "Discord" : "Telegram"}
            </button>
          ))}
        </div>

        {connected ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
              <Check size={22} className="text-green-400" />
            </div>
            <p className="font-display font-semibold text-foreground">Connected</p>
            <p className="text-muted-foreground text-sm">Syncing messages from {name || "your community"}...</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {tab === "discord" ? (
              <>
                {/* Steps */}
                <div className="space-y-3">
                  {DISCORD_STEPS.map((s) => (
                    <div key={s.n} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-primary text-xs font-bold">{s.n}</span>
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-medium">{s.title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{s.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <a
                  href="https://discord.com/channels/@me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 hover:border-[#5865F2]/50 text-[#7b84ff] text-sm font-medium py-2.5 rounded-xl transition-all"
                >
                  Open Discord <ExternalLink size={13} />
                </a>

                <div className="space-y-2.5">
                  <input
                    data-testid="input-webhook-url"
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono"
                  />
                  <input
                    data-testid="input-community-name"
                    type="text"
                    placeholder="Server name (e.g. Bankless DAO)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="bg-background rounded-xl p-4 border border-border space-y-3">
                  <p className="text-foreground text-sm font-medium">Add our bot to your group</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Open your Telegram group, go to Add Members, and search for the bot below. Make it an admin so it can read messages.
                  </p>
                  <CopyableText value="@BrainiacSignalBot" />
                </div>

                <a
                  href="https://t.me/BrainiacSignalBot?startgroup=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 text-sm font-medium py-2.5 rounded-xl transition-all"
                >
                  Add bot to Telegram group <ExternalLink size={13} />
                </a>

                <div className="space-y-2.5">
                  <p className="text-muted-foreground text-xs">Once added, enter the group or channel name:</p>
                  <input
                    data-testid="input-community-name"
                    type="text"
                    placeholder="Group name (e.g. Crypto Alpha)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </>
            )}

            <button
              data-testid="button-connect-confirm"
              onClick={handleConnect}
              disabled={connecting || !name.trim() || (tab === "discord" && !webhookUrl.trim())}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {connecting ? (
                <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
              ) : (
                `Connect ${tab === "discord" ? "Discord" : "Telegram"}`
              )}
            </button>
          </div>
        )}
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
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Feed Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Signal from your communities, filtered by AI</p>
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
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 md:px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={14} /> Connect
          </button>
        </div>
      </div>

      {/* Connected sources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
        {connectedSources.map((src) => (
          <div key={src.name} data-testid={`card-source-${src.name.replace(" ", "-").toLowerCase()}`} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-xs font-medium truncate">{src.name}</p>
              <p className="text-muted-foreground/60 text-xs">{src.count}</p>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${src.source === "Discord" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-400"}`}>
              {src.source}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            data-testid="input-search"
            type="text"
            placeholder="Search signals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
          {SOURCES.map((s) => (
            <button
              key={s}
              data-testid={`button-filter-source-${s.toLowerCase()}`}
              onClick={() => setActiveSource(s)}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shrink-0 ${activeSource === s ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground border border-border"}`}
            >
              {s}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          {TAGS.map((t) => (
            <button
              key={t}
              data-testid={`button-filter-tag-${t.toLowerCase().replace(" ", "-")}`}
              onClick={() => setActiveTag(t)}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shrink-0 ${activeTag === t ? "bg-white/10 text-foreground border border-white/20" : "text-muted-foreground hover:text-foreground border border-transparent"}`}
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
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${item.source === "Discord" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-400"}`}>
                {item.source}
              </span>
              <span className="text-muted-foreground/60 text-xs truncate max-w-[140px] sm:max-w-none">{item.server}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-background text-muted-foreground shrink-0">{item.tag}</span>
              {item.hot && <span className="text-xs text-orange-400 shrink-0">Hot</span>}
              <span className="text-muted-foreground/50 text-xs ml-auto shrink-0">{item.time}</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{item.msg}</p>
            <div className="flex items-center gap-2 mt-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
