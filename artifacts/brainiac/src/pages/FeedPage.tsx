import { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, X, MessageSquare, Send, Filter, Check, Copy, ExternalLink, Loader2 } from "lucide-react";

const SOURCES = ["All", "Discord", "Telegram"];
const TAGS    = ["All", "Alpha", "Whale Alert", "Vote", "Launch", "NFT"];

type FeedItem = {
  id: string;
  source: "Discord" | "Telegram";
  server: string;
  msg: string;
  time: string;
  tag: string;
  hot: boolean;
};

type TelegramMessage = {
  id: string;
  text: string;
  from: string;
  chatId: number;
  chatTitle: string;
  chatType: string;
  date: string;
};

const MOCK_FEED: FeedItem[] = [
  { id: "m1", source: "Discord",  server: "Bankless DAO",        msg: "Alpha drop: New DEX launching on Base tomorrow with $200K liquidity incentives. Early LPs get 3x boost. Contract will be deployed at 14:00 UTC.", time: "2m ago",  tag: "Alpha",       hot: true  },
  { id: "m2", source: "Telegram", server: "Crypto Signals Pro",  msg: "Whale wallet 0x7f3a moved 500 ETH to Binance 20 mins ago. Keep watch on price action in the next hour. Pattern seen before recent dip.",           time: "11m ago", tag: "Whale Alert", hot: true  },
  { id: "m3", source: "Discord",  server: "Base Builders",        msg: "Community vote results are in: Proposal #14 passed with 78% approval. Treasury allocation of 50K USDC confirmed for Q3 grants.",                  time: "34m ago", tag: "Vote",        hot: false },
  { id: "m4", source: "Telegram", server: "NFT Alpha",            msg: "Floor on Pudgy Penguins up 12% in the last hour. Volume spike on Blur. 340 ETH traded in 60 minutes.",                                              time: "1h ago",  tag: "NFT",         hot: false },
  { id: "m5", source: "Discord",  server: "DeFi Digest",          msg: "New yield strategy dropping on Arbitrum: 18% APY on stablecoin pairs via Camelot V4. Audited by Certik. Launching Thursday.",                      time: "2h ago",  tag: "Alpha",       hot: false },
  { id: "m6", source: "Telegram", server: "Layer Zero Insiders",  msg: "LayerZero airdrop snapshot confirmed. Must have at least 5 cross-chain transactions. Deadline is end of June.",                                     time: "3h ago",  tag: "Launch",      hot: true  },
];

function tagFromText(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("whale") || t.includes("eth to binance") || t.includes("moved")) return "Whale Alert";
  if (t.includes("airdrop") || t.includes("snapshot") || t.includes("launch") || t.includes("mint")) return "Launch";
  if (t.includes("vote") || t.includes("proposal") || t.includes("governance")) return "Vote";
  if (t.includes("nft") || t.includes("floor") || t.includes("mint") || t.includes("collection")) return "NFT";
  if (t.includes("apy") || t.includes("yield") || t.includes("alpha") || t.includes("dex") || t.includes("liquidity")) return "Alpha";
  return "Alpha";
}

function isHot(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("whale") || t.includes("urgent") || t.includes("breaking") || t.includes("airdrop") || t.includes("snapshot") || t.includes("3x");
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type ConnectedSource = {
  name: string;
  source: "Discord" | "Telegram";
  chatId?: number;
  count: string;
};

type DiscordAuth = {
  user: { id: string; username: string; displayName: string };
  guilds: Array<{ id: string; name: string }>;
  accessToken: string;
};

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-3 w-full bg-background border border-border rounded-xl px-4 py-3 text-left hover:border-primary/40 transition-colors group">
      <span className="flex-1 text-foreground text-sm font-mono tracking-wide">{value}</span>
      {copied
        ? <span className="flex items-center gap-1 text-green-400 text-xs shrink-0"><Check size={12} /> Copied</span>
        : <Copy size={13} className="text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />}
    </button>
  );
}

