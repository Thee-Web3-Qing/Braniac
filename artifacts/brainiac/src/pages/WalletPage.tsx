import { useState } from "react";
import { Plus, ExternalLink, TrendingUp, TrendingDown, X, Copy, Check } from "lucide-react";

const mockWallets = [
  {
    id: 1,
    address: "0x7f3a9c8d2e1b4f56789ab0c3d4e5f6789e2b",
    label: "Main Wallet",
    chain: "Ethereum",
    pnl: "+$2,340",
    positive: true,
    projects: [
      { name: "Uniswap", type: "DeFi", status: "active", value: "$1,200", date: "Mar 2024" },
      { name: "Pudgy Penguins", type: "NFT", status: "active", value: "$3,400", date: "Jan 2024" },
      { name: "Blur", type: "DeFi", status: "active", value: "$340", date: "Feb 2024" },
      { name: "LayerZero", type: "Airdrop", status: "pending", value: "TBD", date: "Apr 2024" },
      { name: "Arbitrum", type: "Airdrop", status: "claimed", value: "$890", date: "Mar 2023" },
      { name: "Base", type: "DeFi", status: "active", value: "$220", date: "Jun 2024" },
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
      { name: "Camelot", type: "DeFi", status: "active", value: "$320", date: "Apr 2024" },
      { name: "Base Dawgz", type: "NFT", status: "active", value: "$89", date: "Jun 2024" },
    ],
  },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  claimed: "bg-muted text-muted-foreground",
};

const TYPE_STYLES: Record<string, string> = {
  DeFi: "bg-primary/10 text-primary",
  NFT: "bg-purple-500/10 text-purple-400",
  Airdrop: "bg-cyan-500/10 text-cyan-400",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button data-testid="button-copy-address" onClick={copy} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

function AddWalletModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Add wallet</h3>
          <button data-testid="button-close-modal" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-muted-foreground text-xs block mb-2">Wallet address</label>
            <input
              data-testid="input-wallet-address"
              type="text"
              placeholder="0x..."
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs block mb-2">Label (optional)</label>
            <input
              data-testid="input-wallet-label"
              type="text"
              placeholder="e.g. Main Wallet, Trading, Airdrop"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-muted-foreground text-xs block mb-2">Chain</label>
            <select
              data-testid="select-chain"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none"
            >
              <option>Ethereum</option>
              <option>Base</option>
              <option>Arbitrum</option>
              <option>Solana</option>
              <option>Polygon</option>
            </select>
          </div>
          <button
            data-testid="button-track-wallet"
            onClick={onClose}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
          >
            Track wallet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const [showModal, setShowModal] = useState(false);
  const [activeWallet, setActiveWallet] = useState(mockWallets[0].id);
  const wallet = mockWallets.find((w) => w.id === activeWallet)!;
  const short = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {showModal && <AddWalletModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-foreground text-2xl">Wallet Memory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your on-chain history, made readable</p>
        </div>
        <button
          data-testid="button-add-wallet"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={14} /> Add wallet
        </button>
      </div>

      {/* Wallet tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {mockWallets.map((w) => (
          <button
            key={w.id}
            data-testid={`button-wallet-tab-${w.id}`}
            onClick={() => setActiveWallet(w.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm transition-all ${
              activeWallet === w.id
                ? "bg-primary/15 border-primary/40 text-foreground"
                : "bg-card border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${w.positive ? "bg-green-400" : "bg-red-400"}`} />
            <span className="font-medium">{w.label}</span>
            <span className="font-mono text-xs text-muted-foreground/60">{short(w.address)}</span>
          </button>
        ))}
        <button
          data-testid="button-add-wallet-tab"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border/80 text-sm transition-all"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Wallet summary */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-display font-bold text-foreground text-lg">{wallet.label}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground/60 text-xs font-mono">{short(wallet.address)}</span>
              <CopyButton text={wallet.address} />
              <a href="#" data-testid="link-etherscan" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="text-right">
            <div className={`flex items-center gap-1 justify-end text-lg font-display font-bold ${wallet.positive ? "text-green-400" : "text-red-400"}`}>
              {wallet.positive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {wallet.pnl}
            </div>
            <p className="text-muted-foreground/50 text-xs mt-0.5">estimated P&L</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Chain", value: wallet.chain },
            { label: "Projects", value: wallet.projects.length },
            { label: "Active", value: wallet.projects.filter((p) => p.status === "active").length },
          ].map((s) => (
            <div key={s.label} data-testid={`stat-wallet-${s.label.toLowerCase()}`} className="bg-background rounded-xl px-3 py-2.5">
              <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
              <p className="text-foreground font-display font-semibold text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Projects table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-foreground text-sm">Projects interacted with</h2>
        </div>
        <div className="divide-y divide-border">
          {wallet.projects.map((p, i) => (
            <div
              key={i}
              data-testid={`row-project-${p.name.toLowerCase()}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border border-border">
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">{p.name}</p>
                <p className="text-muted-foreground/50 text-xs">{p.date}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-md ${TYPE_STYLES[p.type] || "bg-muted text-muted-foreground"}`}>
                {p.type}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-md ${STATUS_STYLES[p.status]}`}>
                {p.status}
              </span>
              <span className="text-foreground text-sm font-medium w-20 text-right">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
