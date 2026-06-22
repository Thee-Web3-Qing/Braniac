import { Router, Request, Response, NextFunction } from "express";
import { query } from "../lib/db.js";

const router = Router();

function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.PRIVY_APP_SECRET;
  if (!secret) return res.status(503).json({ error: "Admin auth not configured" });
  const provided = req.headers["x-admin-key"];
  if (provided !== secret) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

router.post("/sync", async (req, res) => {
  const {
    privyUserId,
    email,
    walletAddress,
    walletType,
    discordConnected,
    telegramConnected,
  } = req.body as {
    privyUserId?: string;
    email?: string;
    walletAddress?: string;
    walletType?: string;
    discordConnected?: boolean;
    telegramConnected?: boolean;
  };

  if (!privyUserId) return res.status(400).json({ error: "privyUserId required" });

  try {
    await query(
      `INSERT INTO users (privy_user_id, email, wallet_address, wallet_type, discord_connected, telegram_connected, login_count, first_seen, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), NOW())
       ON CONFLICT (privy_user_id) DO UPDATE SET
         email              = COALESCE($2, users.email),
         wallet_address     = COALESCE($3, users.wallet_address),
         wallet_type        = COALESCE($4, users.wallet_type),
         discord_connected  = CASE WHEN $5 IS NOT NULL THEN $5 ELSE users.discord_connected END,
         telegram_connected = CASE WHEN $6 IS NOT NULL THEN $6 ELSE users.telegram_connected END,
         login_count        = users.login_count + 1,
         last_seen          = NOW()`,
      [
        privyUserId,
        email ?? null,
        walletAddress ?? null,
        walletType ?? null,
        discordConnected ?? null,
        telegramConnected ?? null,
      ]
    );
    return res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    return res.status(500).json({ error: msg });
  }
});

router.get("/stats", requireAdminKey, async (_req, res) => {
  try {
    const total       = await query(`SELECT COUNT(*) AS count FROM users`);
    const today       = await query(`SELECT COUNT(*) AS count FROM users WHERE first_seen >= NOW() - INTERVAL '24 hours'`);
    const week        = await query(`SELECT COUNT(*) AS count FROM users WHERE first_seen >= NOW() - INTERVAL '7 days'`);
    const active      = await query(`SELECT COUNT(*) AS count FROM users WHERE last_seen  >= NOW() - INTERVAL '7 days'`);
    const withDiscord = await query(`SELECT COUNT(*) AS count FROM users WHERE discord_connected  = TRUE`);
    const withTg      = await query(`SELECT COUNT(*) AS count FROM users WHERE telegram_connected = TRUE`);

    return res.json({
      total:            Number((total.rows as Array<{ count: string }>)[0]?.count ?? 0),
      newToday:         Number((today.rows as Array<{ count: string }>)[0]?.count ?? 0),
      newThisWeek:      Number((week.rows as Array<{ count: string }>)[0]?.count ?? 0),
      activeThisWeek:   Number((active.rows as Array<{ count: string }>)[0]?.count ?? 0),
      discordConnected: Number((withDiscord.rows as Array<{ count: string }>)[0]?.count ?? 0),
      tgConnected:      Number((withTg.rows as Array<{ count: string }>)[0]?.count ?? 0),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    return res.status(500).json({ error: msg });
  }
});

router.get("/list", requireAdminKey, async (req, res) => {
  const limit  = Math.min(Number(req.query.limit  ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);
  try {
    const result = await query(
      `SELECT privy_user_id, email, wallet_address, wallet_type,
              discord_connected, telegram_connected, login_count,
              first_seen, last_seen
       FROM users
       ORDER BY last_seen DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countResult = await query(`SELECT COUNT(*) AS count FROM users`);
    return res.json({
      users: result.rows,
      total: Number((countResult.rows as Array<{ count: string }>)[0]?.count ?? 0),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DB error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
