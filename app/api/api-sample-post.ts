import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/sample-post
 * Body: { vibe: string, handle?: string, bio?: string }
 * Returns: { text: string }
 *
 * Same idea as /api/generate-post, but intentionally separate:
 * - No auth/signer required — called on the LANDING PAGE before sign-in
 * - Cheaper/faster settings (lower max_tokens) since it's just a teaser
 * - Should be rate-limited harder than generate-post since it's public
 *   and unauthenticated (anyone hammering this costs you Grok credits)
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

// 🔧 Very basic in-memory rate limit per IP. Resets on cold start —
// fine for a v1 launch, swap for Upstash/Redis if traffic gets real.
const hits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max sample generations per IP
const RATE_WINDOW_MS = 10 * 60 * 1000; // per 10 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const entry = hits.get(ip);

    if (entry && entry.resetAt > now) {
      if (entry.count >= RATE_LIMIT) {
        return NextResponse.json(
          { error: "Too many sample requests — try again in a few minutes." },
          { status: 429 }
        );
      }
      entry.count += 1;
    } else {
      hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    }

    const { vibe, handle, bio } = await req.json();

    if (!vibe || !VIBE_PROMPTS[vibe]) {
      return NextResponse.json({ error: "Invalid or missing vibe" }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfigured: missing GROK_API_KEY" }, { status: 500 });
    }

    const systemPrompt = VIBE_PROMPTS[vibe];
    const userContext = `Farcaster handle: @${handle || "anon"}.${bio ? ` Bio/context: ${bio}` : ""} Write ONE cast only, as a sample/teaser. No quotation marks, no preamble — just the cast text.`;

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
        max_tokens: 100,
        temperature: 0.9,
      }),
    });

    const grokData = await grokRes.json();

    if (!grokRes.ok) {
      console.error("Grok sample-post error:", grokData);
      return NextResponse.json(
        { error: grokData?.error?.message || "Failed to generate sample" },
        { status: grokRes.status }
      );
    }

    const text = grokData.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "Grok returned no content" }, { status: 502 });
    }

    const trimmed = text.length > 320 ? text.slice(0, 317) + "..." : text;
    return NextResponse.json({ text: trimmed });
  } catch (e: any) {
    console.error("sample-post fatal error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
