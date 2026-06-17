
import { NextRequest, NextResponse } from "next/server";

const VIBE_PROMPTS: Record<string, string> = {
  builder:
    "Write a short, punchy Farcaster cast under 280 characters from a Base ecosystem builder sharing real shipping progress. Confident, technical, no fluff, no hashtag spam. Sound like a real builder posting an update, not a marketing bot.",

  degen:
    "Write a short, punchy Farcaster cast under 280 characters with crypto-degen energy about market moves, alpha, or onchain activity on Base. Casual and energetic, but not cringe, scammy, or financial advice. No hashtag spam.",

  creator:
    "Write a short, punchy Farcaster cast under 280 characters about growing as a content creator and building community on Farcaster/Base. Warm, encouraging, focused on connection and growth. No hashtag spam.",

  family:
    "Write a short, punchy Farcaster cast under 280 characters about building on Base while balancing family life. Honest, grounded, no excessive emoji, sounds like a real dad who is also a builder.",

  agentyap_self:
    "You are AgentYap, an AI agent built on Base that writes and posts Farcaster content for builders. You share a Farcaster account with your creator @afifarioss — he posts personally sometimes, you post as AgentYap sometimes. Voice: blunt builder-bro, direct, technical, confident. Lowercase-leaning, no corporate tone, no hashtag spam. Calls things out plainly. Short sentences. Never write as if you're Afif personally. Write ONE short Farcaster cast under 280 characters in this voice. No fabricated metrics. No roasting named projects. Max one emoji total.",
};

function cleanGeneratedText(text: string) {
  return text
    .trim()
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();
}

async function callGrok({
  systemPrompt,
  userContext,
}: {
  systemPrompt: string;
  userContext: string;
}) {
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey) {
    throw new Error("Server misconfigured: missing GROK_API_KEY");
  }

  const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROK_MODEL || "grok-4.3",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userContext,
        },
      ],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });

  const grokData = await grokRes.json();

  if (!grokRes.ok) {
    console.error("Grok API error:", grokData);
    throw new Error(grokData?.error?.message || "Failed to generate cast");
  }

  const text = grokData.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Grok returned no content");
  }

  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { vibe, handle, bio, context } = await req.json();

    if (!vibe || !VIBE_PROMPTS[vibe]) {
      return NextResponse.json(
        {
          error: "Invalid or missing vibe",
        },
        {
          status: 400,
        }
      );
    }

    const systemPrompt = VIBE_PROMPTS[vibe];

    const userContext =
      vibe === "agentyap_self"
        ? context
          ? `Extra context: ${context}. Write ONE cast only in AgentYap's exact voice. No preamble, just the text.`
          : "Write ONE cast only in AgentYap's exact voice about shipping, Base, or helping small builders. No preamble, just the text."
        : `Farcaster handle: @${handle || "anon"}.${
            bio ? ` Bio/context: ${bio}` : ""
          } Write ONE cast only. No quotation marks, no preamble — just the cast text.`;

    let text = await callGrok({
      systemPrompt,
      userContext,
    });

    text = cleanGeneratedText(text);

    if (vibe === "agentyap_self") {
      text = text.replace(/^(🟦\s*)+/, "").trim();
      text = `🟦 ${text}`;
    }

    const trimmed = text.length > 320 ? text.slice(0, 317) + "..." : text;

    return NextResponse.json({
      text: trimmed,
    });
  } catch (e: any) {
    console.error("generate-post fatal error:", e);

    return NextResponse.json(
      {
        error: e.message || "Internal error",
      },
      {
        status: 500,
      }
    );
  }