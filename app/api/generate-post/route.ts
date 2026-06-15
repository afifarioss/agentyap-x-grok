import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { vibe, handle, bio } = await request.json();
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: "You are AgentYap. Generate short Farcaster post max 280 chars. End with emoji." },
          { role: "user", content: `Vibe: \( {vibe}. Handle: @ \){handle}. Bio: ${bio}` }
        ],
        max_tokens: 200,
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "Family First 💰 Building on Base";
    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}