function ConnectModal({ onClose, onConnected, discordAuth }: {
  onClose: () => void;
  onConnected: (src: ConnectedSource) => void;
  discordAuth: DiscordAuth | null;
}) {
  const [tab, setTab]             = useState<"discord" | "telegram">("discord");
  const [name, setName]           = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState("");

  const handleDiscordOAuth = () => {
    window.location.href = "/api/discord/auth";
  };

  const handleConnect = () => {
    if (!name.trim()) return;
    setConnecting(true);
    setTimeout(() => {
      setConnected(true);
      onConnected({ name: name.trim(), source: tab === "discord" ? "Discord" : "Telegram", count: "0 today" });
    }, 1200);
    setTimeout(() => onClose(), 2400);
  };

  const handleGuildSelect = (guildName: string) => {
    setSelectedGuild(guildName);
    setName(guildName);
  };

  const canConnect = !connecting && name.trim().length > 0 && (tab === "telegram" || !!discordAuth);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-foreground">Add a source</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Brainiac reads from your own accounts</p>
          </div>
          <button data-testid="button-close-modal" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-border">
          {(["discord", "telegram"] as const).map((t) => (
            <button key={t} data-testid={`button-tab-${t}`}
              onClick={() => { setTab(t); setName(""); setSelectedGuild(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "discord" ? "Discord" : "Telegram"}
            </button>
          ))}
        </div>

        {connected ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
              <Check size={22} className="text-green-400" />
            </div>
            <p className="font-display font-semibold text-foreground">Connected</p>
            <p className="text-muted-foreground text-sm">Syncing messages from {name}...</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {tab === "discord" ? (
              <div className="space-y-3">
                <div className="bg-background rounded-xl border border-border p-4">
                  <p className="text-foreground text-xs font-semibold mb-1">Your account, your servers</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Sign in with Discord. Brainiac reads servers you already have access to, on your behalf. No bot install, no admin required.
                  </p>
                </div>

                {discordAuth ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/8 border border-green-500/20 rounded-xl">
                      <Check size={14} className="text-green-400 shrink-0" />
                      <span className="text-green-400 text-sm">Signed in as {discordAuth.user.displayName}</span>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-2">Pick a server to track</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {discordAuth.guilds.map((g) => (
                          <button key={g.id}
                            onClick={() => handleGuildSelect(g.name)}
                            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${selectedGuild === g.name ? "bg-primary/15 text-foreground border border-primary/30" : "text-muted-foreground hover:bg-white/5 border border-transparent"}`}>
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button data-testid="button-discord-auth" onClick={handleDiscordOAuth}
                    className="flex items-center justify-center gap-2 w-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/25 hover:border-[#5865F2]/50 text-[#7b84ff] text-sm font-medium py-3 rounded-xl transition-all">
                    Sign in with Discord <ExternalLink size={13} />
                  </button>
                )}

                {discordAuth && !selectedGuild && (
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">Or type a server name manually</p>
                    <input data-testid="input-community-name" type="text" placeholder="Server name..."
                      value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-background rounded-xl border border-border p-4">
                  <p className="text-foreground text-xs font-semibold mb-1">Your account, your groups</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Message the Brainiac bot to link your Telegram. It reads groups you're already in. No admin access needed.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-foreground text-xs font-medium">1. Open the bot and send /start</p>
                  <div className="flex gap-2">
                    <CopyableCode value="@brainiacaibot" />
                    <a href="https://t.me/brainiacaibot" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 shrink-0 px-3 py-2.5 bg-cyan-500/8 hover:bg-cyan-500/15 border border-cyan-500/20 hover:border-cyan-500/35 text-cyan-400 text-xs font-medium rounded-xl transition-all">
                      Open <ExternalLink size={12} />
                    </a>
                  </div>
                  <p className="text-muted-foreground/50 text-xs">The bot will confirm your account is linked.</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-foreground text-xs font-medium">2. Which group to track?</p>
                  <input data-testid="input-community-name" type="text"
                    placeholder="e.g. Crypto Alpha, Base Insiders..."
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
                </div>
              </div>
            )}

            <button data-testid="button-connect-confirm" onClick={handleConnect} disabled={!canConnect}
              className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {connecting
                ? <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
                : `Connect ${tab === "discord" ? "Discord" : "Telegram"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [activeSource, setActiveSource] = useState("All");
  const [activeTag, setActiveTag]       = useState("All");
  const [search, setSearch]             = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [feed, setFeed]                 = useState<FeedItem[]>(MOCK_FEED);
  const [tgLoading, setTgLoading]       = useState(false);
  const [discordAuth, setDiscordAuth]   = useState<DiscordAuth | null>(null);
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([
    { name: "Bankless DAO",   source: "Discord",  count: "47 today" },
    { name: "Crypto Signals", source: "Telegram", count: "23 today" },
    { name: "Base Builders",  source: "Discord",  count: "15 today" },
    { name: "NFT Alpha",      source: "Telegram", count: "8 today"  },
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("discord_connected") === "1") {
      const raw = params.get("payload");
      if (raw) {
        try {
          const auth = JSON.parse(decodeURIComponent(raw)) as DiscordAuth;
          setDiscordAuth(auth);
          const newSources = auth.guilds.slice(0, 3).map((g) => ({
            name: g.name, source: "Discord" as const, count: "live"
          }));
          setConnectedSources((prev) => {
            const names = new Set(prev.map((s) => s.name));
            return [...prev, ...newSources.filter((s) => !names.has(s.name))];
          });
        } catch {}
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchTelegramUpdates = useCallback(async () => {
    setTgLoading(true);
    try {
      const res = await fetch("/api/telegram/updates?limit=30");
      const data = await res.json() as { messages?: TelegramMessage[]; error?: string };
      if (data.error || !data.messages?.length) return;

      const newItems: FeedItem[] = data.messages.map((m) => ({
        id: `tg-${m.id}`,
        source: "Telegram" as const,
        server: m.chatTitle || "Telegram",
        msg: m.text,
        time: timeAgo(m.date),
        tag: tagFromText(m.text),
        hot: isHot(m.text),
      }));

      setFeed((prev) => {
        const existingIds = new Set(prev.map((f) => f.id));
        const fresh = newItems.filter((i) => !existingIds.has(i.id));
        return fresh.length > 0 ? [...fresh, ...prev].slice(0, 50) : prev;
      });

      const tgChats = [...new Set(newItems.map((m) => m.server))];
      setConnectedSources((prev) => {
        const names = new Set(prev.map((s) => s.name));
        const additions = tgChats
          .filter((n) => !names.has(n))
          .map((n) => ({ name: n, source: "Telegram" as const, count: `${newItems.filter((m) => m.server === n).length} today` }));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });
    } catch {
    } finally {
      setTgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelegramUpdates();
    const interval = setInterval(fetchTelegramUpdates, 30_000);
    return () => clearInterval(interval);
  }, [fetchTelegramUpdates]);

  const handleConnected = (src: ConnectedSource) => {
    setConnectedSources((prev) => {
      const exists = prev.find((s) => s.name === src.name);
      return exists ? prev : [...prev, src];
    });
  };

  const filtered = feed.filter((item) => {
    const matchSource = activeSource === "All" || item.source === activeSource;
    const matchTag    = activeTag === "All" || item.tag === activeTag;
    const matchSearch = !search || item.msg.toLowerCase().includes(search.toLowerCase()) || item.server.toLowerCase().includes(search.toLowerCase());
    return matchSource && matchTag && matchSearch;
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      {showModal && <ConnectModal onClose={() => setShowModal(false)} onConnected={handleConnected} discordAuth={discordAuth} />}

      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Feed Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Signal from your communities, filtered by AI</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="button-refresh" onClick={fetchTelegramUpdates}
            className="w-9 h-9 bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            {tgLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
          <button data-testid="button-connect" onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 md:px-4 py-2 rounded-xl transition-colors">
            <Plus size={14} /> Connect
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
        {connectedSources.map((src) => (
          <div key={src.name} data-testid={`card-source-${src.name.replace(/\s+/g, "-").toLowerCase()}`}
            className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
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

      {discordAuth && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-500/8 border border-green-500/20 rounded-xl">
          <Check size={13} className="text-green-400 shrink-0" />
          <span className="text-green-400 text-xs">Discord connected as <span className="font-medium">{discordAuth.user.displayName}</span> — {discordAuth.guilds.length} servers linked</span>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-3 py-2">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input data-testid="input-search" type="text" placeholder="Search signals..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none flex-1 min-w-0" />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
          {SOURCES.map((s) => (
            <button key={s} data-testid={`button-filter-source-${s.toLowerCase()}`} onClick={() => setActiveSource(s)}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shrink-0 ${activeSource === s ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground border border-border"}`}>
              {s}
            </button>
          ))}
          <div className="w-px h-4 bg-border mx-1 shrink-0" />
          {TAGS.map((t) => (
            <button key={t} data-testid={`button-filter-tag-${t.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => setActiveTag(t)}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shrink-0 ${activeTag === t ? "bg-white/10 text-foreground border border-white/20" : "text-muted-foreground hover:text-foreground border border-transparent"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((item) => (
          <div key={item.id} data-testid={`card-feed-item-${item.id}`}
            className="bg-card border border-border hover:border-border/80 rounded-2xl p-4 transition-all group">
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
              <button data-testid={`button-draft-from-${item.id}`}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                <MessageSquare size={11} /> Draft from this
              </button>
              <button data-testid={`button-share-${item.id}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ml-auto">
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
            <button data-testid="button-clear-filters"
              onClick={() => { setActiveSource("All"); setActiveTag("All"); setSearch(""); }}
              className="text-primary text-xs mt-1 hover:text-primary/80 transition-colors">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
