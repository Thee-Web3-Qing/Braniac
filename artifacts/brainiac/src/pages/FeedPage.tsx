import { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, X, MessageSquare, Send, Filter, Check, Copy, ExternalLink, Loader2, ChevronRight, Phone, KeyRound } from "lucide-react";

const SOURCES = ["All", "Discord", "Telegram"];
const TAGS    = ["All", "Alpha", "Whale Alert", "Vote", "Launch", "NFT"];

const LS_DISCORD_AUTH     = "brainiac:discord_auth";
const LS_DISCORD_CHANNELS = "brainiac:discord_channels";
const LS_TG_SESSION       = "brainiac:tg_session";
const LS_TG_CHATS         = "brainiac:tg_chats";

const TG_POLL_INTERVAL_MS  = 60_000;
const RECONNECT_STALE_MS   = TG_POLL_INTERVAL_MS * 1.5;

type FeedItem = {
  id: string;
  source: "Discord" | "Telegram";
  server: string;
  msg: string;
  time: string;
  tag: string;
  hot: boolean;
};

type DiscordAuth = {
  user: { id: string; username: string; displayName: string };
  guilds: Array<{ id: string; name: string }>;
  accessToken: string;
};

type DiscordTrackedChannel = {
  channelId: string;
  channelName: string;
  guildId: string;
  guildName: string;
};

type TgChat = { id: string; title: string };

type ConnectedSource = {
  name: string;
  source: "Discord" | "Telegram";
  count: string;
};

const MOCK_FEED: FeedItem[] = [
  { id: "m1", source: "Discord",  server: "Bankless DAO",        msg: "Alpha drop: New DEX launching on Base tomorrow with $200K liquidity incentives. Early LPs get 3x boost.", time: "2m ago",  tag: "Alpha",       hot: true  },
  { id: "m2", source: "Telegram", server: "Crypto Signals Pro",  msg: "Whale wallet 0x7f3a moved 500 ETH to Binance 20 mins ago. Watch price action in the next hour.",         time: "11m ago", tag: "Whale Alert", hot: true  },
  { id: "m3", source: "Discord",  server: "Base Builders",       msg: "Proposal #14 passed with 78% approval. Treasury allocation of 50K USDC confirmed for Q3 grants.",       time: "34m ago", tag: "Vote",        hot: false },
  { id: "m4", source: "Telegram", server: "NFT Alpha",           msg: "Floor on Pudgy Penguins up 12% in the last hour. Volume spike on Blur. 340 ETH traded in 60 minutes.",  time: "1h ago",  tag: "NFT",         hot: false },
  { id: "m5", source: "Discord",  server: "DeFi Digest",         msg: "New yield strategy dropping on Arbitrum: 18% APY on stablecoin pairs via Camelot V4. Launching Thu.",   time: "2h ago",  tag: "Alpha",       hot: false },
  { id: "m6", source: "Telegram", server: "Layer Zero Insiders", msg: "LayerZero airdrop snapshot confirmed. Must have 5+ cross-chain transactions. Deadline end of June.",     time: "3h ago",  tag: "Launch",      hot: true  },
];

function tagFromText(t: string): string {
  const s = t.toLowerCase();
  if (s.includes("whale") || s.includes("moved") || s.includes("binance")) return "Whale Alert";
  if (s.includes("airdrop") || s.includes("snapshot") || s.includes("launch") || s.includes("mint")) return "Launch";
  if (s.includes("vote") || s.includes("proposal") || s.includes("governance")) return "Vote";
  if (s.includes("nft") || s.includes("floor") || s.includes("collection")) return "NFT";
  return "Alpha";
}

