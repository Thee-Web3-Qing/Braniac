import { useState, useRef, useEffect } from "react";
import { Plus, ExternalLink, TrendingUp, TrendingDown, X, Copy, Check, Pencil } from "lucide-react";

type Wallet = {
  id: number;
  address: string;
  label: string;
  chain: string;
  pnl: string;
  positive: boolean;
  projects: Array<{ name: string; type: string; status: string; value: string; date: string }>;
};

const initialWallets: Wallet[] = [
  {
    id: 1,
    address: "0x7f3a9c8d2e1b4f56789ab0c3d4e5f6789e2b",
    label: "Main Wallet",
    chain: "Ethereum",
    pnl: "+$2,340",
    positive: true,
    projects: [
      { name: "Uniswap",          type: "DeFi",    status: "active",  value: "$1,200", date: "Mar 2024" },
      { name: "Pudgy Penguins",   type: "NFT",     status: "active",  value: "$3,400", date: "Jan 2024" },
      { name: "Blur",             type: "DeFi",    status: "active",  value: "$340",   date: "Feb 2024" },
      { name: "LayerZero",        type: "Airdrop", status: "pending", value: "TBD",    date: "Apr 2024" },
      { name: "Arbitrum",         type: "Airdrop", status: "claimed", value: "$890",   date: "Mar 2023" },
      { name: "Base",             type: "DeFi",    status: "active",  value: "$220",   date: "Jun 2024" },
    ],
  },
  {
    id: 2,
    address: "0xc91d4b7a2e9f3c8d1b5e6f7a8b9c0d1e4f7a",
    label: "Trading Wallet",
    chain: "Base",
    pnl: "-$180",
    positive: false,
    projects: [
      { name: "Aerodrome", type: "DeFi", status: "active", value: "$450", date: "May 2024" },
      { name: "Camelot",   type: "DeFi", status: "active", value: "$320", date: "Apr 2024" },
      { name: "Base Dawgz", type: "NFT", status: "active", value: "$89",  date: "Jun 2024" },
    ],
  },
];

const STATUS_STYLES: Record<string, string> = {
  active:  "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  claimed: "bg-muted text-muted-foreground",
};
const TYPE_STYLES: Record<string, string> = {
  DeFi:    "bg-primary/10 text-primary",
  NFT:     "bg-purple-500/10 text-purple-400",
  Airdrop: "bg-cyan-500/10 text-cyan-400",
};

const explorerUrl = (chain: string, address: string) => {
  const base =
    chain === "Ethereum" ? "https://etherscan.io"
    : chain === "Base"   ? "https://basescan.org"
    : chain === "Arbitrum" ? "https://arbiscan.io"
    : "https://etherscan.io";
  return `${base}/address/${address}`;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button data-testid="button-copy-address" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

function InlineRename({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const commit = () => { if (draft.trim()) onSave(draft.trim()); };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onSave(value); }}
      className="bg-background border border-primary/50 rounded-lg px-2 py-0.5 text-foreground text-base md:text-lg font-display font-bold focus:outline-none w-40 md:w-52"
    />
  );
}

