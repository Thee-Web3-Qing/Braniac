const PREFIX = "brainiac:og:";
const BASE58 = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";

function mockCID(): string {
  let cid = "Qm";
  for (let i = 0; i < 42; i++) {
    cid += BASE58[Math.floor(Math.random() * BASE58.length)];
  }
  return cid;
}

export interface OGRecord<T = unknown> {
  data: T;
  cid: string;
  savedAt: number;
}

export function saveToOG<T>(key: string, data: T): OGRecord<T> {
  const record: OGRecord<T> = { data, cid: mockCID(), savedAt: Date.now() };
  try { localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(record)); } catch {}
  return record;
}

export function loadFromOG<T>(key: string): OGRecord<T> | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as OGRecord<T>) : null;
  } catch { return null; }
}

export function clearOG(key: string): void {
  try { localStorage.removeItem(`${PREFIX}${key}`); } catch {}
}

export function formatCID(cid: string): string {
  return cid.slice(0, 10) + "..." + cid.slice(-6);
}

export const OG_EXPLORER = "https://chainscan-newton.0g.ai";
export const OG_CHAIN_ID = 16602;
export const OG_CHAIN_NAME = "0G Newton Testnet";

export interface LoginRecord {
  userId: string;
  walletAddress?: string;
  loginMethod: string;
  timestamp: number;
  txHash?: string;
  txStatus: "confirmed" | "pending" | "no_funds" | "failed";
  errorReason?: string;
}

export interface OGLoginResponse {
  record: LoginRecord;
  serverAddress: string | null;
  explorerUrl: string | null;
}

export interface OGStatusResponse {
  configured: boolean;
  serverAddress?: string;
  balanceA0GI?: string;
  funded?: boolean;
  faucetUrl?: string;
  error?: string;
  chain?: { id: number; name: string; explorer: string };
}

export interface OGHistoryResponse {
  records: LoginRecord[];
  serverAddress: string | null;
  chain: { id: number; name: string; explorer: string };
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

export async function recordLoginOnOG(params: {
  userId: string;
  walletAddress?: string;
  loginMethod: string;
  displayName?: string;
}): Promise<OGLoginResponse> {
  const res = await fetch(`${API_BASE}/og/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`OG login recording failed: ${res.status}`);
  return res.json() as Promise<OGLoginResponse>;
}

export async function getOGLoginHistory(userId: string): Promise<OGHistoryResponse> {
  const res = await fetch(`${API_BASE}/og/history/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`OG history fetch failed: ${res.status}`);
  return res.json() as Promise<OGHistoryResponse>;
}

export async function getOGStatus(): Promise<OGStatusResponse> {
  const res = await fetch(`${API_BASE}/og/status`);
  if (!res.ok) throw new Error(`OG status fetch failed: ${res.status}`);
  return res.json() as Promise<OGStatusResponse>;
}

export function shortTxHash(hash: string): string {
  return hash.slice(0, 10) + "..." + hash.slice(-8);
}

export function formatLoginMethod(method: string): string {
  const map: Record<string, string> = {
    google: "Google",
    twitter: "X / Twitter",
    email: "Email",
    wallet: "Wallet",
    unknown: "Unknown",
  };
  return map[method] ?? method;
}
