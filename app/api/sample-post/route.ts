// app/api/sample-post/route.ts
import { NextResponse } from "next/server";

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function POST(req: Request): Promise<NextResponse> {
  let vibe = "builder";
  let handle = "";
  let bio = "";
  
  try {
    const body = await req.json();
    vibe = body.vibe || "builder";
    handle = body.handle || "";
    bio = body.bio || "";
  } catch {
    // No body, use defaults
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
  }

  const vibePrompts: Record<string, string> = {
    builder: "Write a short, punchy Farcaster cast under 280 characters from a Base ecosystem builder. Confident, technical, no fluff, no hashtags.",
    degen: "Write a short, punchy Farcaster cast under 280 characters with crypto-degen energy about Base onchain activity. Not financial advice. No hashtags.",
    creator: "Write a short, punchy Farcaster cast under 280 characters about growing as a creator on Farcaster/Base. Warm, community-focused. No hashtags.",
    family: "Write a short, punchy Farcaster cast under 280 characters about building on Base while balancing family life. Honest, grounded. No hashtags.",
  };

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
          { role: "system", content: vibePrompts[vibe] || vibePrompts.builder },
          { role: "user", content: `Give me one sample cast${handle ? ` for @${handle}` : ""}${bio ? `. Context: ${bio}` : ""}.` },
        ],
        temperature: 0.85,
        max_tokens: 120,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    const data = (await res.json()) as OpenRouterResponse;
    if (!res.ok) return NextResponse.json({ error: data?.error?.message ?? "Generation failed" }, { status: res.status });

    const text = data.choices?.[0]?.message?.content?.trim() ?? "Sample cast ready.";
    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[sample-post]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
