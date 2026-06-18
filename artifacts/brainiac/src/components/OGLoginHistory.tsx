import { useEffect, useState } from "react";
import { ExternalLink, Shield, Clock, Loader2, AlertCircle, CheckCircle2, Database } from "lucide-react";
import {
  getOGLoginHistory,
  getOGStatus,
  OG_EXPLORER,
  OG_CHAIN_NAME,
  shortTxHash,
  formatLoginMethod,
  type LoginRecord,
  type OGStatusResponse,
} from "@/lib/og-storage";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: LoginRecord["txStatus"] }) {
  if (status === "confirmed")
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
        <CheckCircle2 className="w-3 h-3" /> On-chain
      </span>
    );
  if (status === "no_funds")
    return (
      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
        <AlertCircle className="w-3 h-3" /> Needs funds
      </span>
    );
  if (status === "failed")
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-400/70 font-medium">
        <AlertCircle className="w-3 h-3" /> Failed
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
      <Loader2 className="w-3 h-3 animate-spin" /> Pending
    </span>
  );
}

export default function OGLoginHistory({ userId }: { userId: string }) {
  const [records, setRecords] = useState<LoginRecord[]>([]);
  const [status, setStatus] = useState<OGStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    setLoading(true);
    Promise.all([getOGLoginHistory(userId), getOGStatus()])
      .then(([hist, stat]) => {
        if (!mounted) return;
        setRecords(hist.records);
        setStatus(stat);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [userId]);

  return (
    <div className="p-5 border-b border-border">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Login records on 0G</p>
        </div>
        <a
          href={`${OG_EXPLORER}/address/${status?.serverAddress ?? ""}`}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-0.5 transition-colors"
        >
          {OG_CHAIN_NAME} <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mb-3 leading-relaxed">
        Each login is recorded as a real transaction on the 0G Newton testnet.
      </p>

      {status && !status.funded && status.configured && (
        <div className="mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <p className="text-[10px] text-amber-300 font-medium mb-1">Server wallet needs A0GI tokens</p>
          <p className="text-[10px] text-amber-300/70 mb-2 leading-relaxed">
            Get free testnet tokens to enable on-chain login recording.
          </p>
          <div className="flex items-center gap-2">
            <code className="text-[9px] bg-black/30 text-amber-200 px-1.5 py-0.5 rounded font-mono truncate flex-1">
              {status.serverAddress}
            </code>
            <a
              href={status.faucetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-amber-300 hover:text-amber-200 font-medium shrink-0 flex items-center gap-0.5"
            >
              Faucet <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Shield className="w-6 h-6 text-muted-foreground/30" />
          <p className="text-[11px] text-muted-foreground/50 text-center">
            No records yet. Your next login will be recorded on 0G.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.slice(0, 6).map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs text-foreground font-medium">
                    {formatLoginMethod(r.loginMethod)}
                  </span>
                  <StatusBadge status={r.txStatus} />
                </div>
                {r.txHash ? (
                  <a
                    href={`${OG_EXPLORER}/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary font-mono transition-colors"
                  >
                    {shortTxHash(r.txHash)} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                    {r.txStatus === "no_funds" ? "wallet unfunded" : "not recorded"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 shrink-0 ml-2">
                <Clock className="w-2.5 h-2.5" />
                {timeAgo(r.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
