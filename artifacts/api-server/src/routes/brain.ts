import { Router } from "express";
import { GenerateDraftBody } from "@workspace/api-zod";

const router = Router();

const QWEN_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

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

const DEFAULT_FEED_CONTEXT = `
- Alpha drop: New DEX launching on Base with $200K liquidity incentives
- Whale wallet moved 500 ETH to Binance (possible sell pressure)
- LayerZero airdrop snapshot confirmed — deadline end of June
- Pudgy Penguins floor up 12% with Blur volume spike
- Community vote: Proposal #14 passed with 78% approval
`;

router.post("/generate", async (req, res) => {
  const parseResult = GenerateDraftBody.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { type, topic, feedContext } = parseResult.data;
  const apiKey = process.env.QWEN_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "QWEN_API_KEY not configured" });
  }

  const systemPrompt = `You are Brainiac, an AI writing assistant for Web3 creators and community builders.
Your job is to help users create engaging Web3 content in their voice — confident, informed, no fluff.
Keep the tone knowledgeable but accessible. No corporate speak. Be direct and punchy.`;

  const userMessage = `${TYPE_INSTRUCTIONS[type] || TYPE_INSTRUCTIONS.thread}

Topic: ${topic}

Context from today's Web3 feed:
${feedContext || DEFAULT_FEED_CONTEXT}

Write the full piece now.`;

  try {
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res
        .status(500)
        .json({ error: err.error?.message || "Qwen API error" });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content =
      data.choices?.[0]?.message?.content || "Could not generate draft.";

    return res.json({ content, type });
  } catch (err) {
    return res.status(500).json({ error: "Failed to connect to AI service" });
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

  const apiKey = process.env.QWEN_API_KEY;
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

  const feedSignals = feedContext?.trim() || `
- New DEX launching on Base tomorrow - $200K liquidity incentives, early LPs get 3x boost
- Whale wallet 0x7f3a moved 500 ETH to Binance (possible sell pressure signal)
- LayerZero airdrop snapshot confirmed - requires 5+ cross-chain txs, deadline end of June
- Pudgy Penguins floor up 12%, 340 ETH traded on Blur in 60 mins
- Proposal #14 passed in Base Builders DAO with 78% approval - 50K USDC for Q3 grants
- Arbitrum yield: 18% APY on stablecoin pairs via Camelot V4, audited, launching Thursday
- New mint: ApeXplorer dropping in 6h, free + 0.01 ETH gas, 5000 supply
`.trim();

  const systemPrompt = `You are Brainiac, the user's personal Web3 intelligence assistant. Write concise, personalized briefings like a knowledgeable friend catching them up. Reference their specific wallets by name. Be direct, no fluff. Format with bold headers (**Portfolio**, **Community Highlights**, **Action Items**) and bullet points under each.`;

  const userMessage = `Catch me up on the ${timeLabel}.

My wallets:
${walletContext}

My communities:
${communityContext}

My question: "${query?.trim() || "What did I miss?"}"

Recent signals from my communities:
${feedSignals}

Write a personalized briefing. Mention my wallet names where relevant. Flag anything time-sensitive.`;

  try {
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.6,
      }),
    });

    if (!response.ok) return res.status(500).json({ error: "AI service error" });

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const brief = data.choices?.[0]?.message?.content || "Could not generate briefing.";

    return res.json({ brief });
  } catch {
    return res.status(500).json({ error: "Failed to connect to AI service" });
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

  const apiKey = process.env.QWEN_API_KEY;
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
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 700,
        temperature: 0.5,
      }),
    });

    if (!response.ok) return res.status(500).json({ error: "AI service error" });
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content || "Could not generate analysis.";
    return res.json({ answer });
  } catch {
    return res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

router.post("/community-intel", async (req, res) => {
  const { question, communities } = req.body as {
    question?: string;
    communities?: Array<{ name: string; source: string }>;
  };

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

  const communityList = communities?.length
    ? communities.map((c) => `- ${c.name} on ${c.source}`).join("\n")
    : "- Web3 community (Discord + Telegram)";

  const metrics = `
Community intelligence snapshot (last 30 days):
- Peak activity: Mon-Fri 2PM-6PM UTC | Weekends 7PM-10PM UTC
- Dead zone: 2AM-8AM UTC daily (49% drop in message volume)
- Daily message volume: avg 847 messages, peaks at 2,100+ on announcement days
- Active member rate: 23% post at least once per week; 41% haven't posted in 14+ days
- Top topics by share: DeFi yields (34%), NFT launches (22%), Price action (18%), Protocol news (15%), Governance (11%)
- Fastest growing channel: #alpha-calls (+34% week-over-week)
- Highest-engagement content: exclusive alpha drops, price alerts, AMA announcements, "hot take" polls
- Top 3% of members generate 67% of total interactions
- Member growth: +23% last 30 days
- Avg response time on hot posts: 4 minutes
`;

  const systemPrompt = `You are Brainiac's community intelligence engine. You analyze Web3 community data and give community managers actionable, specific strategies. 

Format: use bold headers (**Timing Strategy**, **Content Strategy**, **Engagement Tactics**, **30-Day Action Plan**) with bullet points. Be specific — reference actual times, topics, and percentages from the data. No generic advice.`;

  const userMessage = `My communities:
${communityList}

${metrics}

Question: "${question?.trim() || "Give me a complete community intelligence report with a 30-day engagement strategy."}"

Be specific and actionable. Reference the actual metrics.`;

  try {
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 900,
        temperature: 0.6,
      }),
    });

    if (!response.ok) return res.status(500).json({ error: "AI service error" });
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const insights = data.choices?.[0]?.message?.content || "Could not generate insights.";
    return res.json({ insights });
  } catch {
    return res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

export default router;
