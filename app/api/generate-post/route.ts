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
};

function cleanGeneratedText(text: string) {
  return text
    .trim()
    .replace(/^["""]+|["""]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { vibe, handle, bio } = await req.json();

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

    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Server misconfigured: missing GROK_API_KEY",
        },
        {
          status: 500,
        }
      );
    }

    const systemPrompt = VIBE_PROMPTS[vibe];

    const userContext = `Farcaster handle: @${handle || "anon"}.${
      bio ? ` Bio/context: ${bio}` : ""
    } Write ONE cast only. No quotation marks, no preamble — just the cast text.`;

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
      console.error("Grok generate-post error:", grokData);

      return NextResponse.json(
        {
          error: grokData?.error?.message || "Failed to generate cast",
        },
        {
          status: grokRes.status,
        }
      );
    }

    const rawText = grokData.choices?.[0]?.message?.content?.trim();

    if (!rawText) {
      return NextResponse.json(
        {
          error: "Grok returned no content",
        },
        {
          status: 502,
        }
      );
    }

    const text = cleanGeneratedText(rawText);
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
}
