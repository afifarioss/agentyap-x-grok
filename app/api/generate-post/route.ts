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

const DAILY_TYPE_PROMPTS: Record<string, string> = {
  update:
    "Write a short Farcaster cast under 280 characters as a builder update — what you shipped, built, or deployed today. Direct, no fluff.",
  lesson:
    "Write a short Farcaster cast under 280 characters sharing one lesson you learned today. Humble, reflective, helpful to others.",
  question:
    "Write a short Farcaster cast under 280 characters asking your Farcaster community a genuine question. Engaging, open-ended, no fluff.",
};

// Fallback chain — free-tier OpenRouter models can flake independently.
// Try each in order until one succeeds instead of failing on the first miss.
const MODEL_FALLBACKS = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-4-maverick:free",
  "google/gemini-2.0-flash-exp:free",
];

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function clean(text: string): string {
  return text
    .trim()
    .replace(/^[""''']+|[""''']+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();
}

async function tryModel(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://agentyap-x-grok.vercel.app",
        "X-Title": "AgentYap",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
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
      return {
        ok: false,
        error: data?.error?.message ?? "Generation failed",
        status: res.status,
      };
    }

    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const text = clean(raw);
    if (!text) {
      return { ok: false, error: "Empty response from provider", status: 502 };
    }
    return { ok: true, text };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : "Internal error";
    return { ok: false, error: msg, status: 500 };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let vibe: string, handle: string | undefined, bio: string | undefined, dailyType: string | undefined;

  try {
    const body = (await req.json()) as {
      vibe?: string;
      handle?: string;
      bio?: string;
      dailyType?: string;
    };
    vibe = body.vibe ?? "";
    handle = body.handle;
    bio = body.bio;
    dailyType = body.dailyType;
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

  const systemPrompt = dailyType && DAILY_TYPE_PROMPTS[dailyType]
    ? DAILY_TYPE_PROMPTS[dailyType]
    : VIBE_PROMPTS[vibe];

  const userPrompt = [
    "Write ONE Farcaster cast.",
    handle ? `Handle: @${handle}` : null,
    bio ? `Context: ${bio}` : null,
    "Under 280 chars. No quotes. No preamble.",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError = "Generation failed";
  let lastStatus = 500;

  for (const model of MODEL_FALLBACKS) {
    const result = await tryModel(model, apiKey, systemPrompt, userPrompt);
    if (result.ok) {
      const trimmed = result.text.length > 320 ? result.text.slice(0, 317) + "..." : result.text;
      return NextResponse.json({ text: trimmed, model });
    }
    console.error(`[generate-post] ${model} failed:`, result.error);
    lastError = result.error;
    lastStatus = result.status;
    // keep trying the next model in the chain
  }

  // All fallbacks exhausted
  return NextResponse.json(
    { error: `All providers failed. Last error: ${lastError}` },
    { status: lastStatus }
  );
}

