// lib/grok.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function generateVibeCast(
  vibe: string,
  handle?: string,
  bio?: string,
  extraContext: string = "",
  isAgent: boolean = true
): Promise<string> {
  const VIBE_PROMPTS: Record<string, string> = {
    builder: "Write a short, punchy Farcaster cast under 280 characters from a Base ecosystem builder sharing real shipping progress. Confident, technical, no fluff.",
    degen: "Write a short, punchy Farcaster cast under 280 characters with crypto-degen energy about market moves or Base activity. Casual and energetic.",
    creator: "Write a short, punchy Farcaster cast under 280 characters about growing as a content creator on Farcaster/Base. Warm and encouraging.",
    family: "Write a short, punchy Farcaster cast under 280 characters about building on Base as an Ipoh Dad balancing family life. Honest and grounded.",
  };

  const systemPrompt = VIBE_PROMPTS[vibe] || VIBE_PROMPTS.family;

  const userContext = `Farcaster handle: @${handle || "afifarioss"}.${bio ? ` Bio: ${bio}.` : ""} ${extraContext} Write ONE cast only. No quotation marks, no preamble — just the cast text.`;

  const completion = await client.chat.completions.create({
    model: 'grok-3',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContext }
    ],
    temperature: 0.85,
    max_tokens: 180,
  });

  const rawText = completion.choices[0].message.content || 'Building on Base 🟦';

  const cleaned = rawText
    .trim()
    .replace(/^["""]+|["""]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();

  const marker = isAgent ? " 🟦" : "";
  return cleaned + marker;
}