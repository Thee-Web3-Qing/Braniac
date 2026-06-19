import { useState, useRef, useEffect } from "react";
import { Wand2, Copy, Check, RefreshCw, ChevronDown, FileText, MessageSquare, Mic, Twitter, Users, TrendingUp, Clock, BarChart3, Cpu, Zap, Send, Bot, User, History, Trash2, Plus } from "lucide-react";
import { useGenerateDraft } from "@workspace/api-client-react";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { ExternalLink } from "lucide-react";

type ChatHistorySession = { id: string; ts: number; messages: ChatMessage[]; ogStatus?: string; ogExplorerUrl?: string };
type ContentHistorySession = { id: string; ts: number; typeId: string; typeLabel: string; topic: string; draft: string; ogStatus?: string; ogExplorerUrl?: string };
type CommunityHistorySession = { id: string; ts: number; question: string; insights: string; ogStatus?: string; ogExplorerUrl?: string };

const HIST_KEY = { chat: "brainiac:history:chat", content: "brainiac:history:content", community: "brainiac:history:community" } as const;

function loadHist<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
}
function saveHist<T extends { id: string; ts: number }>(key: string, item: T) {
  const list = loadHist<T>(key).filter((x) => x.id !== item.id);
  localStorage.setItem(key, JSON.stringify([item, ...list].slice(0, 30)));
}
function deleteHist(key: string, id: string) {
  localStorage.setItem(key, JSON.stringify(loadHist<{ id: string }>(key).filter((x) => x.id !== id)));
}
function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

async function ogSaveHistory<T extends { id: string; ogStatus?: string; ogExplorerUrl?: string }>(
  histKey: string,
  session: T,
  userId: string,
  type: "chat" | "content" | "community",
  preview: string,
  onUpdate: (sessions: T[]) => void,
) {
  try {
    const res = await fetch("/api/og/save-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type, sessionId: session.id, preview }),
    });
    const data = await res.json() as { record?: { txStatus?: string; explorerUrl?: string } };
    const updated: T = { ...session, ogStatus: data.record?.txStatus ?? "failed", ogExplorerUrl: data.record?.explorerUrl };
    saveHist(histKey, updated);
    onUpdate(loadHist<T>(histKey));
  } catch {
    const updated: T = { ...session, ogStatus: "failed" };
    saveHist(histKey, updated);
    onUpdate(loadHist<T>(histKey));
  }
}

