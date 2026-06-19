import { Router, type Request } from "express";

const router = Router();

const DISCORD_API = "https://discord.com/api/v10";

function getRedirectUri(req: Request): string {
  // Explicit override — set DISCORD_REDIRECT_URI for production domains.
  if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI;
  // Dev: derive from request host (works on the picard.replit.dev preview).
  const host  = req.get("x-forwarded-host") ?? req.get("host");
  const proto = req.get("x-forwarded-proto") ?? "https";
  if (host && host !== "localhost") return `${proto}://${host}/api/discord/callback`;
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) return `https://${domain}/api/discord/callback`;
  return "http://localhost:80/api/discord/callback";
}

router.get("/auth", (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: "Discord not configured" });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(req),
    response_type: "code",
    scope: "identify guilds",
  });

  return res.redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
});

router.get("/callback", async (req, res) => {
  const { code } = req.query as { code?: string };
  if (!code) return res.status(400).send("Missing code");

  const clientId     = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).send("Discord not configured");

  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(req),
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return res.status(400).send(`Token exchange failed: ${err}`);
    }

    const tokens = await tokenRes.json() as { access_token: string; token_type: string };

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
    });
    const user = await userRes.json() as { id: string; username: string; global_name?: string; avatar?: string };

    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
    });
    const guilds = await guildsRes.json() as Array<{ id: string; name: string; icon?: string }>;

    const payload = encodeURIComponent(JSON.stringify({
      user: { id: user.id, username: user.username, displayName: user.global_name ?? user.username, avatar: user.avatar },
      guilds: guilds.slice(0, 50).map((g) => ({ id: g.id, name: g.name, icon: g.icon })),
      accessToken: tokens.access_token,
    }));

    return res.redirect(`/feed?discord_connected=1&payload=${payload}`);
  } catch (err) {
    return res.status(500).send("OAuth failed");
  }
});

router.get("/guilds", async (req, res) => {
  const accessToken = req.headers["x-discord-token"] as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Missing access token" });

  try {
    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!guildsRes.ok) return res.status(401).json({ error: "Invalid token" });
    const guilds = await guildsRes.json() as Array<{ id: string; name: string; icon?: string }>;
    return res.json({ guilds: guilds.slice(0, 50).map((g) => ({ id: g.id, name: g.name })) });
  } catch {
    return res.status(500).json({ error: "Failed to fetch guilds" });
  }
});

router.get("/channels/:guildId", async (req, res) => {
  const accessToken = req.headers["x-discord-token"] as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Missing access token" });

  const { guildId } = req.params;

  try {
    const r = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!r.ok) {
      return res.status(r.status).json({ error: "Cannot list channels — try entering the channel ID manually" });
    }

    const raw = await r.json() as Array<{ id: string; name: string; type: number; position: number }>;
    const channels = raw
      .filter((c) => c.type === 0 || c.type === 5)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name }));

    return res.json({ channels });
  } catch {
    return res.status(500).json({ error: "Failed to fetch channels" });
  }
});

router.get("/messages/:guildId/:channelId", async (req, res) => {
  const accessToken = req.headers["x-discord-token"] as string | undefined;
  if (!accessToken) return res.status(401).json({ error: "Missing access token" });

  const { channelId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  try {
    const msgRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!msgRes.ok) return res.status(msgRes.status).json({ error: "Cannot read channel" });
    const messages = await msgRes.json() as Array<{
      id: string; content: string; timestamp: string;
      author: { username: string; global_name?: string };
    }>;

    return res.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        author: m.author.global_name ?? m.author.username,
        timestamp: m.timestamp,
      })),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
