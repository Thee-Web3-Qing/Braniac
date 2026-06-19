---
name: 0G history recording pattern
description: How chat/content/community history sessions are recorded on 0G Newton testnet
---

# 0G History Recording

## The rule
Every history session save fires a background POST to `/api/og/save-history`. The response `ogStatus` ("pending", "confirmed", "failed", "no_funds") is merged back into localStorage. The `OGBadge` component in BrainPage.tsx reads `ogStatus` from the session and renders the appropriate badge.

**Why:** Chain writes are async (fire-and-forget). We store the initial status in localStorage immediately and let the in-memory `historyStore` (og-chain.ts) track confirmed tx hashes server-side. Status is NOT polled — the badge reflects the state at save time.

**How to apply:**
- `ogSaveHistory<T>(histKey, session, userId, type, preview, onUpdate)` — generic helper in BrainPage.tsx
- API: `POST /api/og/save-history` → `recordHistory()` in og-chain.ts
- API: `GET /api/og/session-history/:userId` → reads `historyStore` map
- `OGBadge` renders: pulsing dot + "0G recording..." (pending), green dot + "0G saved" link (confirmed), dim red + "0G failed" (failed)
- Badge is a clickable link to 0G explorer when confirmed and explorerUrl is present.
