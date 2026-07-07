import { NextRequest, NextResponse } from "next/server";

const VIBE_PROMPTS: Record<string, string> = {
  builder:
    "Write a short, punchy Farcaster cast under 280 characters from a Base ecosystem builder sharing real shipping progress. Confident, technical, no fluff, no hashtag spam.",
  degen:
    "Write a short, punchy Farcaster cast under 280 characters with crypto-degen energy about Base onchain activity. Not financial advice. No hashtag spam.",
  creator:
    "Write a short, punchy Farcaster cast under 280 characters about growing as a creator on Farcaster/Base. Warm, community-focused. No hashtag spam.",
  family:
    "Write a short, punchy Farcaster cast under 280 characters about building on Base while balancing family life. Honest, grounded, real dad energy.",
};

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function clean(text: string): string {
  return text
    .trim()
    .replace(/^["""''']+|["""''']+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY" },
      { status: 500 }
    );
  }

  const userPrompt = [
    "Write ONE Farcaster cast.",
    handle ? `Handle: @${handle}` : null,
    bio ? `Context: ${bio}` : null,
    "Under 280 chars. No quotes. No preamble.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://agentyap-x-grok.vercel.app",
        "X-Title": "AgentYap",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // FIX: llama-4-maverick:free was delisted. Swapped to the current
        // live free slug (verified July 2026). Re-check openrouter.ai/models
        // periodically since free slugs rotate without notice.
        model: "openai/gpt-oss-120b:free",
        messages: [
          { role: "system", content: VIBE_PROMPTS[vibe] },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 120,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = (await res.json()) as OpenRouterResponse;

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Generation failed" },
        { status: res.status }
      );
    }

    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const text = clean(raw);
    const trimmed = text.length > 320 ? text.slice(0, 317) + "..." : text;

    return NextResponse.json({ text: trimmed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[generate-post]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
