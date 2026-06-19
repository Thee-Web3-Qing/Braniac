import { useState } from "react";
import { Check, Copy, Wallet, Zap, Shield, RefreshCw, ExternalLink, X, Clock } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Link } from "wouter";

const EARLY_BIRD_DEADLINE = new Date("2026-07-20T23:59:59Z");
const isEarlyBird = () => new Date() < EARLY_BIRD_DEADLINE;

function daysLeft() {
  const ms = EARLY_BIRD_DEADLINE.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

const PLANS = {
  monthly: {
    label: "Monthly",
    usd: "$5",
    period: "/mo",
    usdc: "5",
    earlyBird: false,
    savings: null,
  },
  annual: {
    label: "Annual",
    usd: isEarlyBird() ? "$45" : "$50",
    period: "/yr",
    usdc: isEarlyBird() ? "45" : "50",
    earlyBird: isEarlyBird(),
    regularUsd: "$50",
    savings: isEarlyBird() ? "Save $15" : "Save $10",
  },
  lifetime: {
    label: "Lifetime",
    usd: isEarlyBird() ? "$250" : "$300",
    period: " once",
    usdc: isEarlyBird() ? "250" : "300",
    earlyBird: isEarlyBird(),
    regularUsd: "$300",
    savings: "Pay once, yours forever",
  },
} as const;

type Plan = keyof typeof PLANS;

const PRO_FEATURES = [
  "Unlimited AI drafts and chat",
  "Cross-device Telegram session sync",
  "Priority Qwen reasoning on your feed",
  "Advanced wallet activity analysis",
  "Export your Brainiac wallet recovery phrase",
  "Early access to new features",
];

const FREE_LIMITS = [
  "15 AI drafts/month",
  "Single device only",
  "Standard feed processing",
  "Basic wallet summaries",
];

const PAYMENT_WALLET = "0x9914C8de5CdA23928B67B41F5E19ad7B73A3f886";

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {label ?? (copied ? "Copied" : "Copy")}
    </button>
  );
}

function PayModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [txHash, setTxHash] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = PLANS[plan];
  const usdcAmount = p.usdc;
  const planLabel = plan === "monthly" ? "1 month" : plan === "annual" ? "1 year" : "Lifetime";

  const sendFromWallet = async () => {
    if (!authenticated) { login(); return; }
    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (!embeddedWallet) {
      setError("No Brainiac embedded wallet found. Make sure you're signed in.");
      return;
    }
    setSending(true); setError(null);
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const weiAmount = BigInt(Math.round(parseFloat(usdcAmount) * 1e18));
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: embeddedWallet.address, to: PAYMENT_WALLET, value: "0x" + weiAmount.toString(16) }],
      }) as string;
      setTxHash(hash);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-foreground">Pay with crypto</h3>
            <p className="text-muted-foreground text-xs mt-0.5">Wallet-to-wallet · {planLabel} · ${usdcAmount} USDC</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                <Check size={22} className="text-green-400" />
              </div>
              <div>
                <p className="text-foreground font-medium text-sm">Payment sent</p>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                  Your Pro access will activate once the transaction confirms on-chain.
                </p>
              </div>
              {txHash && (
                <div className="bg-background border border-border rounded-xl p-3 text-left">
                  <p className="text-muted-foreground/60 text-xs mb-1.5">Transaction hash</p>
                  <div className="flex items-center gap-2">
                    <code className="text-foreground text-xs font-mono truncate flex-1">{txHash.slice(0, 20)}...{txHash.slice(-8)}</code>
                    <CopyButton value={txHash} />
                    <a href={`https://chainscan-newton.0g.ai/tx/${txHash}`} target="_blank" rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
              <button onClick={onClose}
                className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-sm font-medium rounded-xl transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="bg-background border border-border rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-muted-foreground/60 text-xs mb-1">Send to</p>
                  <div className="flex items-center gap-2">
                    <code className="text-foreground text-xs font-mono truncate flex-1">{PAYMENT_WALLET}</code>
                    <CopyButton value={PAYMENT_WALLET} />
                  </div>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="text-muted-foreground/60 text-xs mb-1">Amount</p>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-semibold">${usdcAmount} USDC</span>
                    <CopyButton value={usdcAmount} label="Copy amount" />
                  </div>
                </div>
              </div>

              <button
                onClick={sendFromWallet}
                disabled={sending}
                className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {sending
                  ? <><RefreshCw size={14} className="animate-spin" /> Sending...</>
                  : <><Wallet size={14} /> Send from my Brainiac wallet</>}
              </button>

              {error && <p className="text-red-400 text-xs text-center">{error}</p>}

              <p className="text-muted-foreground/50 text-xs text-center leading-relaxed">
                Or send USDC manually from any wallet to the address above. No card details, no KYC, no middleman.
              </p>

              <div className="space-y-1.5">
                <p className="text-muted-foreground/60 text-xs">Already sent? Paste your tx hash:</p>
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="0x..." value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-foreground text-xs font-mono placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={() => setSent(true)}
                    disabled={!txHash.trim()}
                    className="px-3 py-2 bg-card border border-border hover:border-primary/40 rounded-xl text-muted-foreground hover:text-foreground text-xs transition-colors disabled:opacity-40"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [showPayModal, setShowPayModal] = useState(false);
  const { authenticated, login } = usePrivy();
  const earlyBird = isEarlyBird();
  const days = daysLeft();

  const handleUpgrade = () => {
    if (!authenticated) { login(); return; }
    setShowPayModal(true);
  };

  const currentPlan = PLANS[selectedPlan];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
      {showPayModal && (
        <PayModal plan={selectedPlan} onClose={() => setShowPayModal(false)} />
      )}

      <div className="mb-6">
        <Link href="/dashboard">
          <button className="text-muted-foreground text-xs hover:text-foreground transition-colors mb-4 block">
            Back to dashboard
          </button>
        </Link>
        <h1 className="font-display font-bold text-foreground text-xl md:text-2xl">Upgrade to Pro</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Pay wallet-to-wallet — no cards, no KYC, no middleman.</p>
      </div>

      {earlyBird && (
        <div className="flex items-center gap-2.5 bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 mb-5">
          <Clock size={14} className="text-amber-400 shrink-0" />
          <p className="text-amber-300 text-xs">
            <span className="font-semibold">Early bird pricing</span> — {days} day{days !== 1 ? "s" : ""} left. Annual and Lifetime prices increase on July 20.
          </p>
        </div>
      )}

      {/* Plan selector */}
      <div className="flex gap-1.5 mb-6 bg-card border border-border rounded-xl p-1">
        {(["monthly", "annual", "lifetime"] as Plan[]).map((p) => (
          <button key={p} onClick={() => setSelectedPlan(p)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              selectedPlan === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {PLANS[p].label}
            {p !== "monthly" && earlyBird && (
              <span className="hidden sm:inline text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-semibold">Early bird</span>
            )}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Free */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-3">Free</p>
          <div className="flex items-end gap-1 mb-4">
            <span className="font-display font-bold text-3xl text-foreground">$0</span>
            <span className="text-muted-foreground text-sm mb-1">/forever</span>
          </div>
          <ul className="space-y-2">
            {FREE_LIMITS.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-border mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="bg-card border border-primary/40 rounded-2xl p-5 relative">
          <div className="absolute top-4 right-4 text-[10px] bg-primary/15 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-semibold">
            Pro
          </div>
          <p className="text-primary text-xs font-semibold uppercase tracking-wide mb-3">Pro</p>

          <div className="flex items-end gap-1 mb-1">
            <span className="font-display font-bold text-3xl text-foreground">{currentPlan.usd}</span>
            <span className="text-muted-foreground text-sm mb-1">{currentPlan.period}</span>
          </div>

          {earlyBird && selectedPlan !== "monthly" && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground/50 line-through">{(currentPlan as typeof PLANS.annual).regularUsd}</span>
              <span className="text-xs text-amber-400 font-medium">{currentPlan.savings}</span>
            </div>
          )}
          {(!earlyBird || selectedPlan === "monthly") && currentPlan.savings && (
            <p className="text-xs text-muted-foreground mb-3">{currentPlan.savings}</p>
          )}

          <ul className="space-y-2 mb-5 mt-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                <Check size={13} className="text-primary shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>

          <button onClick={handleUpgrade}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
            <Zap size={14} />
            Pay {currentPlan.usd} USDC with crypto
          </button>
        </div>
      </div>

      {earlyBird && selectedPlan !== "monthly" && (
        <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-3 mb-4 text-xs text-muted-foreground">
          <Clock size={13} className="text-amber-400 shrink-0" />
          Price rises to {(currentPlan as typeof PLANS.annual).regularUsd} on July 20. Lock in the early bird rate today.
        </div>
      )}

      {/* Security note */}
      <div className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
        <Shield size={16} className="text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-foreground text-xs font-medium mb-1">Wallet-to-wallet, fully self-custodied</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Payments go directly from your Brainiac embedded wallet to ours — no payment processor, no card data, no intermediary. Your Telegram sessions and Discord tokens are stored only in your browser and never on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
