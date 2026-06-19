export type ActivityType = "swap" | "deposit" | "withdraw" | "mint" | "stake" | "claim" | "bridge";

export type ChainActivity = {
  id: string;
  date: string;
  daysAgo: number;
  type: ActivityType;
  protocol: string;
  chain: string;
  description: string;
  tokenIn?: string;
  tokenOut?: string;
  usdValue: string;
  apy?: string;
  yieldEarned?: string;
};

const ETH_TEMPLATES: Omit<ChainActivity, "id" | "date" | "chain">[] = [];

const BASE_TEMPLATES: Omit<ChainActivity, "id" | "date" | "chain">[] = [];

const ARB_TEMPLATES: Omit<ChainActivity, "id" | "date" | "chain">[] = [];

export function getWalletActivity(chain: string): ChainActivity[] {
  const now = new Date();
  const templates =
    chain === "Ethereum" ? ETH_TEMPLATES
    : chain === "Base"   ? BASE_TEMPLATES
    : ARB_TEMPLATES;

  return templates.map((t, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - t.daysAgo);
    return {
      ...t,
      id: `${chain}-${i}`,
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      chain,
    };
  });
}

export function activityToText(activity: ChainActivity[]): string {
  return activity
    .map((a) => {
      let line = `[${a.date}] ${a.type.toUpperCase()} on ${a.protocol}: ${a.description} — ${a.usdValue}`;
      if (a.apy) line += ` | APY: ${a.apy}`;
      if (a.yieldEarned) line += ` | Yield: ${a.yieldEarned}`;
      return line;
    })
    .join("\n");
}

export function getActiveProtocols(activity: ChainActivity[]): string[] {
  const seen = new Set<string>();
  return activity
    .filter((a) => a.type === "deposit" || a.type === "stake")
    .map((a) => a.protocol)
    .filter((p) => { if (seen.has(p)) return false; seen.add(p); return true; });
}

export function getTotalYield(activity: ChainActivity[]): number {
  return activity
    .filter((a) => a.type === "claim" || a.yieldEarned)
    .reduce((sum, a) => {
      if (a.type !== "claim") return sum;
      const n = parseFloat(a.usdValue.replace(/[$,]/g, ""));
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
}
