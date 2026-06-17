import { useState } from "react";
import { Wand2, Copy, Check, RefreshCw, ChevronDown, FileText, MessageSquare, Mic } from "lucide-react";
import { useGenerateDraft } from "@workspace/api-client-react";
import { Twitter } from "lucide-react";

const DRAFT_TYPES = [
  { id: "thread", label: "X Thread", icon: Twitter, desc: "Turn feed signals into a Twitter thread" },
  { id: "recap", label: "Space Recap", icon: Mic, desc: "Summarize a Space you hosted" },
  { id: "update", label: "Community Update", icon: MessageSquare, desc: "Weekly digest for your community" },
  { id: "brief", label: "Alpha Brief", icon: FileText, desc: "Curated alpha report from your feed" },
];

const mockDrafts = [
  { id: 1, type: "X Thread", title: "Alpha thread — June 17", preview: "Biggest signals from Web3 this week that most people missed...", created: "2h ago" },
  { id: 2, type: "Space Recap", title: "Recap: DeFi 2025 with Bankless", preview: "Yesterday's Space with @bankless covered 3 key narratives shaping DeFi this summer...", created: "1d ago" },
  { id: 3, type: "Alpha Brief", title: "Weekly Alpha Brief #12", preview: "This week: Base DEX launch, LayerZero snapshot, and whale moves to watch...", created: "3d ago" },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      data-testid="button-copy-draft"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <><Check size={12} className="text-green-400" /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

export default function BrainPage() {
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
      },
      onError: () => {
        setError("Failed to connect to AI service. Please check your QWEN_API_KEY and try again.");
        setDraft(null);
      },
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setDraft(null);
    setError(null);
    generateMutation.mutate({
      data: {
        type: selectedType.id as "thread" | "recap" | "update" | "brief",
        topic: prompt,
        feedContext: null,
      },
    });
  };

  const TypeIcon = selectedType.icon;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-foreground text-2xl">Content Brain</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Turn your feed into content that hits</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Generator — left 2/3 */}
        <div className="md:col-span-2 space-y-4">
          {/* Type selector */}
          <div className="relative">
            <button
              data-testid="button-type-selector"
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-border/80"
            >
              <div className="flex items-center gap-3">
                <TypeIcon size={16} className="text-primary" />
                <div>
                  <p className="text-foreground text-sm font-medium">{selectedType.label}</p>
                  <p className="text-muted-foreground text-xs">{selectedType.desc}</p>
                </div>
              </div>
              <ChevronDown size={15} className={`text-muted-foreground transition-transform ${showTypeMenu ? "rotate-180" : ""}`} />
            </button>

            {showTypeMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden z-10 animate-slide-up">
                {DRAFT_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      data-testid={`button-type-${type.id}`}
                      onClick={() => { setSelectedType(type); setShowTypeMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${type.id === selectedType.id ? "bg-primary/10" : ""}`}
                    >
                      <Icon size={14} className="text-primary" />
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

          {/* Prompt textarea */}
          <div className="bg-card border border-border rounded-xl overflow-hidden focus-within:border-primary/40 transition-colors">
            <textarea
              data-testid="input-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`What should this ${selectedType.label} be about? e.g. "The Base DEX launch and what it means for LPs"`}
              className="w-full bg-transparent px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none resize-none min-h-[100px] leading-relaxed"
              rows={4}
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <p className="text-muted-foreground/50 text-xs">AI will use your connected feed as context</p>
              <button
                data-testid="button-generate"
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !prompt.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {generateMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />}
                {generateMutation.isPending ? "Writing..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Error state */}
          {error && !generateMutation.isPending && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                data-testid="button-retry"
                onClick={handleGenerate}
                className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {generateMutation.isPending && (
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-muted-foreground text-sm">Brainiac is writing...</span>
              </div>
              <div className="space-y-2">
                {[80, 60, 90, 50, 70].map((w, i) => (
                  <div key={i} className="h-3 bg-background rounded animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}

          {/* Draft output */}
          {draft && !generateMutation.isPending && (
            <div className="bg-card border border-primary/20 rounded-xl overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-foreground text-sm font-medium">Draft ready</span>
                  <span className="text-muted-foreground text-xs">· {selectedType.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CopyBtn text={draft} />
                  <button
                    data-testid="button-regenerate"
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
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

        {/* Saved drafts — right 1/3 */}
        <div>
          <h2 className="font-display font-semibold text-foreground text-sm mb-3">Recent drafts</h2>
          <div className="space-y-2">
            {mockDrafts.map((d) => (
              <div
                key={d.id}
                data-testid={`card-draft-${d.id}`}
                className="bg-card border border-border hover:border-border/80 rounded-xl p-3.5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">{d.type}</span>
                  <span className="text-muted-foreground/50 text-xs ml-auto">{d.created}</span>
                </div>
                <p className="text-foreground text-xs font-medium mb-1 leading-snug">{d.title}</p>
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{d.preview}</p>
              </div>
            ))}
          </div>

          {/* Pro tip */}
          <div className="mt-4 bg-primary/5 border border-primary/15 rounded-xl p-4">
            <p className="text-primary text-xs font-medium mb-2">Pro tip</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Connect more communities for richer context. The more feed Brainiac has, the better your drafts get.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
