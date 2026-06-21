import { Router } from "express";
import { GenerateDraftBody } from "@workspace/api-zod";
import { recordAIInteraction } from "../lib/og-chain";

const router = Router();

// Alchemy helpers for wallet history context
const ALCHEMY_ETH_BASE = "https://eth-mainnet.g.alchemy.com/v2";

async function alchemyPost(apiKey: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(`${ALCHEMY_ETH_BASE}/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, jsonrpc: "2.0", method, params }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = await res.json() as { result?: unknown };
  return data.result ?? null;
}

function extractEVMAddresses(ctx: string): string[] {
  return [...new Set(ctx.match(/0x[0-9a-fA-F]{40}/g) ?? [])];
}

type AlchemyTransfer = {
  to: string | null;
  from: string;
  value: number | null;
  asset: string | null;
  category: string;
  metadata?: { blockTimestamp?: string };
};

async function fetchWalletHistoryContext(addresses: string[], apiKey: string): Promise<string> {
  const sections: string[] = [];
  for (const addr of addresses.slice(0, 2)) {
    try {
      const result = await alchemyPost(apiKey, "alchemy_getAssetTransfers", [{
        fromAddress: addr,
        category: ["external", "internal", "erc20"],
        maxCount: "0xF",
        order: "desc",
        withMetadata: true,
      }]) as { transfers?: AlchemyTransfer[] } | null;

      const transfers = result?.transfers ?? [];
      if (!transfers.length) {
        sections.push(`${addr.slice(0, 8)}... — no recent outgoing transactions found`);
        continue;
      }
      const lines = transfers.slice(0, 12).map((t) => {
        const date = t.metadata?.blockTimestamp
          ? new Date(t.metadata.blockTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "unknown date";
        const val = t.value != null ? `${Number(t.value).toFixed(4)} ${t.asset ?? ""}`.trim() : (t.asset ?? "");
        const to = t.to ? `${t.to.slice(0, 6)}...${t.to.slice(-4)}` : "contract";
        return `  • ${date}: ${val} → ${to} [${t.category}]`;
      });
      sections.push(`Wallet ${addr.slice(0, 8)}...${addr.slice(-4)} (${transfers.length} recent txs):\n${lines.join("\n")}`);
    } catch {
      // silently skip — don't block chat
    }
  }
  return sections.join("\n\n");
}

const QWEN_BASE_URL = process.env.QWEN_BASE_URL ?? "https://ws-kslei9o3pxdkd1zd.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1";
const QWEN_WORKSPACE_ID = process.env.QWEN_WORKSPACE_ID ?? "ws-kslei9o3pxdkd1zd";

async function callQwen(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  opts: { model?: string; max_tokens?: number; temperature?: number } = {}
): Promise<string> {
  const body = {
    model: opts.model ?? "qwen-turbo",
    messages,
    max_tokens: opts.max_tokens ?? 800,
    temperature: opts.temperature ?? 0.7,
    stream: false,
  };

  const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-WorkSpace-Id": QWEN_WORKSPACE_ID,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "(no body)");
    console.error(`[Qwen] ${response.status} ${response.statusText}:`, errText);
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(errText) as Record<string, unknown>; } catch { /* ignore */ }
    const msg = (parsed as { error?: { message?: string } }).error?.message ?? errText;
    throw new Error(`Qwen ${response.status}: ${msg}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
  thread:
    "Write a Twitter/X thread (5-8 tweets, numbered 1/ through 8/). Each tweet max 280 chars. Start with a strong hook. Use line breaks between tweets.",
  recap:
    "Write a Space recap (3-4 paragraphs). Include key takeaways and notable moments. Keep it narrative and engaging.",
  update:
    "Write a community update (friendly, weekly digest format). Use bullet points for key items. Keep it warm and informative.",
  brief:
    "Write an alpha brief (sharp, curated). Use 🔍 for signals, ⚠️ for risks, ✅ for opportunities. Be concise.",
};

router.post("/generate", async (req, res) => {
  const parseResult = GenerateDraftBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { type, topic, feedContext } = parseResult.data;
  const apiKey = process.env.QWEN_API_KEYY_BRAINIAC ?? process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "QWEN_API_KEY not configured" });

  const systemPrompt = `You are Brainiac, an AI writing assistant for Web3 creators and community builders.
Your job is to help users create engaging Web3 content in their voice — confident, informed, no fluff.
Keep the tone knowledgeable but accessible. No corporate speak. Be direct and punchy.
IMPORTANT: Only reference specific market events, prices, or announcements if they appear in the provided feed context. Never invent market data, token prices, NFT floor changes, or airdrop details.`;

  const contextSection = feedContext?.trim()
    ? `Context from today's Web3 feed:\n${feedContext.trim()}`
    : `No live feed data is connected yet. Write based on the topic using your general Web3 knowledge. Do not invent specific prices, floor changes, whale moves, or airdrop deadlines — keep the piece timeless and grounded.`;

  const userMessage = `${TYPE_INSTRUCTIONS[type] || TYPE_INSTRUCTIONS.thread}

Topic: ${topic}

${contextSection}

Write the full piece now.`;

  try {
    const content = await callQwen(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], { max_tokens: 1000, temperature: 0.7 });
    return res.json({ content: content || "Could not generate draft.", type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/briefing", async (req, res) => {
  const { query, timeRange, wallets, communities, feedContext } = req.body as {
    query?: string;
    timeRange?: string;
    wallets?: Array<{ label: string; address: string; chain: string }>;
    communities?: Array<{ name: string; source: string }>;
    feedContext?: string;
  };

  const apiKey = process.env.QWEN_API_KEYY_BRAINIAC ?? process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

  const timeLabel =
    timeRange === "24h" ? "last 24 hours"
    : timeRange === "30d" ? "last 30 days"
    : "last 7 days";

  const walletContext = wallets?.length
    ? wallets.map((w) => `- ${w.label} (${w.chain}): ${w.address}`).join("\n")
    : "No wallets connected yet.";

  const communityContext = communities?.length
    ? communities.map((c) => `- ${c.name} on ${c.source}`).join("\n")
    : "No communities connected yet.";

  const hasRealFeed = !!(feedContext?.trim());
  const hasCommunities = !!(communities?.length);
  const feedSignals = feedContext?.trim() ?? "";

  const systemPrompt = `You're catching up a friend on what happened in their Web3 world. Write like you're texting them a quick debrief — not a report. Reference their actual wallets and communities by name when you have them. Be specific about what matters and skip what doesn't. If something needs action, say it plainly. No corporate structure, no filler headers — just tell them what's up like you actually care.
CRITICAL: Only mention specific market events, prices, NFT moves, airdrop deadlines, or token activity if they appear in the provided feed signals below. Never invent market data. If no live signals are available, honestly say so and suggest what connecting Discord or Telegram would unlock.`;

  const feedSection = hasRealFeed
    ? `Recent signals from my communities:\n${feedSignals}`
    : hasCommunities
      ? `I have communities connected (${communities!.map((c) => c.name).join(", ")}) but no recent messages were fetched — they may be empty or there was a temporary fetch issue.`
      : `No communities connected yet — no live feed data available. Honestly let me know what I'm missing by not having Discord or Telegram connected, and what I should set up first.`;

  const userMessage = `Catch me up on the ${timeLabel}.

My wallets:
${walletContext}

My communities:
${communityContext}

My question: "${query?.trim() || "What did I miss?"}"

${feedSection}

Write a personalized briefing. Mention my wallet names where relevant. Flag anything time-sensitive.`;

  try {
    const brief = await callQwen(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], { max_tokens: 800, temperature: 0.6 });

    const briefText = brief || "Could not generate briefing.";

    const userId = (req.body as { userId?: string }).userId;
    const ogRecord = userId
      ? recordAIInteraction(userId, "briefing", query ?? "What did I miss?", briefText)
      : null;

    return res.json({
      brief: briefText,
      ogRecordId: ogRecord?.id ?? null,
      ogStatus: ogRecord?.txStatus ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/wallet-intel", async (req, res) => {
  const { question, label, address, chain, activity } = req.body as {
    question: string;
    label: string;
    address: string;
    chain: string;
    activity: Array<{
      date: string;
      type: string;
      protocol: string;
      description: string;
      usdValue: string;
      apy?: string;
      yieldEarned?: string;
    }>;
  };

  const apiKey = process.env.QWEN_API_KEYY_BRAINIAC ?? process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

  const activityText = activity?.length
    ? activity
        .map((a) => {
          let line = `[${a.date}] ${a.type.toUpperCase()} on ${a.protocol}: ${a.description} — ${a.usdValue}`;
          if (a.apy) line += ` | APY: ${a.apy}`;
          if (a.yieldEarned) line += ` | Yield: ${a.yieldEarned}`;
          return line;
        })
        .join("\n")
    : "No activity data available.";

  const systemPrompt = `You are Brainiac, a personal on-chain intelligence assistant. You have the user's complete wallet activity history. Your job is to answer questions about their on-chain positions with precision.

Rules:
- Be specific: name protocols, tokens, and dollar amounts from the data
- Calculate yields when asked (APY * principal * time)
- When asked about strategy, suggest better alternatives with specific APYs
- Keep answers to 4-6 bullet points or 3-4 sentences — no padding
- Never say "based on the data provided" — just answer directly
- If asked for strategy, compare current positions to market alternatives (real protocols, real APYs)`;

  const userMessage = `Wallet: "${label}" on ${chain} (${address})

On-chain activity (most recent first):
${activityText}

Question: "${question}"`;

  try {
    const answer = await callQwen(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], { max_tokens: 700, temperature: 0.5 });
    return res.json({ answer: answer || "Could not generate analysis." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/community-intel", async (req, res) => {
  const { question, communities, feedContext, feedMessages } = req.body as {
    question?: string;
    communities?: Array<{ name: string; source: string }>;
    feedContext?: string;
    feedMessages?: Array<{ source: string; server: string; text: string }>;
  };

  const apiKey = process.env.QWEN_API_KEYY_BRAINIAC ?? process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

  const communityList = communities?.length
    ? communities.map((c) => `- ${c.name} on ${c.source}`).join("\n")
    : "- Web3 community (Discord + Telegram)";

  const hasRealData = feedContext?.trim() || feedMessages?.length;

  const dataBlock = hasRealData
    ? `Recent messages from your communities:\n${feedContext?.trim() || feedMessages?.map((m) => `[${m.source} / ${m.server}] ${m.text}`).join("\n") || ""}`
    : `No live message data available — answer based on general Web3 community management best practices.`;

  const systemPrompt = `You are Brainiac's community intelligence engine. You analyze what's actually happening in a user's Web3 communities and give specific, actionable intelligence.

${hasRealData
  ? "You have real message data from the user's connected communities. Base your analysis entirely on what you can see in those messages — specific topics being discussed, active members, sentiment, questions being asked. Do not invent metrics. If you can spot trends, name them. If you can see what's engaging, point it out."
  : "You don't have live data right now. Give actionable Web3 community management advice based on the question. Be specific and practical."}

Format: short, direct paragraphs or bullet points. Lead with the most useful insight. No filler headers.`;

  const userMessage = `My communities:
${communityList}

${dataBlock}

Question: "${question?.trim() || "What's happening in my community and what should I focus on?"}"`;

  try {
    const insights = await callQwen(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], { max_tokens: 900, temperature: 0.6 });
    return res.json({ insights: insights || "Could not generate insights." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return res.status(500).json({ error: msg });
  }
});

router.post("/chat", async (req, res) => {
  const { messages, feedContext, walletContext } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    feedContext?: string;
    walletContext?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  const apiKey = process.env.QWEN_API_KEYY_BRAINIAC ?? process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured — QWEN_API_KEY missing" });

  const contextParts: string[] = [];
  if (feedContext?.trim()) {
    contextParts.push(`Recent Web3 feed signals the user is tracking:\n${feedContext.trim()}`);
  }
  if (walletContext?.trim()) {
    contextParts.push(`User's connected wallets:\n${walletContext.trim()}`);
  }

  // Fetch real on-chain history from Alchemy for any EVM addresses
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (alchemyKey && walletContext?.trim()) {
    const addresses = extractEVMAddresses(walletContext);
    if (addresses.length > 0) {
      const txHistory = await fetchWalletHistoryContext(addresses, alchemyKey).catch(() => "");
      if (txHistory.trim()) {
        contextParts.push(`User's actual on-chain transaction history (fetched live from Alchemy):\n${txHistory}`);
      }
    }
  }

  const contextBlock = contextParts.length
    ? `\n\n---\n${contextParts.join("\n\n")}\n---`
    : "";

  const systemPrompt = `You are the user's sharpest friend in Web3 — the one they text when something is happening on-chain. You've been in the space long enough to have opinions, and you share them.

How you talk:
- Casual, direct, like you're in the middle of a conversation. No formal intros, no "Certainly!" or "Great question!" — just answer.
- Use contractions. Write the way people actually talk.
- Be specific and opinionated. If something looks risky, say so. If something looks interesting, say why.
- Ask a follow-up when it makes the conversation go somewhere useful — but only if it's genuine, not filler.
- Never use bullet points unless the user specifically asks for a list. Just talk.
- Keep it tight — 2-4 sentences most of the time. Go longer only if the topic needs it.
- You DO have access to the user's real wallet transaction history — it's in the context below. Use it when they ask about their on-chain activity. If a wallet shows no transactions, say so plainly.
- If you don't have enough context to give a real answer, say so plainly and ask what you need.${contextBlock}`;

  try {
    const reply = await callQwen(apiKey, [
      { role: "system", content: systemPrompt },
      ...messages,
    ], { max_tokens: 800, temperature: 0.9 });

    const replyText = reply || "I couldn't generate a response. Try again.";

    const userId = (req.body as { userId?: string }).userId;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const ogRecord = userId
      ? recordAIInteraction(userId, "chat", lastUserMsg, replyText)
      : null;

    return res.json({
      reply: replyText,
      ogRecordId: ogRecord?.id ?? null,
      ogStatus: ogRecord?.txStatus ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    console.error("[/brain/chat] Qwen error:", msg);
    return res.status(500).json({ error: msg });
  }
});

router.post("/digest", async (req, res) => {
  const { messages } = req.body as {
    messages: Array<{ id: string; text: string; source: string; server: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }

  const apiKey = process.env.QWEN_API_KEYY_BRAINIAC ?? process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

  const batch = messages.slice(0, 60);
  const msgList = batch
    .map((m, i) => `[${i}] id="${m.id}" source="${m.source}" server="${m.server}"\n${m.text}`)
    .join("\n\n");

  const systemPrompt = `You are a Web3 signal filter. Analyze community messages and classify each one.

Return ONLY valid JSON — no markdown, no explanation — in this exact format:
{"results":[{"id":"<id>","tag":"<tag>","hot":<bool>,"importance":<1-10>}]}

Tags: Alpha | Whale Alert | Vote | Launch | NFT | General
hot: true if time-sensitive, breaking, or high-signal
importance: 1=noise, 10=critical alpha — be selective, most messages are 1-4`;

  const userMessage = `Classify these ${batch.length} messages:\n\n${msgList}`;

  try {
    const raw = await callQwen(apiKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], { max_tokens: 1000, temperature: 0.2 });

    const jsonMatch = raw.match(/\{[\s\S]*"results"[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Could not parse AI response" });
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      results: Array<{ id: string; tag: string; hot: boolean; importance: number }>;
    };
    return res.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI service error";
    return res.status(500).json({ error: msg });
  }
});

export default router;
