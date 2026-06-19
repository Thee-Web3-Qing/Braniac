import { Router } from "express";
import { TelegramClient, sessions as tgSessions, Api } from "telegram";
const { StringSession } = tgSessions;
import crypto from "crypto";

const router = Router();

function getCredentials() {
  const apiId   = parseInt(process.env.TELEGRAM_API_ID ?? "0");
  const apiHash = process.env.TELEGRAM_API_HASH ?? "";
  return { apiId, apiHash, ok: apiId > 0 && apiHash.length > 0 };
}

type PendingAuth = {
  client: TelegramClient;
  phoneCodeHash: string;
  phoneNumber: string;
  createdAt: number;
};

const pendingAuth  = new Map<string, PendingAuth>();
const clientCache  = new Map<string, TelegramClient>();

// Evict stale pending auth sessions
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [k, v] of pendingAuth) {
    if (v.createdAt < cutoff) pendingAuth.delete(k);
  }
}, 60_000);

/**
 * Returns true for Telegram errors that mean the session is permanently invalid
 * and the user must re-authenticate (as opposed to transient connection errors).
 */
function isAuthError(msg: string): boolean {
  return (
    msg.includes("AUTH_KEY_UNREGISTERED") ||
    msg.includes("AUTH_KEY_INVALID") ||
    msg.includes("SESSION_EXPIRED") ||
    msg.includes("SESSION_REVOKED") ||
    msg.includes("USER_DEACTIVATED") ||
    msg.includes("USER_DEACTIVATED_BAN")
  );
}

/**
 * Returns a connected TelegramClient for the given session string.
 * Reconnects automatically if the cached client is disconnected (e.g. after a
 * server restart). Throws if the session string is permanently invalid.
 */
async function getClient(sessionString: string): Promise<TelegramClient> {
  const cached = clientCache.get(sessionString);

  if (cached) {
    if (cached.connected) return cached;

    // Client is in cache but disconnected — try reconnecting it in place
    try {
      await cached.connect();
      if (cached.connected) return cached;
    } catch {
      // Reconnect failed; fall through to build a fresh client
    }

    // Remove the stale entry so we don't keep retrying a dead object
    clientCache.delete(sessionString);
  }

  const { apiId, apiHash } = getCredentials();
  const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    { connectionRetries: 5, requestRetries: 3, autoReconnect: true }
  );
  await client.connect();
  clientCache.set(sessionString, client);
  return client;
}

// Step 1 — send OTP to the user's phone
router.post("/auth/start", async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) return res.status(400).json({ error: "Phone number required (with country code, e.g. +1...)" });

  const creds = getCredentials();
  if (!creds.ok) {
    return res.status(500).json({
      error: "Telegram API credentials not configured. Add TELEGRAM_API_ID and TELEGRAM_API_HASH secrets.",
    });
  }

  try {
    const client = new TelegramClient(
      new StringSession(""),
      creds.apiId,
      creds.apiHash,
      { connectionRetries: 3 }
    );
    await client.connect();

    const result = await client.sendCode(
      { apiId: creds.apiId, apiHash: creds.apiHash },
      phone
    );

    const sessionId = crypto.randomUUID();
    pendingAuth.set(sessionId, {
      client,
      phoneCodeHash: result.phoneCodeHash,
      phoneNumber: phone,
      createdAt: Date.now(),
    });

    return res.json({ sessionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Failed to send code: ${msg}` });
  }
});

// Step 2 — verify OTP, return usable session string
router.post("/auth/verify", async (req, res) => {
  const { sessionId, code } = req.body as { sessionId?: string; code?: string };
  if (!sessionId || !code) return res.status(400).json({ error: "sessionId and code required" });

  const pending = pendingAuth.get(sessionId);
  if (!pending) return res.status(400).json({ error: "Session expired — please restart auth" });

  try {
    await pending.client.invoke(
      new Api.auth.SignIn({
        phoneNumber:   pending.phoneNumber,
        phoneCodeHash: pending.phoneCodeHash,
        phoneCode:     code.trim(),
      })
    );

    const sessionString = pending.client.session.save() as unknown as string;
    clientCache.set(sessionString, pending.client);
    pendingAuth.delete(sessionId);

    return res.json({ sessionString });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("SESSION_PASSWORD_NEEDED")) {
      return res.status(200).json({ needs2FA: true, error: "2FA_REQUIRED" });
    }
    if (msg.includes("PHONE_CODE_INVALID") || msg.includes("PHONE_CODE_EXPIRED")) {
      return res.status(400).json({ error: "Invalid or expired code — please try again" });
    }
    return res.status(400).json({ error: `Verification failed: ${msg}` });
  }
});

// List the user's groups and channels
router.get("/dialogs", async (req, res) => {
  const sessionString = req.headers["x-tg-session"] as string | undefined;
  if (!sessionString) return res.status(401).json({ error: "Missing session" });

  try {
    const client = await getClient(sessionString);
    const dialogs = await client.getDialogs({ limit: 100 });

    const chats = dialogs
      .filter((d) => d.isGroup || d.isChannel)
      .map((d) => ({
        id:    d.id!.toString(),
        title: d.title || d.name || "Unnamed",
        type:  d.isChannel ? "channel" : "group",
      }));

    return res.json({ chats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isAuthError(msg)) {
      clientCache.delete(sessionString);
      return res.status(401).json({ error: "Session expired — please sign in again", code: "SESSION_EXPIRED" });
    }
    return res.status(500).json({ error: `Failed to fetch chats: ${msg}` });
  }
});

// Read recent messages from a specific chat
router.get("/messages/:chatId", async (req, res) => {
  const sessionString = req.headers["x-tg-session"] as string | undefined;
  if (!sessionString) return res.status(401).json({ error: "Missing session" });

  const { chatId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  try {
    const client = await getClient(sessionString);

    let peer: bigint | string;
    try { peer = BigInt(chatId); } catch { peer = chatId; }

    const messages = await client.getMessages(peer as Parameters<typeof client.getMessages>[0], { limit });

    const result = (messages as Array<{ id: number; message?: string; date: number; fromId?: unknown }>)
      .filter((m) => m.message && m.message.trim().length > 0)
      .map((m) => ({
        id:   m.id.toString(),
        text: m.message ?? "",
        date: new Date(m.date * 1000).toISOString(),
      }));

    return res.json({ messages: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isAuthError(msg)) {
      clientCache.delete(sessionString);
      return res.status(401).json({ error: "Session expired — please sign in again", code: "SESSION_EXPIRED" });
    }
    return res.status(500).json({ error: `Failed to fetch messages: ${msg}` });
  }
});

export default router;
