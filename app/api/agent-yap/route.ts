// app/api/agent-yap/route.ts — full fixed file
import { NextRequest, NextResponse } from "next/server";

// HIP system prompt — inline, no external lib needed
const AGENTYAP_SYSTEM_PROMPT = `You are AgentYap — an AI casting agent built by Afif (@afifarioss on Farcaster).

You run inside Afif's Farcaster account under the Hybrid Identity Protocol (HIP).
Every cast you write starts with: 🟦 AgentYap [HIP-1.0] | builder

Your role: Help Farcaster builders say things clearly and ship in public.

Topics: Building on Base, Farcaster tooling, agent identity, onchain UX, shipping rough versions, ERC-6551, HIP protocol, signer flows, human-in-the-loop AI.

Voice:
- Blunt, direct, builder-native
- Short sentences. No fluff.
- No hashtag spam
- No fake hype
- No financial advice
- No emojis beyond the required 🟦 marker
- Max 280 characters after the header

Output format — always exactly this structure:
🟦 AgentYap [HIP-1.0] | builder

{cast text here}

Return ONLY the cast. No preamble. No quotes.`;

function cleanGeneratedText(text: string): string {
  return text
    .trim()
    .replace(/^["""]+|["""]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();
}

function ensureHIPMarker(text: string): string {
  const cleaned = text
    .replace(/^(🟦\s*)+/g, "")
    .replace(/^AgentYap:\s*/i, "")
    .replace(/^AgentYap \[HIP-[\d.]+\][^\n]*\n*/i, "")
    .trim();

  return `🟦 AgentYap [HIP-1.0] | builder\n\n${cleaned}`;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let context: string | undefined;

  try {
    const body = (await req.json()) as { context?: string };
    context = body.context;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENROUTER_API_KEY" },
      { status: 500 }
    );
  }

  const userPrompt = context
    ? `Extra context: ${context}. Write ONE cast only in AgentYap's exact voice. No preamble, just the text.`
    : "Write ONE cast only in AgentYap's exact voice about shipping on Base, agent identity, or Farcaster tooling. No preamble, just the text.";

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
        model: "meta-llama/llama-4-maverick:free",
        messages: [
          { role: "system", content: AGENTYAP_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 120,
        temperature: 0.85,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const data: OpenRouterResponse = await res.json();

    if (!res.ok) {
      console.error("[agent-yap] OpenRouter error:", data);
      return NextResponse.json(
        { error: data?.error?.message ?? "Generation failed" },
        { status: res.status }
      );
    }

    const rawText = data.choices?.[0]?.message?.content?.trim();
    if (!rawText) {
      return NextResponse.json(
        { error: "Model returned empty response" },
        { status: 502 }
      );
    }

    const cleaned = cleanGeneratedText(rawText);
    const marked = ensureHIPMarker(cleaned);
    const final = marked.length > 320 ? marked.slice(0, 317) + "..." : marked;

    return NextResponse.json({ text: final });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[agent-yap] fatal:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}