function isHot(t: string): boolean {
  const s = t.toLowerCase();
  return s.includes("whale") || s.includes("urgent") || s.includes("breaking") || s.includes("airdrop") || s.includes("3x");
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

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

type TgStep = "phone" | "otp" | "dialogs";

function TelegramAuthFlow({ onConnected }: {
  onConnected: (session: string, chats: TgChat[]) => void;
}) {
  const [step, setStep]           = useState<TgStep>("phone");
  const [phone, setPhone]         = useState("");
  const [code, setCode]           = useState("");
  const [sessionId, setSessionId] = useState("");
  const [tempSession, setTempSession] = useState("");
  const [dialogs, setDialogs]     = useState<Array<{ id: string; title: string; type: string }>>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const sendCode = async () => {
    if (!phone.trim()) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/telegram/user/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const d = await r.json() as { sessionId?: string; error?: string };
      if (!r.ok || d.error) throw new Error(d.error ?? "Failed to send code");
      setSessionId(d.sessionId!);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/telegram/user/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, code: code.trim() }),
      });
      const d = await r.json() as { sessionString?: string; needs2FA?: boolean; error?: string };
      if (d.needs2FA) {
        setError("This account has 2FA enabled. Brainiac doesn't support 2FA accounts yet.");
        return;
      }
      if (!r.ok || d.error) throw new Error(d.error ?? "Invalid code");
      setTempSession(d.sessionString!);

      // Immediately fetch dialogs
      const dr = await fetch("/api/telegram/user/dialogs", {
        headers: { "x-tg-session": d.sessionString! },
      });
      const dd = await dr.json() as { chats?: Array<{ id: string; title: string; type: string }>; error?: string };
      if (dd.error) throw new Error(dd.error);
      setDialogs(dd.chats ?? []);
      setStep("dialogs");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleChat = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const trackSelected = () => {
    const chats = dialogs.filter((d) => selected.has(d.id)).map((d) => ({ id: d.id, title: d.title }));
    if (chats.length === 0) return;
    onConnected(tempSession, chats);
  };

  if (step === "phone") return (
    <div className="space-y-4">
      <div className="bg-background rounded-xl border border-border p-4">
        <p className="text-foreground text-xs font-semibold mb-1">Reads as you — no bot, no admin needed</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Sign in with your Telegram account. Brainiac reads any group or channel you're already a member of — using your identity, not a bot.
        </p>
      </div>
      <div>
        <label className="text-muted-foreground text-xs block mb-1.5">Your phone number</label>
        <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5 focus-within:border-primary/50 transition-colors">
          <Phone size={14} className="text-muted-foreground/50 shrink-0" />
          <input type="tel" placeholder="+1 234 567 8900" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendCode()}
            className="bg-transparent text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none flex-1" />
        </div>
        <p className="text-muted-foreground/50 text-xs mt-1">Include country code. Telegram will send you a code.</p>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button onClick={sendCode} disabled={loading || !phone.trim()}
        className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : "Send code"}
      </button>
    </div>
  );

  if (step === "otp") return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-3 py-3 bg-cyan-500/8 border border-cyan-500/20 rounded-xl">
        <KeyRound size={16} className="text-cyan-400 shrink-0" />
        <div>
          <p className="text-foreground text-xs font-medium">Check your Telegram app</p>
          <p className="text-muted-foreground/70 text-xs">Telegram sent a login code to {phone}</p>
        </div>
      </div>
      <div>
        <label className="text-muted-foreground text-xs block mb-1.5">Enter the code</label>
        <input type="text" inputMode="numeric" placeholder="12345" value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verifyCode()}
          maxLength={10}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-lg font-mono text-center tracking-widest placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors" />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button onClick={verifyCode} disabled={loading || !code.trim()}
        className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Verifying...</> : "Verify"}
      </button>
      <button onClick={() => { setStep("phone"); setError(null); setCode(""); }}
        className="w-full text-muted-foreground text-xs hover:text-foreground transition-colors">
        Use a different number
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/8 border border-green-500/20 rounded-xl">
        <Check size={14} className="text-green-400 shrink-0" />
        <span className="text-green-400 text-xs font-medium">Signed in — {dialogs.length} groups & channels found</span>
      </div>
      <p className="text-muted-foreground text-xs">Pick which chats to monitor:</p>
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {dialogs.map((d) => (
          <button key={d.id} onClick={() => toggleChat(d.id)}
            className={`w-full flex items-center gap-3 text-left text-sm px-3 py-2 rounded-lg transition-colors border ${
              selected.has(d.id) ? "bg-primary/12 border-primary/30 text-foreground" : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}>
            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected.has(d.id) ? "bg-primary border-primary" : "border-border"}`}>
              {selected.has(d.id) && <Check size={10} className="text-primary-foreground" />}
            </div>
            <span className="flex-1 truncate">{d.title}</span>
            <span className="text-muted-foreground/40 text-xs shrink-0">{d.type}</span>
          </button>
        ))}
        {dialogs.length === 0 && (
          <p className="text-center py-6 text-muted-foreground text-sm">No groups or channels found.</p>
        )}
      </div>
      <button onClick={trackSelected} disabled={selected.size === 0}
        className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors">
        {selected.size > 0 ? `Track ${selected.size} chat${selected.size > 1 ? "s" : ""}` : "Select chats"}
      </button>
    </div>
  );
}

