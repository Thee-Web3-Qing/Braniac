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

export default router;
