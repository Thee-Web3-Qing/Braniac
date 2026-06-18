import { useState } from "react";
import { Wand2, Copy, Check, RefreshCw, ChevronDown, FileText, MessageSquare, Mic, Twitter, Users, TrendingUp, Clock, BarChart3, Cpu, Zap } from "lucide-react";
import { useGenerateDraft } from "@workspace/api-client-react";

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
  const [selectedType, setSelectedType] = useState(DRAFT_TYPES[0]);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useGenerateDraft({
    mutation: {
      onSuccess: (data) => { setDraft(data.content); setError(null); },
      onError: () => { setError("Something went wrong. Try again in a moment."); setDraft(null); },
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setDraft(null); setError(null);
    generateMutation.mutate({ data: { type: selectedType.id as "thread" | "recap" | "update" | "brief", topic: prompt, feedContext: null } });
  };

  const TypeIcon = selectedType.icon;

  return (
    <div className="grid md:grid-cols-3 gap-4 md:gap-5">
      <div className="md:col-span-2 space-y-4">
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
      setInsights(data.insights ?? null);
    } catch {
      setError("Could not generate insights. Try again.");
    } finally {
      setLoading(false);
    }
  };

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

const TOP_TABS = [
  { id: "content",   label: "Content Brain",    icon: Wand2 },
  { id: "community", label: "Community Intel",  icon: Users },
] as const;

type TopTab = typeof TOP_TABS[number]["id"];

export default function BrainPage() {
  const [activeTab, setActiveTab] = useState<TopTab>("content");

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

      {activeTab === "content"   && <ContentBrain />}
      {activeTab === "community" && <CommunityIntel />}
    </div>
  );
}