function AddWalletModal({ onClose, onAdd }: { onClose: () => void; onAdd: (label: string, address: string, chain: string) => void }) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("Ethereum");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Add wallet</h3>
          <button data-testid="button-close-modal" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-muted-foreground text-xs block mb-2">Wallet address</label>
            <input data-testid="input-wallet-address" type="text" placeholder="0x..." value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs block mb-2">Give it a name</label>
            <input data-testid="input-wallet-label" type="text" placeholder="e.g. SAFELOCK, Airdrop Hunter, Main" value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs block mb-2">Chain</label>
            <select data-testid="select-chain" value={chain} onChange={(e) => setChain(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none">
              <option>Ethereum</option>
              <option>Base</option>
              <option>Arbitrum</option>
              <option>Solana</option>
              <option>Polygon</option>
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

export default function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>(initialWallets);
  const [showModal, setShowModal] = useState(false);
  const [activeWallet, setActiveWallet] = useState(initialWallets[0].id);
  const [renamingId, setRenamingId] = useState<number | null>(null);

  const wallet = wallets.find((w) => w.id === activeWallet)!;
  const short = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

  const renameWallet = (id: number, newLabel: string) => {
    setWallets((prev) => prev.map((w) => w.id === id ? { ...w, label: newLabel } : w));
    setRenamingId(null);
  };

  const addWallet = (label: string, address: string, chain: string) => {
    const newId = Math.max(...wallets.map((w) => w.id)) + 1;
    setWallets((prev) => [...prev, { id: newId, address, label, chain, pnl: "$0", positive: true, projects: [] }]);
    setActiveWallet(newId);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-fade-in">
      {showModal && <AddWalletModal onClose={() => setShowModal(false)} onAdd={addWallet} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Wallet Memory</h1>
          <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Your on-chain history, made readable</p>
        </div>
        <button data-testid="button-add-wallet" onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-3 md:px-4 py-2 rounded-xl transition-colors">
          <Plus size={14} />
          <span className="hidden sm:inline">Add wallet</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Wallet tabs */}
      <div className="flex items-center gap-2 mb-5 md:mb-6 overflow-x-auto scrollbar-none pb-0.5">
        {wallets.map((w) => (
          <button key={w.id} data-testid={`button-wallet-tab-${w.id}`} onClick={() => setActiveWallet(w.id)}
            className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 rounded-xl border text-sm transition-all shrink-0 ${
              activeWallet === w.id ? "bg-primary/15 border-primary/40 text-foreground" : "bg-card border-border text-muted-foreground hover:border-border/80"
            }`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${w.positive ? "bg-green-400" : "bg-red-400"}`} />
            <span className="font-medium">{w.label}</span>
            <span className="font-mono text-xs text-muted-foreground/60 hidden sm:inline">{short(w.address)}</span>
          </button>
        ))}
        <button data-testid="button-add-wallet-tab" onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border/80 text-sm transition-all shrink-0">
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Wallet summary */}
      <div className="bg-card rounded-2xl border border-border p-4 md:p-5 mb-4 md:mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            {/* Inline rename on wallet name */}
            <div className="flex items-center gap-2 group/rename">
              {renamingId === wallet.id ? (
                <InlineRename value={wallet.label} onSave={(v) => renameWallet(wallet.id, v)} />
              ) : (
                <>
                  <p className="font-display font-bold text-foreground text-base md:text-lg">{wallet.label}</p>
                  <button
                    data-testid="button-rename-wallet"
                    onClick={() => setRenamingId(wallet.id)}
                    className="text-muted-foreground/30 hover:text-muted-foreground transition-colors opacity-0 group-hover/rename:opacity-100"
                    title="Rename wallet"
                  >
                    <Pencil size={13} />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground/60 text-xs font-mono">{short(wallet.address)}</span>
              <CopyButton text={wallet.address} />
              <a href={explorerUrl(wallet.chain, wallet.address)} target="_blank" rel="noopener noreferrer"
                data-testid="link-etherscan" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
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
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {[
            { label: "Chain",    value: wallet.chain },
            { label: "Projects", value: wallet.projects.length },
            { label: "Active",   value: wallet.projects.filter((p) => p.status === "active").length },
          ].map((s) => (
            <div key={s.label} data-testid={`stat-wallet-${s.label.toLowerCase()}`} className="bg-background rounded-xl px-3 py-2.5">
              <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
              <p className="text-foreground font-display font-semibold text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-4 md:px-5 py-3.5 md:py-4 border-b border-border">
          <h2 className="font-display font-semibold text-foreground text-sm">Projects interacted with</h2>
        </div>
        {wallet.projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No projects tracked yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {wallet.projects.map((p, i) => (
              <div key={i} data-testid={`row-project-${p.name.toLowerCase()}`}
                className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border border-border">
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">{p.name}</p>
                  <p className="text-muted-foreground/50 text-xs">{p.date}</p>
                </div>
                <span className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-md shrink-0 ${TYPE_STYLES[p.type] || "bg-muted text-muted-foreground"}`}>
                  {p.type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md shrink-0 ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                <span className="text-foreground text-sm font-medium shrink-0 text-right min-w-[3rem]">{p.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