function ConnectModal({ onClose, onChannelTracked, onTelegramConnected, discordAuth, initialTab = "discord" }: {
  onClose: () => void;
  onChannelTracked: (guild: { id: string; name: string }, channels: Array<{ id: string; name: string }>) => void;
  onTelegramConnected: (session: string, chats: TgChat[]) => void;
  discordAuth: DiscordAuth | null;
  initialTab?: "discord" | "telegram";
}) {
  const [tab, setTab]   = useState<"discord" | "telegram">(initialTab);
  const [step, setStep] = useState<"guild" | "channels">("guild");
  const [selectedGuild, setSelectedGuild] = useState<{ id: string; name: string } | null>(null);
  const [guildChannels, setGuildChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set());
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [manualChannelId, setManualChannelId] = useState("");

  const handleGuildSelect = async (guild: { id: string; name: string }) => {
    setSelectedGuild(guild);
    setStep("channels");
    setLoadingChannels(true);
    setChannelError(null);
    setGuildChannels([]);
    setSelectedChannelIds(new Set());
    try {
      const r = await fetch(`/api/discord/channels/${guild.id}`, {
        headers: { "x-discord-token": discordAuth!.accessToken },
      });
      const data = await r.json() as { channels?: Array<{ id: string; name: string }>; error?: string };
      if (!r.ok || data.error) setChannelError(data.error ?? "Could not list channels");
      else setGuildChannels(data.channels ?? []);
    } catch {
      setChannelError("Network error — try entering the channel ID manually");
    } finally {
      setLoadingChannels(false);
    }
  };

  const toggleChannel = (id: string) => {
    setSelectedChannelIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleTrackSelected = () => {
    if (!selectedGuild || selectedChannelIds.size === 0) return;
    onChannelTracked(selectedGuild, guildChannels.filter((c) => selectedChannelIds.has(c.id)));
    onClose();
  };

  const handleManualAdd = () => {
    if (!selectedGuild || !manualChannelId.trim()) return;
    const id = manualChannelId.trim();
    onChannelTracked(selectedGuild, [{ id, name: `channel-${id.slice(-4)}` }]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg animate-slide-up max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {step === "channels" && tab === "discord" && (
              <button onClick={() => setStep("guild")} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight size={15} className="rotate-180" />
              </button>
            )}
            <div>
              <h3 className="font-display font-semibold text-foreground">Add a source</h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                {step === "channels" && selectedGuild ? `${selectedGuild.name} — pick channels` : "Reads as you — no admin needed"}
              </p>
            </div>
          </div>
          <button data-testid="button-close-modal" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {step === "guild" && (
          <div className="flex border-b border-border shrink-0">
            {(["discord", "telegram"] as const).map((t) => (
              <button key={t} data-testid={`button-tab-${t}`} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "discord" ? "Discord" : "Telegram"}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 overflow-y-auto">
          {tab === "discord" && step === "guild" && (
            <div className="space-y-3">
              <div className="bg-background rounded-xl border border-border p-4">
                <p className="text-foreground text-xs font-semibold mb-1">Reads as you — no admin needed</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Connect your Discord account. Brainiac reads any channel you can already see as a regular member — no bot invite, no server permissions required.
                </p>
              </div>
              {discordAuth ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/8 border border-green-500/20 rounded-xl">
                    <Check size={14} className="text-green-400 shrink-0" />
                    <span className="text-green-400 text-sm">Signed in as {discordAuth.user.displayName}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">Pick a server to track:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {discordAuth.guilds.map((g) => (
                      <button key={g.id} onClick={() => handleGuildSelect(g)}
                        className="w-full flex items-center justify-between text-left text-sm px-3 py-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-border transition-colors group">
                        <span className="text-foreground">{g.name}</span>
                        <ChevronRight size={13} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button data-testid="button-discord-auth" onClick={() => { window.location.href = "/api/discord/auth"; }}
                  className="flex items-center justify-center gap-2 w-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/25 hover:border-[#5865F2]/50 text-[#7b84ff] text-sm font-medium py-3 rounded-xl transition-all">
                  Sign in with Discord <ExternalLink size={13} />
                </button>
              )}
            </div>
          )}

          {tab === "discord" && step === "channels" && (
            <div className="space-y-3">
              {loadingChannels ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-sm">
                  <Loader2 size={15} className="animate-spin" /> Fetching channels...
                </div>
              ) : channelError ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground/70 text-xs">{channelError}</p>
                  <div>
                    <p className="text-foreground text-xs font-medium mb-1">Enter channel ID manually</p>
                    <p className="text-muted-foreground/50 text-xs mb-2">Right-click a channel in Discord &rarr; Copy Channel ID (enable Developer Mode in settings)</p>
                    <input type="text" placeholder="Channel ID..." value={manualChannelId}
                      onChange={(e) => setManualChannelId(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
                  </div>
                  <button onClick={handleManualAdd} disabled={!manualChannelId.trim()}
                    className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors">
                    Track this channel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs">{guildChannels.length} text channels — select to monitor:</p>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {guildChannels.map((c) => (
                      <button key={c.id} onClick={() => toggleChannel(c.id)}
                        className={`w-full flex items-center gap-3 text-left text-sm px-3 py-2 rounded-lg transition-colors border ${
                          selectedChannelIds.has(c.id) ? "bg-primary/12 border-primary/30 text-foreground" : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        }`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedChannelIds.has(c.id) ? "bg-primary border-primary" : "border-border"}`}>
                          {selectedChannelIds.has(c.id) && <Check size={10} className="text-primary-foreground" />}
                        </div>
                        <span className="font-mono text-xs"># {c.name}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleTrackSelected} disabled={selectedChannelIds.size === 0}
                    className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-medium transition-colors">
                    {selectedChannelIds.size > 0 ? `Track ${selectedChannelIds.size} channel${selectedChannelIds.size > 1 ? "s" : ""}` : "Select channels"}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "telegram" && (
            <TelegramAuthFlow onConnected={(session, chats) => { onTelegramConnected(session, chats); onClose(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [activeSource, setActiveSource] = useState("All");
  const [activeTag, setActiveTag]       = useState("All");
  const [search, setSearch]             = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"discord" | "telegram">("discord");
  const [tgSessionExpired, setTgSessionExpired] = useState(false);
  const [feed, setFeed]                 = useState<FeedItem[]>(MOCK_FEED);
  const [tgLoading, setTgLoading]             = useState(false);
  const [lastTgSuccessAt, setLastTgSuccessAt] = useState<number | null>(null);
  const [discordLoading, setDiscordLoading]   = useState(false);
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([]);

  const [discordAuth, setDiscordAuth] = useState<DiscordAuth | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_DISCORD_AUTH) ?? "null"); } catch { return null; }
  });
  const [trackedDiscordChannels, setTrackedDiscordChannels] = useState<DiscordTrackedChannel[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_DISCORD_CHANNELS) ?? "[]"); } catch { return []; }
  });
  const [tgSession, setTgSession] = useState<string | null>(() => localStorage.getItem(LS_TG_SESSION));
  const [trackedTgChats, setTrackedTgChats] = useState<TgChat[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_TG_CHATS) ?? "[]"); } catch { return []; }
  });

  const mergeItems = (incoming: FeedItem[]) => {
    setFeed((prev) => {
      const ids = new Set(prev.map((f) => f.id));
      const fresh = incoming.filter((i) => !ids.has(i.id));
      return fresh.length > 0 ? [...fresh, ...prev].slice(0, 150) : prev;
    });
  };

  const addSource = (name: string, source: "Discord" | "Telegram", count = "live") => {
    setConnectedSources((prev) => prev.find((s) => s.name === name) ? prev : [...prev, { name, source, count }]);
  };

  // Restore Discord auth from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("discord_connected") === "1") {
      const raw = params.get("payload");
      if (raw) {
        try {
          const auth = JSON.parse(decodeURIComponent(raw)) as DiscordAuth;
          setDiscordAuth(auth);
          localStorage.setItem(LS_DISCORD_AUTH, JSON.stringify(auth));
        } catch {}
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (discordAuth) localStorage.setItem(LS_DISCORD_AUTH, JSON.stringify(discordAuth));
    else localStorage.removeItem(LS_DISCORD_AUTH);
  }, [discordAuth]);

  useEffect(() => {
    localStorage.setItem(LS_DISCORD_CHANNELS, JSON.stringify(trackedDiscordChannels));
    trackedDiscordChannels.forEach((ch) => addSource(ch.guildName, "Discord", "live"));
  }, [trackedDiscordChannels]);

  useEffect(() => {
    if (tgSession) localStorage.setItem(LS_TG_SESSION, tgSession);
    else localStorage.removeItem(LS_TG_SESSION);
  }, [tgSession]);

  useEffect(() => {
    localStorage.setItem(LS_TG_CHATS, JSON.stringify(trackedTgChats));
    trackedTgChats.forEach((c) => addSource(c.title, "Telegram", "live"));
  }, [trackedTgChats]);

  // Poll Telegram via user session
  const fetchUserTgMessages = useCallback(async () => {
    if (!tgSession || trackedTgChats.length === 0) return;
    setTgLoading(true);
    try {
      const allItems: FeedItem[] = [];
      let anySuccess = false;
      await Promise.allSettled(
        trackedTgChats.map(async (chat) => {
          const r = await fetch(`/api/telegram/user/messages/${chat.id}?limit=20`, {
            headers: { "x-tg-session": tgSession },
          });
          if (!r.ok) {
            if (r.status === 401) {
              const body = await r.json().catch(() => ({})) as { code?: string };
              if (body.code === "SESSION_EXPIRED") {
                setTgSession(null);
                setTrackedTgChats([]);
                localStorage.removeItem(LS_TG_SESSION);
                localStorage.removeItem(LS_TG_CHATS);
                setConnectedSources((prev) => prev.filter((s) => s.source !== "Telegram"));
                setTgSessionExpired(true);
              }
            }
            return;
          }
          anySuccess = true;
          const data = await r.json() as { messages?: Array<{ id: string; text: string; date: string }> };
          (data.messages ?? []).filter((m) => m.text.trim().length > 0).forEach((m) => {
            allItems.push({
              id: `tgu-${chat.id}-${m.id}`,
              source: "Telegram",
              server: chat.title,
              msg: m.text,
              time: timeAgo(m.date),
              tag: tagFromText(m.text),
              hot: isHot(m.text),
            });
          });
        })
      );
      if (allItems.length > 0) mergeItems(allItems);
      if (anySuccess) setLastTgSuccessAt(Date.now());
    } catch {
    } finally {
      setTgLoading(false);
    }
  }, [tgSession, trackedTgChats]);

  // Poll Discord via user token
  const fetchDiscordMessages = useCallback(async () => {
    if (!discordAuth || trackedDiscordChannels.length === 0) return;
    setDiscordLoading(true);
    try {
      const allItems: FeedItem[] = [];
      await Promise.allSettled(
        trackedDiscordChannels.map(async (ch) => {
          const r = await fetch(`/api/discord/messages/${ch.guildId}/${ch.channelId}?limit=20`, {
            headers: { "x-discord-token": discordAuth.accessToken },
          });
          if (!r.ok) return;
          const data = await r.json() as { messages?: Array<{ id: string; content: string; author: string; timestamp: string }> };
          (data.messages ?? []).filter((m) => m.content.trim().length > 0).forEach((m) => {
            allItems.push({
              id: `dc-${m.id}`,
              source: "Discord",
              server: ch.guildName,
              msg: m.content,
              time: timeAgo(m.timestamp),
              tag: tagFromText(m.content),
              hot: isHot(m.content),
            });
          });
        })
      );
      if (allItems.length > 0) mergeItems(allItems);
    } catch {
    } finally {
      setDiscordLoading(false);
    }
  }, [discordAuth, trackedDiscordChannels]);

  useEffect(() => {
    fetchUserTgMessages();
    const iv = setInterval(fetchUserTgMessages, TG_POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchUserTgMessages]);

  useEffect(() => {
    if (trackedDiscordChannels.length === 0) return;
    fetchDiscordMessages();
    const iv = setInterval(fetchDiscordMessages, 60_000);
    return () => clearInterval(iv);
  }, [fetchDiscordMessages, trackedDiscordChannels.length]);

  const handleChannelTracked = (guild: { id: string; name: string }, channels: Array<{ id: string; name: string }>) => {
    setTrackedDiscordChannels((prev) => {
      const ids = new Set(prev.map((c) => c.channelId));
      return [...prev, ...channels.filter((c) => !ids.has(c.id)).map((c) => ({
        channelId: c.id, channelName: c.name, guildId: guild.id, guildName: guild.name,
      }))];
    });
  };

  const handleTelegramConnected = (session: string, chats: TgChat[]) => {
    setTgSession(session);
    setTgSessionExpired(false);
    setTrackedTgChats((prev) => {
      const ids = new Set(prev.map((c) => c.id));
      return [...prev, ...chats.filter((c) => !ids.has(c.id))];
    });
  };

  const disconnectTelegram = () => {
    setTgSession(null); setTrackedTgChats([]);
    localStorage.removeItem(LS_TG_SESSION); localStorage.removeItem(LS_TG_CHATS);
    setConnectedSources((prev) => prev.filter((s) => s.source !== "Telegram"));
    setLastTgSuccessAt(null);
  };

  const isLoading = tgLoading || discordLoading;

  const filtered = feed.filter((item) => {
    const matchSource = activeSource === "All" || item.source === activeSource;
    const matchTag    = activeTag === "All" || item.tag === activeTag;
    const matchSearch = !search || item.msg.toLowerCase().includes(search.toLowerCase()) || item.server.toLowerCase().includes(search.toLowerCase());
    return matchSource && matchTag && matchSearch;
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      {showModal && (
        <ConnectModal
          onClose={() => setShowModal(false)}
          onChannelTracked={handleChannelTracked}
          onTelegramConnected={handleTelegramConnected}
          discordAuth={discordAuth}
          initialTab={modalInitialTab}
        />
      )}

      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Feed Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Signal from your communities, filtered by AI</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="button-refresh" onClick={() => { fetchUserTgMessages(); fetchDiscordMessages(); }}
            className="w-9 h-9 bg-card border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
          <button data-testid="button-connect" onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 md:px-4 py-2 rounded-xl transition-colors">
            <Plus size={14} /> Connect
          </button>
        </div>
      </div>

      {/* Status banners */}
      {discordAuth && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-500/8 border border-green-500/20 rounded-xl">
          <Check size={13} className="text-green-400 shrink-0" />
          <span className="text-green-400 text-xs">
            Discord: <span className="font-medium">{discordAuth.user.displayName}</span>
            {trackedDiscordChannels.length > 0
              ? ` — ${trackedDiscordChannels.length} channel${trackedDiscordChannels.length > 1 ? "s" : ""} tracked`
              : " — click Connect to pick channels"}
          </span>
          <button onClick={() => { setDiscordAuth(null); setTrackedDiscordChannels([]); localStorage.removeItem(LS_DISCORD_AUTH); localStorage.removeItem(LS_DISCORD_CHANNELS); setConnectedSources((p) => p.filter((s) => s.source !== "Discord")); }}
            className="ml-auto text-muted-foreground/50 hover:text-muted-foreground transition-colors text-xs">
            Disconnect
          </button>
        </div>
      )}

      {tgSessionExpired && (
        <div data-testid="banner-tg-session-expired" className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <KeyRound size={13} className="text-amber-400 shrink-0" />
          <span className="text-amber-300 text-xs flex-1">
            Your Telegram session expired — please reconnect to resume reading your chats.
          </span>
          <button
            data-testid="button-tg-reconnect"
            onClick={() => { setModalInitialTab("telegram"); setShowModal(true); }}
            className="text-xs font-medium px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg transition-colors shrink-0">
            Reconnect
          </button>
          <button
            data-testid="button-tg-dismiss-expired"
            onClick={() => setTgSessionExpired(false)}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      {tgSession && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-cyan-500/8 border border-cyan-500/20 rounded-xl">
          <Check size={13} className="text-cyan-400 shrink-0" />
          <span className="text-cyan-400 text-xs">
            Telegram: reading as you
            {trackedTgChats.length > 0 && ` — ${trackedTgChats.length} chat${trackedTgChats.length > 1 ? "s" : ""}`}
          </span>
          <button onClick={disconnectTelegram}
            className="ml-auto text-muted-foreground/50 hover:text-muted-foreground transition-colors text-xs">
            Disconnect
          </button>
        </div>
      )}

      {connectedSources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
          {connectedSources.map((src) => {
            const isReconnecting = src.source === "Telegram" && tgLoading &&
              (lastTgSuccessAt === null || Date.now() - lastTgSuccessAt > RECONNECT_STALE_MS);
            return (
              <div key={src.name} data-testid={`card-source-${src.name.replace(/\s+/g, "-").toLowerCase()}`}
                className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isReconnecting ? "bg-amber-400" : "bg-green-400"}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isReconnecting ? "bg-amber-400" : "bg-green-400"}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs font-medium truncate">{src.name}</p>
                  <p className="text-muted-foreground/60 text-xs">{src.count}</p>
                </div>
                {isReconnecting ? (
                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 shrink-0">
                    <Loader2 size={10} className="animate-spin" /> Reconnecting...
                  </span>
                ) : (
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${src.source === "Discord" ? "bg-primary/15 text-primary" : "bg-cyan-500/15 text-cyan-400"}`}>
                    {src.source}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {connectedSources.length === 0 && !discordAuth && !tgSession && (
        <div className="mb-5 px-4 py-4 bg-card border border-dashed border-border rounded-xl text-center">
          <p className="text-muted-foreground text-sm">No sources connected yet.</p>
          <p className="text-muted-foreground/60 text-xs mt-0.5">Connect Discord or Telegram to see real signals — showing demo feed below.</p>
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
            <button data-testid="button-clear-filters" onClick={() => { setActiveSource("All"); setActiveTag("All"); setSearch(""); }}
              className="text-primary text-xs mt-1 hover:text-primary/80 transition-colors">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
