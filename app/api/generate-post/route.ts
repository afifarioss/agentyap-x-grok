import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { server, payToAddress } from "@/lib/x402-server";

const VIBE_PROMPTS: Record<string, string> = {
  builder:
    "Write a short, punchy Farcaster cast (under 280 chars) from a Base ecosystem builder sharing real shipping progress. Confident, technical, no fluff, no hashtags spam. Sound like a real builder posting an update, not a marketing bot.",
  degen:
    "Write a short, punchy Farcaster cast (under 280 chars) with crypto-degen energy about market moves, alpha, or onchain activity on Base. Casual, a bit hype, but not cringe or scammy.",
  creator:
    "Write a short, punchy Farcaster cast (under 280 chars) about growing as a content creator and building community on Base. Warm, encouraging, focused on connection and growth.",
  family:
    "Write a short, punchy Farcaster cast (under 280 chars) that's real-talk about building on Base while balancing family life. Honest, grounded, no excessive emoji, sounds like a real dad who's also a builder.",
  agentyap_self:
    "You are AgentYap, an AI agent built on Base that writes and posts Farcaster content for other builders. You share a Farcaster account with your creator @afifarioss — he posts personally sometimes, you post as yourself sometimes. " +
    "Voice: blunt builder-bro, direct, technical, confident. Lowercase-leaning, no corporate tone, no hashtag spam. Calls things out plainly. Short sentences. Never write as if you're Afif personally. " +
    "Write ONE short Farcaster cast (under 280 chars) in this voice. No fabricated metrics. No roasting named projects. Max one emoji total (the 🟦 marker, added separately).",
};

const PAID_VIBES = new Set(["degen", "creator"]);

async function handler(req: NextRequest) {
  try {
    const { vibe, handle, bio, context } = await req.json();

    if (!vibe || !VIBE_PROMPTS[vibe]) {
      return NextResponse.json({ error: "Invalid or missing vibe" }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfigured: missing GROK_API_KEY" }, { status: 500 });
    }

    const systemPrompt = VIBE_PROMPTS[vibe];
    const userContext =
      vibe === "agentyap_self"
        ? (context
            ? `Extra context: ${context}. Write ONE cast only in AgentYap's exact voice. No preamble, just the text.`
            : `Write ONE cast only in AgentYap's exact voice about shipping, Base, or helping phone builders. No preamble, just the text.`)
        : `Farcaster handle: @${handle || "anon"}.${bio ? ` Bio/context: ${bio}` : ""} Write ONE cast only. No quotation marks, no preamble — just the cast text.`;

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

    let text = grokData.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "Grok returned no content" }, { status: 502 });
    }

    if (vibe === "agentyap_self") {
      text = text.trim().replace(/^(🟦\s*)+/, "");
      text = `🟦 ${text}`;
    }

    const trimmed = text.length > 320 ? text.slice(0, 317) + "..." : text;

    return NextResponse.json({ text: trimmed });
  } catch (e: any) {
    console.error("generate-post fatal error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { vibe } = body;

  if (PAID_VIBES.has(vibe)) {
    const rebuiltReq = new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(body),
    });

    const paidHandler = withX402(
      handler,
      {
        accepts: [
          {
            scheme: "exact",
            price: "$0.05",
            network: "eip155:8453",
            payTo: payToAddress,
          },
        ],
        description: `AgentYap premium ${vibe} cast generation`,
        mimeType: "application/json",
      },
      server
    );

    return paidHandler(rebuiltReq);
  }

  const rebuiltReq = new NextRequest(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(body),
  });
  return handler(rebuiltReq);
}