import { Router } from "express";

const router = Router();

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`;

interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name: string };
    chat: { id: number; title?: string; type: string };
    text?: string;
    date: number;
  };
}

interface TgMessage {
  message_id: number;
  from?: { id: number; username?: string; first_name: string };
  chat: { id: number; title?: string; type: string };
  text?: string;
  date: number;
}

router.get("/me", async (_req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: "Telegram not configured" });

  try {
    const r = await fetch(`${TG_API(token)}/getMe`);
    const data = await r.json() as { ok: boolean; result?: { username?: string; first_name: string } };
    if (!data.ok) return res.status(500).json({ error: "Bot unreachable" });
    return res.json({ username: data.result?.username, name: data.result?.first_name });
  } catch {
    return res.status(500).json({ error: "Failed to reach Telegram" });
  }
});

router.get("/updates", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: "Telegram not configured" });

  const offset = req.query.offset ? Number(req.query.offset) : undefined;
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (offset) params.set("offset", String(offset));

    const r = await fetch(`${TG_API(token)}/getUpdates?${params}`);
    const data = await r.json() as { ok: boolean; result?: TgUpdate[] };
    if (!data.ok || !data.result) return res.json({ messages: [] });

    const messages = data.result
      .filter((u) => u.message?.text)
      .map((u) => {
        const m = u.message!;
        return {
          id: String(m.message_id),
          text: m.text ?? "",
          from: m.from?.username ?? m.from?.first_name ?? "Unknown",
          chatId: m.chat.id,
          chatTitle: m.chat.title ?? "Direct Message",
          chatType: m.chat.type,
          date: new Date(m.date * 1000).toISOString(),
        };
      });

    const nextOffset = data.result.length > 0
      ? data.result[data.result.length - 1].update_id + 1
      : offset;

    return res.json({ messages, nextOffset });
  } catch {
    return res.status(500).json({ error: "Failed to fetch updates" });
  }
});

router.get("/history/:chatId", async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: "Telegram not configured" });

  const { chatId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  try {
    const r = await fetch(`${TG_API(token)}/getUpdates?limit=100`);
    const data = await r.json() as { ok: boolean; result?: TgUpdate[] };
    if (!data.ok || !data.result) return res.json({ messages: [] });

    const messages = data.result
      .filter((u) => u.message?.text && String(u.message.chat.id) === chatId)
      .slice(-limit)
      .map((u) => {
        const m = u.message!;
        return {
          id: String(m.message_id),
          text: m.text ?? "",
          from: m.from?.username ?? m.from?.first_name ?? "Unknown",
          date: new Date(m.date * 1000).toISOString(),
        };
      });

    return res.json({ messages });
  } catch {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.post("/webhook", async (req, res) => {
  const update = req.body as TgUpdate;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.sendStatus(200);

  if (update.message?.text?.startsWith("/start")) {
    const chatId = update.message.chat.id;
    const name = update.message.from?.first_name ?? "there";
    await fetch(`${TG_API(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Hey ${name}! Brainiac is now reading this chat.\n\nAdd me to any group and I'll track signals for your feed. Send /help for commands.`,
      }),
    }).catch(() => {});
  }

  return res.sendStatus(200);
});

export default router;
