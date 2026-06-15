import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { vibe, handle, bio } = await request.json();
    const prompt = `Post for Ipoh Dad @\( {handle} ( \){vibe}). Bio: ${bio || 'Family First 💰'}. Real talk, short, engaging.`;

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-beta", // stable model
        messages: [
          { role: "system", content: "You are AgentYap - helpful Farcaster agent for Base builders. Max 280 chars. End with emoji." },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content?.trim() || "Ipoh Dad building on Base Family First 💰 @afifarioss";
    text = text.replace(/^["']|["']$/g, "");

    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}