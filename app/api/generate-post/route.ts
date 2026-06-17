import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/generate-post
 * Body: { vibe: string, handle: string, bio?: string }
 * Returns: { text: string }
 *
 * Calls xAI Grok to generate a Farcaster cast in the selected vibe.
 */

const VIBE_PROMPTS: Record<string, string> = {
  builder:
    "Write a short, punchy Farcaster cast (under 280 chars) from a Base ecosystem builder sharing real shipping progress. Confident, technical, no fluff, no hashtags spam. Sound like a real builder posting an update, not a marketing bot.",
  degen:
    "Write a short, punchy Farcaster cast (under 280 chars) with crypto-degen energy about market moves, alpha, or onchain activity on Base. Casual, a bit hype, but not cringe or scammy.",
  creator:
    "Write a short, punchy Farcaster cast (under 280 chars) about growing as a content creator and building community on Base. Warm, encouraging, focused on connection and growth.",
  family:
    "Write a short, punchy Farcaster cast (under 280 chars) that's real-talk about building on Base while balancing family life. Honest, grounded, no excessive emoji, sounds like a real dad who's also a builder.",
};

export async function POST(req: NextRequest) {
  try {
    const { vibe, handle, bio } = await req.json();

    if (!vibe || !VIBE_PROMPTS[vibe]) {
      return NextResponse.json({ error: "Invalid or missing vibe" }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfigured: missing GROK_API_KEY" }, { status: 500 });
    }

    const systemPrompt = VIBE_PROMPTS[vibe];
    const userContext = `Farcaster handle: @${handle || "anon"}.${bio ? ` Bio/context: ${bio}` : ""} Write ONE cast only. No quotation marks around it. No preamble, just the cast text itself.`;

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
        max_tokens: 150,
        temperature: 0.9,
      }),
    });

    const grokData = await grokRes.json();

    if (!grokRes.ok) {
      console.error("Grok API error:", grokData);
      return NextResponse.json(
        { error: grokData?.error?.message || "Failed to generate cast" },
        { status: grokRes.status }
      );
    }

    const text = grokData.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return NextResponse.json({ error: "Grok returned no content" }, { status: 502 });
    }

    // Hard safety: Farcaster cast limit is 320 bytes, trim if needed
    const trimmed = text.length > 320 ? text.slice(0, 317) + "..." : text;

    return NextResponse.json({ text: trimmed });
  } catch (e: any) {
    console.error("generate-post fatal error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
