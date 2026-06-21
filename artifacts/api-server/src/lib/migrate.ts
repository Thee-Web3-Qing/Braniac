import { query } from "./db.js";
import type { Logger } from "pino";

/**
 * Runs idempotent DDL migrations on startup.
 * All statements use IF NOT EXISTS so they are safe to run repeatedly.
 */
export async function runMigrations(logger: Logger): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS telegram_sessions (
        privy_user_id TEXT PRIMARY KEY,
        session_string TEXT NOT NULL,
        tracked_chats  JSONB NOT NULL DEFAULT '[]',
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        privy_user_id      TEXT PRIMARY KEY,
        email              TEXT,
        wallet_address     TEXT,
        wallet_type        TEXT,
        discord_connected  BOOLEAN NOT NULL DEFAULT FALSE,
        telegram_connected BOOLEAN NOT NULL DEFAULT FALSE,
        login_count        INTEGER NOT NULL DEFAULT 1,
        first_seen         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_last_seen  ON users (last_seen  DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_first_seen ON users (first_seen DESC)`);
    logger.info("DB migrations applied");
  } catch (err) {
    logger.error({ err }, "DB migration failed — server will start but Telegram session persistence may not work");
  }
}
