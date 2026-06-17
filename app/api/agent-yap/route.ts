import { NextRequest, NextResponse } from "next/server";
import { AGENTYAP_SYSTEM_PROMPT } from "@/lib/agentyap-persona";
import { ensureAgentYapMarker } from "@/lib/ensure-agent-marker";

/**
 * POST /api/agent-yap
 * Body: { context?: string }   // optional extra context (e.g. "just shipped the new persona")
 * Returns: { text: string }    // always starts with 🟦
 *
 * Clean dedicated endpoint for AgentYap's own voice.
 * Use this when you want to post as the agent (manual for now).
 */
export async function POST(req: NextRequest) {
  try {
    const { context } = await req.json();

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROK_API_KEY" }, { status: 500 });
    }

    const userContext = context
      ? `Extra context: ${context}. Write ONE cast only in AgentYap's exact voice. No preamble, just the text.`
      : `Write ONE cast only in AgentYap's exact voice about shipping, Base, or helping phone builders. No preamble, just the text.`;

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: AGENTYAP_SYSTEM_PROMPT },
          { role: "user", content: userContext },
        ],
        max_tokens: 120,
        temperature: 0.85,
      }),
    });

    const grokData = await grokRes.json();

    if (!grokRes.ok) {
      console.error("Grok agent-yap error:", grokData);
      return NextResponse.json(
        { error: grokData?.error?.message || "Failed to generate" },
        { status: grokRes.status }
      );
    }

    let text = grokData.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "Grok returned empty" }, { status: 502 });
    }

    // Always enforce 🟦 + trim (this was the bug Jesse caught)
    text = ensureAgentYapMarker(text);

    // Safety trim for Farcaster limit
    const finalText = text.length > 320 ? text.slice(0, 317) + "..." : text;

    return NextResponse.json({ text: finalText });
  } catch (e: any) {
    console.error("agent-yap fatal error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}