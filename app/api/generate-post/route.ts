import { NextRequest, NextResponse } from "next/server";

const VIBE_PROMPTS: Record<string, string> = {
  builder:
    "You are a Base ecosystem builder. Write ONE short, punchy Farcaster cast under 280 characters. Confident, technical, no fluff, no hashtag spam. Sound like someone who actually ships.",
  degen:
    "You are a Base-native degen. Write ONE short, punchy Farcaster cast under 280 characters. High signal, community-first, natural crypto vocabulary. No fake pumping. No hashtag spam.",
  creator:
    "You are a creator building on Farcaster and Base. Write ONE short, punchy Farcaster cast under 280 characters. Warm, collaborative, genuine. No hashtag spam.",
  family:
    "You are a family man from Ipoh, Malaysia building on Base between parenting shifts. Write ONE short, punchy Farcaster cast under 280 characters. Honest, grounded, real dad energy. No fake sentimentality. No hashtag spam.",
};

const DAILY_TYPE_PROMPTS: Record<string, string> = {
  update:
    "Write ONE short Farcaster cast under 280 characters as a builder update — what you shipped, built, or deployed today. Direct, no fluff.",
  lesson:
    "Write ONE short Farcaster cast under 280 characters sharing one lesson you learned today. Humble, reflective, helpful to others.",
  question:
    "Write ONE short Farcaster cast under 280 characters asking your Farcaster community a genuine question. Engaging, open-ended, no fluff.",
};

const MODEL_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",
];

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: number };
}

function clean(text: string): string {
  return text
    .trim()
    .replace(/^[""''']+|[""''']+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .replace(/^(Here is|Here's)\s+(a\s+)?cast[:\s]*/i, "")
    .trim();
}

function classifyError(status: number, message: string): string {
  const msg = message.toLowerCase();
  if (status === 401 || msg.includes("auth") || msg.includes("missing authentication")) {
    return "Invalid or missing OpenRouter API key. Check your OPENROUTER_API_KEY environment variable.";
  }
  if (status === 429 || msg.includes("rate limit")) {
    return "Rate limited by OpenRouter. Wait a moment and try again.";
  }
  if (status >= 500 || msg.includes("overloaded") || msg.includes("unavailable")) {
    return "AI provider is temporarily down. Try again in a few seconds.";
  }
  return message;
}

async function tryModel(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
        temperature: 0.8,
        max_tokens: 150,
        top_p: 0.9,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      return {
        ok: false,
        error: `Provider returned ${res.status} (non-JSON): ${text.slice(0, 200)}`,
        status: res.status,
      };
    }

    const data = (await res.json()) as OpenRouterResponse;

    if (!res.ok) {
      return {
        ok: false,
        error: classifyError(res.status, data?.error?.message ?? "Generation failed"),
        status: res.status,
      };
    }

    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const text = clean(raw);
    if (!text) {
      return { ok: false, error: "Model returned empty text", status: 502 };
    }
    return { ok: true, text };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : "Network error";
    if (msg.includes("abort")) {
      return { ok: false, error: "AI request timed out after 15s", status: 504 };
    }
    return { ok: false, error: msg, status: 500 };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let vibe: string;
  let handle: string | undefined;
  let bio: string | undefined;
  let dailyType: string | undefined;

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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!vibe || !VIBE_PROMPTS[vibe]) {
    return NextResponse.json(
      { error: `Invalid or missing vibe. Must be one of: ${Object.keys(VIBE_PROMPTS).join(", ")}` },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: OPENROUTER_API_KEY is not set" },
      { status: 500 }
    );
  }

  if (!apiKey.startsWith("sk-or-v1-") && !apiKey.startsWith("sk-or-")) {
    console.error("[generate-post] OPENROUTER_API_KEY has invalid format");
    return NextResponse.json(
      { error: "Server misconfiguration: OPENROUTER_API_KEY format is invalid" },
      { status: 500 }
    );
  }

  const systemPrompt = dailyType && DAILY_TYPE_PROMPTS[dailyType]
    ? DAILY_TYPE_PROMPTS[dailyType]
    : VIBE_PROMPTS[vibe];

  const userPrompt = [
    "Write ONE Farcaster cast only.",
    handle ? `Author: @${handle}` : null,
    bio ? `Context: ${bio}` : null,
    "Rules: Under 280 characters. No quotes. No preamble. No 'Here is a cast' intro. Just the raw text.",
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
  }

  return NextResponse.json(
    { error: `All AI providers failed. ${lastError}` },
    { status: lastStatus }
  );
}
