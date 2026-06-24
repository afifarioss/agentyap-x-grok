// app/api/sample-post/route.ts
// Unchanged logic — just swaps grok import to openai
import { NextRequest, NextResponse } from "next/server";
import { generateVibeCast } from "@/lib/openai";

const VIBE_PROMPTS: Record<string, string> = {
  builder:
    "Write a short punchy Farcaster cast under 280 chars from a Base ecosystem builder sharing real shipping progress.",
  degen:
    "Write a short punchy Farcaster cast under 280 chars with Base degen energy. No financial advice.",
  creator:
    "Write a short punchy Farcaster cast under 280 chars about creating and building community on Farcaster/Base.",
  family:
    "Write a short punchy Farcaster cast under 280 chars about building on Base while balancing family life.",
};

type RateLimitEntry = { count: number; resetAt: number };
const hits = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT) return false;
    entry.count += 1;
    return true;
  }
  hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  return true;
}

function cleanText(text: string): string {
  return text
    .trim()
    .replace(/^["""]+|["""]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests — try again in a few minutes." },
      { status: 429 }
    );
  }

  let vibe: string, handle: string | undefined, bio: string | undefined;

  try {
    const body = (await req.json()) as {
      vibe?: string;
      handle?: string;
      bio?: string;
    };
    vibe = body.vibe ?? "";
    handle = body.handle;
    bio = body.bio;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!vibe || !VIBE_PROMPTS[vibe]) {
    return NextResponse.json(
      { error: "Invalid or missing vibe" },
      { status: 400 }
    );
  }

  try {
    const raw = await generateVibeCast(
      vibe,
      handle,
      bio,
      "Write ONE cast only as a sample teaser."
    );
    const text = cleanText(raw);
    return NextResponse.json({
      text: text.length > 320 ? text.slice(0, 317) + "..." : text,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[sample-post]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}