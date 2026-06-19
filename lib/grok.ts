// lib/grok.ts
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';

const xai = createXai({ 
  apiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY 
});

export async function generateVibeCast(
  vibe: string,
  handle?: string,
  bio?: string,
  extraContext: string = ""
): Promise<string> {
  const VIBE_PROMPTS: Record<string, string> = {
    builder: "Write a short, punchy Farcaster cast under 280 characters from a Base ecosystem builder sharing real shipping progress. Confident, technical, no fluff, no hashtag spam. Sound like a real builder posting an update, not a marketing bot.",
    degen: "Write a short, punchy Farcaster cast under 280 characters with crypto-degen energy about market moves, alpha, or onchain activity on Base. Casual and energetic, but not cringe, scammy, or financial advice. No hashtag spam.",
    creator: "Write a short, punchy Farcaster cast under 280 characters about growing as a content creator and building community on Farcaster/Base. Warm, encouraging, focused on connection and growth. No hashtag spam.",
    family: "Write a short, punchy Farcaster cast under 280 characters about building on Base while balancing family life. Honest, grounded, no excessive emoji, sounds like a real dad who is also a builder.",
  };

  const systemPrompt = VIBE_PROMPTS[vibe] || VIBE_PROMPTS.family;

  const userContext = `Farcaster handle: @\( {handle || "afifarioss"}. \){bio ? ` Bio: ${bio}.` : ""} ${extraContext} Write ONE cast only. No quotation marks, no preamble — just the cast text.`;

  const { text: rawText } = await generateText({
    model: xai.responses('grok-4.3'),
    system: systemPrompt,
    prompt: userContext,
    temperature: 0.85,
    maxTokens: 180,
  });

  return rawText.trim();
}