import { NextRequest, NextResponse } from "next/server";

const MODEL_FALLBACKS = [
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-20b:free",
];

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: number };
}

function cleanGeneratedText(text: string): string {
  return text
    .trim()
    .replace(/^[""''']+|[""''']+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .replace(/^(Here is|Here's)\s+(a\s+)?cast[:\s]*/i, "")
    .trim();
}

function ensureHIPMarker(text: string, vibe: string): string {
  const cleaned = text
    .replace(/^(🟦\s*)+/g, "")
    .replace(/^AgentYap:\s*/i, "")
    .replace(/^AgentYap \[HIP-[\d.]+\][^\n]*\n*/i, "")
    .trim();

  return `🟦 AgentYap [HIP-1.0] | ${vibe}\n\n${cleaned}`;
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

function buildSystemPrompt(vibe: string): string {
  return `You are AgentYap — an AI casting agent built by Afif (@afifarioss on Farcaster).

You run inside Afif's Farcaster account under the Hybrid Identity Protocol (HIP).
Every cast you write starts with: 🟦 AgentYap [HIP-1.0] | ${vibe}

Your role: Help Farcaster builders say things clearly and ship in public.

Topics: Building on Base, Farcaster tooling, agent identity, onchain UX, shipping rough versions, HIP protocol, signer flows, human-in-the-loop AI.

Voice:
- Blunt, direct, builder-native
- Short sentences. No fluff.
- No hashtag spam
- No fake hype
- No financial advice
- No emojis beyond the required 🟦 marker
- Max 280 characters after the header

Output format — always exactly this structure:
🟦 AgentYap [HIP-1.0] | ${vibe}

{cast text here}

Return ONLY the cast. No preamble. No quotes. No "Here is a cast" intro.`;
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
        max_tokens: 120,
        temperature: 0.8,
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

    const rawText = data.choices?.[0]?.message?.content?.trim();
    if (!rawText) {
      return { ok: false, error: "Model returned empty response", status: 502 };
    }
    return { ok: true, text: rawText };
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
  let context: string | undefined;
  let vibe: string = "builder";

  try {
    const body = (await req.json()) as { context?: string; vibe?: string };
    context = body.context;
    if (body.vibe && ["builder", "degen", "creator", "family"].includes(body.vibe)) {
      vibe = body.vibe;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: OPENROUTER_API_KEY is not set" },
      { status: 500 }
    );
  }

  if (!apiKey.startsWith("sk-or-v1-") && !apiKey.startsWith("sk-or-")) {
    console.error("[agent-yap] OPENROUTER_API_KEY has invalid format");
    return NextResponse.json(
      { error: "Server misconfiguration: OPENROUTER_API_KEY format is invalid" },
      { status: 500 }
    );
  }

  const systemPrompt = buildSystemPrompt(vibe);

  const userPrompt = context
    ? `Extra context: ${context}. Write ONE cast only in AgentYap's exact voice. No preamble, just the text.`
    : "Write ONE cast only in AgentYap's exact voice about shipping on Base, agent identity, or Farcaster tooling. No preamble, just the text.";

  let lastError = "Generation failed";
  let lastStatus = 500;

  for (const model of MODEL_FALLBACKS) {
    const result = await tryModel(model, apiKey, systemPrompt, userPrompt);
    if (result.ok) {
      const cleaned = cleanGeneratedText(result.text);
      const marked = ensureHIPMarker(cleaned, vibe);
      const final = marked.length > 320 ? marked.slice(0, 317) + "..." : marked;
      return NextResponse.json({ text: final, model, vibe });
    }
    console.error(`[agent-yap] ${model} failed:`, result.error);
    lastError = result.error;
    lastStatus = result.status;
  }

  return NextResponse.json(
    { error: `All AI providers failed. ${lastError}` },
    { status: lastStatus }
  );
}