function OGBadge({ status, explorerUrl }: { status?: string; explorerUrl?: string }) {
  if (!status) return null;
  const confirmed = status === "confirmed";
  const failed = status === "failed";
  const badge = (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
      confirmed ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      : failed ? "bg-red-500/10 border-red-500/20 text-red-400/60"
      : "bg-primary/10 border-primary/20 text-primary/70"
    }`}>
      <span className={`w-1 h-1 rounded-full ${confirmed ? "bg-emerald-400" : failed ? "bg-red-400/60" : "bg-primary/50 animate-pulse"}`} />
      0G {confirmed ? "saved" : failed ? "failed" : "recording..."}
    </span>
  );
  return confirmed && explorerUrl
    ? <a href={explorerUrl} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">{badge}</a>
    : badge;
}

function SectionToggle({ view, onChange, onNew }: { view: "active" | "history"; onChange: (v: "active" | "history") => void; onNew?: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5">
        {(["active", "history"] as const).map((v) => (
          <button key={v} onClick={() => onChange(v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {v === "history" && <History size={11} />}
            {v === "active" ? "Active" : "History"}
          </button>
        ))}
      </div>
      {view === "history" && onNew && (
        <button onClick={onNew}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors">
          <Plus size={11} /> New
        </button>
      )}
    </div>
  );
}

const DRAFT_TYPES = [
  { id: "thread",  label: "X Thread",        icon: Twitter,       desc: "Turn feed signals into a Twitter thread" },
  { id: "recap",   label: "Space Recap",      icon: Mic,           desc: "Summarize a Space you hosted" },
  { id: "update",  label: "Community Update", icon: MessageSquare, desc: "Weekly digest for your community" },
  { id: "brief",   label: "Alpha Brief",      icon: FileText,      desc: "Curated alpha report from your feed" },
];

const recentDrafts = [
  { id: 1, type: "X Thread",    title: "Alpha thread — June 17",         preview: "Biggest signals from Web3 this week that most people missed...", created: "2h ago" },
  { id: 2, type: "Space Recap", title: "Recap: DeFi 2025 with Bankless", preview: "Yesterday's Space with @bankless covered 3 key narratives shaping DeFi this summer...", created: "1d ago" },
  { id: 3, type: "Alpha Brief", title: "Weekly Alpha Brief #12",         preview: "This week: Base DEX launch, LayerZero snapshot, and whale moves to watch...", created: "3d ago" },
];

const COMMUNITY_QUESTIONS = [
  "When should I post for maximum engagement?",
  "What topics are my members most interested in?",
  "Which members are at risk of going inactive?",
  "How do I grow my community this month?",
  "What's been trending in my community this week?",
  "Build me a 30-day content calendar",
];

const connectedCommunities = [
  { name: "Bankless DAO",    source: "Discord" },
  { name: "Crypto Signals",  source: "Telegram" },
  { name: "Base Builders",   source: "Discord" },
  { name: "NFT Alpha",       source: "Telegram" },
];

const TOPIC_DATA = [
  { label: "DeFi yields",   pct: 34, color: "bg-primary" },
  { label: "NFT launches",  pct: 22, color: "bg-purple-500" },
  { label: "Price action",  pct: 18, color: "bg-yellow-500" },
  { label: "Protocol news", pct: 15, color: "bg-cyan-500" },
  { label: "Governance",    pct: 11, color: "bg-green-500" },
];

const PEAK_HOURS = [
  { hour: "6am",  level: 1 }, { hour: "8am",  level: 2 }, { hour: "10am", level: 3 },
  { hour: "12pm", level: 3 }, { hour: "2pm",  level: 5 }, { hour: "4pm",  level: 5 },
  { hour: "6pm",  level: 4 }, { hour: "8pm",  level: 5 }, { hour: "10pm", level: 4 },
  { hour: "12am", level: 2 }, { hour: "2am",  level: 1 }, { hour: "4am",  level: 1 },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button data-testid="button-copy-draft"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <><Check size={12} className="text-green-400" /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

function ContentBrain() {
  const { user } = usePrivy();
  const [view, setView] = useState<"active" | "history">("active");
  const [histSessions, setHistSessions] = useState<ContentHistorySession[]>(() => loadHist<ContentHistorySession>(HIST_KEY.content));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState(DRAFT_TYPES[0]);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useGenerateDraft({
    mutation: {
      onSuccess: (data) => {
        setDraft(data.content);
        setError(null);
        const session: ContentHistorySession = {
          id: `content-${Date.now()}`,
          ts: Date.now(),
          typeId: selectedType.id,
          typeLabel: selectedType.label,
          topic: prompt,
          draft: data.content,
        };
        saveHist(HIST_KEY.content, session);
        setHistSessions(loadHist<ContentHistorySession>(HIST_KEY.content));
        if (user?.id) ogSaveHistory(HIST_KEY.content, session, user.id, "content", prompt, setHistSessions);
      },
      onError: () => { setError("Something went wrong. Try again in a moment."); setDraft(null); },
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setDraft(null); setError(null);
    generateMutation.mutate({ data: { type: selectedType.id as "thread" | "recap" | "update" | "brief", topic: prompt, feedContext: null } });
  };

  const TypeIcon = selectedType.icon;

  if (view === "history") {
    return (
      <div>
        <SectionToggle view={view} onChange={setView} onNew={() => { setDraft(null); setPrompt(""); setView("active"); }} />
        {histSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <History size={28} className="text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No drafts yet. Generate one to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {histSessions.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">{s.typeLabel}</span>
                  <p className="text-foreground text-xs font-medium flex-1 truncate">{s.topic}</p>
                  <OGBadge status={s.ogStatus} explorerUrl={s.ogExplorerUrl} />
                  <span className="text-muted-foreground/50 text-xs shrink-0">{timeAgo(s.ts)}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteHist(HIST_KEY.content, s.id); setHistSessions(loadHist<ContentHistorySession>(HIST_KEY.content)); }}
                    className="text-muted-foreground/30 hover:text-red-400 transition-colors shrink-0 ml-1">
                    <Trash2 size={12} />
                  </button>
                </div>
                {expandedId === s.id && (
                  <div className="border-t border-border px-4 py-3">
                    <div className="flex justify-end mb-2"><CopyBtn text={s.draft} /></div>
                    <pre className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">{s.draft}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 md:gap-5">
      <div className="md:col-span-2 space-y-4">
        <SectionToggle view={view} onChange={setView} />
        {/* Type picker */}
        <div className="relative">
          <button data-testid="button-type-selector" onClick={() => setShowTypeMenu(!showTypeMenu)}
            className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 text-left hover:border-border/80 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <TypeIcon size={16} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">{selectedType.label}</p>
                <p className="text-muted-foreground text-xs truncate">{selectedType.desc}</p>
              </div>
            </div>
            <ChevronDown size={15} className={`text-muted-foreground transition-transform shrink-0 ml-2 ${showTypeMenu ? "rotate-180" : ""}`} />
          </button>
          {showTypeMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden z-10 animate-slide-up shadow-xl">
              {DRAFT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button key={type.id} data-testid={`button-type-${type.id}`}
                    onClick={() => { setSelectedType(type); setShowTypeMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${type.id === selectedType.id ? "bg-primary/10" : ""}`}>
                    <Icon size={14} className="text-primary shrink-0" />
                    <div>
                      <p className="text-foreground text-sm">{type.label}</p>
                      <p className="text-muted-foreground text-xs">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Prompt input */}
        <div className="bg-card border border-border rounded-xl overflow-hidden focus-within:border-primary/40 transition-colors">
          <textarea data-testid="input-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={`What should this ${selectedType.label} cover?`}
            className="w-full bg-transparent px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none resize-none min-h-[96px] leading-relaxed"
            rows={4} />
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border gap-2">
            <p className="text-muted-foreground/50 text-xs hidden sm:block">Uses your connected feed as context</p>
            <button data-testid="button-generate" onClick={handleGenerate}
              disabled={generateMutation.isPending || !prompt.trim()}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors ml-auto shrink-0">
              {generateMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
              {generateMutation.isPending ? "Writing..." : "Generate"}
            </button>
          </div>
        </div>

        {error && !generateMutation.isPending && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button data-testid="button-retry" onClick={handleGenerate} className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors underline">Try again</button>
          </div>
        )}

        {generateMutation.isPending && (
          <div className="bg-card border border-border rounded-xl p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground text-sm">Writing your draft...</span>
            </div>
            <div className="space-y-2">
              {[80, 60, 90, 50, 70].map((w, i) => (
                <div key={i} className="h-3 bg-background rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}

        {draft && !generateMutation.isPending && (
          <div className="bg-card border border-primary/20 rounded-xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-foreground text-sm font-medium">Draft ready</span>
                <span className="text-muted-foreground text-xs hidden sm:inline">· {selectedType.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <CopyBtn text={draft} />
                <button data-testid="button-regenerate" onClick={handleGenerate}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>
            </div>
            <div className="p-4">
              <pre data-testid="text-draft-content" className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">{draft}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Recent drafts sidebar */}
      <div>
        <h2 className="font-display font-semibold text-foreground text-sm mb-3">Recent drafts</h2>
        <div className="space-y-2">
          {recentDrafts.map((d) => (
            <div key={d.id} data-testid={`card-draft-${d.id}`}
              className="bg-card border border-border hover:border-border/80 rounded-xl p-3.5 cursor-pointer transition-all">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">{d.type}</span>
                <span className="text-muted-foreground/50 text-xs ml-auto shrink-0">{d.created}</span>
              </div>
              <p className="text-foreground text-xs font-medium mb-1 leading-snug">{d.title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{d.preview}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-primary/5 border border-primary/15 rounded-xl p-4">
          <p className="text-primary text-xs font-medium mb-1.5">Sharper drafts</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Connect more communities for richer context. The more feed Brainiac has, the more on-point your drafts get.
          </p>
        </div>
      </div>
    </div>
  );
}

function CommunityIntel() {
  const { user } = usePrivy();
  const [view, setView] = useState<"active" | "history">("active");
  const [histSessions, setHistSessions] = useState<CommunityHistorySession[]>(() => loadHist<CommunityHistorySession>(HIST_KEY.community));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    setInsights(null); setError(null); setLoading(true);
    try {
      const res = await fetch("/api/brain/community-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, communities: connectedCommunities }),
      });
      const data = await res.json() as { insights?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error);
      const result = data.insights ?? "";
      setInsights(result);
      if (result) {
        const session: CommunityHistorySession = { id: `community-${Date.now()}`, ts: Date.now(), question: q, insights: result };
        saveHist(HIST_KEY.community, session);
        setHistSessions(loadHist<CommunityHistorySession>(HIST_KEY.community));
        if (user?.id) ogSaveHistory(HIST_KEY.community, session, user.id, "community", q, setHistSessions);
      }
    } catch {
      setError("Could not generate insights. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (view === "history") {
    return (
      <div>
        <SectionToggle view={view} onChange={setView} onNew={() => { setInsights(null); setQuery(""); setView("active"); }} />
        {histSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <History size={28} className="text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No community intel yet. Ask a question to see it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {histSessions.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                  onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <Users size={12} className="text-primary shrink-0" />
                  <p className="text-foreground text-xs font-medium flex-1 truncate">{s.question}</p>
                  <OGBadge status={s.ogStatus} explorerUrl={s.ogExplorerUrl} />
                  <span className="text-muted-foreground/50 text-xs shrink-0">{timeAgo(s.ts)}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteHist(HIST_KEY.community, s.id); setHistSessions(loadHist<CommunityHistorySession>(HIST_KEY.community)); }}
                    className="text-muted-foreground/30 hover:text-red-400 transition-colors shrink-0 ml-1">
                    <Trash2 size={12} />
                  </button>
                </div>
                {expandedId === s.id && (
                  <div className="border-t border-border px-4 py-3">
                    <pre className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">{s.insights}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-4 md:gap-5">
      {/* Left: metrics + Q&A */}
      <div className="md:col-span-2 space-y-4">

        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { icon: Users,      label: "Active members",   value: "23%",     sub: "post weekly",        color: "text-primary" },
            { icon: Clock,      label: "Peak window",      value: "2-6PM",   sub: "UTC weekdays",       color: "text-cyan-400" },
            { icon: TrendingUp, label: "Member growth",    value: "+23%",    sub: "last 30 days",       color: "text-green-400" },
            { icon: Zap,        label: "Avg messages/day", value: "847",     sub: "peaks at 2,100+",    color: "text-yellow-400" },
            { icon: BarChart3,  label: "Top channel",      value: "#alpha",  sub: "+34% this week",     color: "text-purple-400" },
            { icon: Cpu,        label: "At-risk members",  value: "41%",     sub: "silent 14+ days",    color: "text-red-400" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={13} className={m.color} />
                  <span className="text-muted-foreground text-xs truncate">{m.label}</span>
                </div>
                <p className={`font-display font-bold text-lg ${m.color}`}>{m.value}</p>
                <p className="text-muted-foreground/60 text-xs mt-0.5">{m.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Topic breakdown */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground text-xs font-semibold mb-3">What your community talks about</p>
          <div className="space-y-2.5">
            {TOPIC_DATA.map((t) => (
              <div key={t.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground text-xs">{t.label}</span>
                  <span className="text-foreground text-xs font-medium">{t.pct}%</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${t.color} transition-all`} style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity heatmap (simplified) */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground text-xs font-semibold mb-3">Activity by time of day (UTC)</p>
          <div className="flex items-end gap-1.5 h-12">
            {PEAK_HOURS.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-sm bg-primary/20 transition-all"
                  style={{ height: `${(h.level / 5) * 100}%`, backgroundColor: `rgba(99,102,241,${h.level * 0.15})` }} />
                <span className="text-muted-foreground/40 text-[9px] leading-none whitespace-nowrap hidden sm:inline">{h.hour}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground/50 text-xs mt-2">Best time to post: <span className="text-foreground">2PM, 4PM, 8PM UTC</span></p>
        </div>

        {/* Quick questions */}
        <div>
          <p className="text-muted-foreground text-xs mb-2">Ask about your community</p>
          <div className="flex flex-wrap gap-1.5">
            {COMMUNITY_QUESTIONS.map((q) => (
              <button key={q} onClick={() => { setQuery(q); ask(q); }}
                className="text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground px-2.5 py-1 rounded-full transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Free text */}
        <div className="relative">
          <textarea rows={2} value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (query.trim()) ask(query); } }}
            placeholder='e.g. "What should I post this week to re-engage inactive members?"'
            className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-24 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none" />
          <button onClick={() => { if (query.trim()) ask(query); }} disabled={loading || !query.trim()}
            className="absolute right-3 bottom-3 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
            {loading ? <RefreshCw size={11} className="animate-spin" /> : <Cpu size={11} />}
            {loading ? "..." : "Analyze"}
          </button>
        </div>

        {loading && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground text-xs">Reading your community patterns...</span>
            </div>
            <div className="space-y-2">
              {[75, 55, 90, 45, 70].map((w, i) => (
                <div key={i} className="h-2 bg-border rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}

        {error && !loading && <p className="text-red-400 text-xs">{error}</p>}

        {insights && !loading && (
          <div className="bg-card border border-border rounded-xl p-4">
            <pre className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap font-sans">{insights}</pre>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-semibold text-foreground text-sm mb-3">Connected communities</h3>
          <div className="space-y-2">
            {connectedCommunities.map((c) => (
              <div key={c.name} className="flex items-center gap-2.5">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                </span>
                <span className="text-foreground text-xs flex-1 truncate">{c.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${c.source === "Discord" ? "bg-primary/10 text-primary" : "bg-cyan-500/10 text-cyan-400"}`}>
                  {c.source}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-display font-semibold text-foreground text-sm mb-2">Quick wins</h3>
          <ul className="space-y-2">
            {[
              "Post alpha drops between 2-4PM UTC",
              "Re-engage the 41% silent members with a poll",
              "DeFi content drives 34% of all engagement",
              "#alpha-calls is your fastest growing channel",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary shrink-0 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

type ChatMessage = { role: "user" | "assistant"; content: string; ogRecordId?: string | null; ogStatus?: string | null };

const CHAT_STARTERS = [
  "What's the biggest alpha in my feed right now?",
  "Should I be worried about anything on-chain?",
  "Summarize what happened in my communities today",
  "What DeFi opportunities should I look at?",
  "Help me write a tweet about what I'm seeing",
];

function BrainChat() {
  const { wallets } = useWallets();
  const { user } = usePrivy();
  const [view, setView] = useState<"active" | "history">("active");
  const [histSessions, setHistSessions] = useState<ChatHistorySession[]>(() => loadHist<ChatHistorySession>(HIST_KEY.chat));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(`chat-${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getContext = () => {
    const walletContext = wallets.length
      ? wallets.map((w) => `- ${w.address} (${w.chainId ?? "EVM"})`).join("\n")
      : "";
    const tgChats = localStorage.getItem("brainiac:tg_chats");
    const discordData = localStorage.getItem("brainiac:discord_auth");
    const parts: string[] = [];
    if (tgChats) {
      try {
        const chats = JSON.parse(tgChats) as Array<{ title?: string }>;
        if (chats.length) parts.push(`Telegram: ${chats.map((c) => c.title).filter(Boolean).join(", ")}`);
      } catch { /* ignore */ }
    }
    if (discordData) {
      try {
        const d = JSON.parse(discordData) as { username?: string };
        if (d.username) parts.push(`Discord: connected as ${d.username}`);
      } catch { /* ignore */ }
    }
    return { walletContext, feedContext: parts.join("\n") };
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setLoading(true);
    try {
      const { walletContext, feedContext } = getContext();
      const res = await fetch("/api/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, walletContext, feedContext, userId: user?.id }),
      });
      const data = (await res.json()) as { reply?: string; error?: string; ogRecordId?: string | null; ogStatus?: string | null };
      if (!res.ok || data.error) throw new Error(data.error ?? "Unknown error");
      const finalMessages: ChatMessage[] = [...next, { role: "assistant", content: data.reply!, ogRecordId: data.ogRecordId, ogStatus: data.ogStatus }];
      setMessages(finalMessages);
      const session: ChatHistorySession = { id: sessionIdRef.current, ts: Date.now(), messages: finalMessages };
      saveHist(HIST_KEY.chat, session);
      setHistSessions(loadHist<ChatHistorySession>(HIST_KEY.chat));
      const firstMsg = finalMessages.find((m) => m.role === "user")?.content ?? "";
      if (user?.id) ogSaveHistory(HIST_KEY.chat, session, user.id, "chat", firstMsg, setHistSessions);
    } catch {
      setError("Could not reach Brainiac. Try again.");
      setMessages(next.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    sessionIdRef.current = `chat-${Date.now()}`;
    setView("active");
  };

  if (view === "history") {
    return (
      <div>
        <SectionToggle view={view} onChange={setView} onNew={startNewChat} />
        {histSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <History size={28} className="text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No conversations yet. Start chatting to see history here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {histSessions.map((s) => {
              const firstUser = s.messages.find((m) => m.role === "user")?.content ?? "Conversation";
              const msgCount = s.messages.length;
              return (
                <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                    <MessageSquare size={12} className="text-primary shrink-0" />
                    <p className="text-foreground text-xs font-medium flex-1 truncate">{firstUser}</p>
                    <OGBadge status={s.ogStatus} explorerUrl={s.ogExplorerUrl} />
                    <span className="text-muted-foreground/40 text-xs shrink-0">{msgCount} msg{msgCount !== 1 ? "s" : ""}</span>
                    <span className="text-muted-foreground/50 text-xs shrink-0 ml-2">{timeAgo(s.ts)}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteHist(HIST_KEY.chat, s.id); setHistSessions(loadHist<ChatHistorySession>(HIST_KEY.chat)); }}
                      className="text-muted-foreground/30 hover:text-red-400 transition-colors shrink-0 ml-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {expandedId === s.id && (
                    <div className="border-t border-border px-4 py-3 space-y-2.5 max-h-80 overflow-y-auto">
                      {s.messages.map((m, i) => (
                        <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                            m.role === "user" ? "bg-primary/15 text-foreground" : "bg-background text-muted-foreground"
                          }`}>
                            <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] max-h-[700px] min-h-[400px]">
      <SectionToggle view={view} onChange={setView} />
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-foreground font-medium text-sm mb-1">Ask Brainiac anything</p>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
                Your Web3 intelligence assistant. Ask about your feed, wallets, communities, or anything in the space.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {CHAT_STARTERS.map((q) => (
                <button key={q} onClick={() => send(q)}
                  className="text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground px-3 py-1.5 rounded-full transition-colors text-left">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              m.role === "user" ? "bg-primary/20" : "bg-card border border-border"
            }`}>
              {m.role === "user"
                ? <User size={12} className="text-primary" />
                : <Bot size={12} className="text-muted-foreground" />}
            </div>
            <div className="max-w-[80%] flex flex-col gap-1">
              <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border border-border text-foreground rounded-tl-sm"
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
              {m.role === "assistant" && m.ogRecordId && (
                <div className="flex items-center gap-1.5 px-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                    m.ogStatus === "confirmed"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : m.ogStatus === "no_funds"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-primary/10 border-primary/20 text-primary/70"
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${m.ogStatus === "confirmed" ? "bg-emerald-400" : "bg-primary/50 animate-pulse"}`} />
                    0G {m.ogStatus === "confirmed" ? "recorded" : m.ogStatus === "no_funds" ? "no funds" : "recording..."}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 flex-row">
            <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={12} className="text-muted-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-border mt-2">
        <div className="flex gap-2 items-end bg-card border border-border rounded-xl overflow-hidden focus-within:border-primary/40 transition-colors px-3 py-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder="Ask Brainiac..."
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none resize-none leading-relaxed py-0.5"
            style={{ maxHeight: "120px" }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="shrink-0 w-7 h-7 rounded-lg bg-primary disabled:opacity-30 hover:bg-primary/90 transition-colors flex items-center justify-center">
            <Send size={13} className="text-primary-foreground" />
          </button>
        </div>
        <p className="text-muted-foreground/40 text-xs mt-1.5 text-center">Shift + Enter for new line</p>
        {user?.id && (
          <p className="text-muted-foreground/30 text-[10px] mt-1 text-center flex items-center justify-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary/40 inline-block" />
            AI responses recorded on 0G Newton Testnet
          </p>
        )}
      </div>
    </div>
  );
}

const TOP_TABS = [
  { id: "chat",      label: "Chat",             icon: MessageSquare },
  { id: "content",   label: "Content Brain",    icon: Wand2 },
  { id: "community", label: "Community Intel",  icon: Users },
] as const;

type TopTab = typeof TOP_TABS[number]["id"];

export default function BrainPage() {
  const [activeTab, setActiveTab] = useState<TopTab>("chat");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-5 md:mb-6">
        <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Create</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Turn what you've been tracking into content, when you're ready to share it</p>
      </div>

      {/* Top tab switcher */}
      <div className="flex gap-1 mb-5 md:mb-6 bg-card border border-border rounded-xl p-1 w-full sm:w-auto sm:inline-flex">
        {TOP_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} data-testid={`button-section-${id}`}
            onClick={() => setActiveTab(id)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "chat"      && <BrainChat />}
      {activeTab === "content"   && <ContentBrain />}
      {activeTab === "community" && <CommunityIntel />}
    </div>
  );
}
