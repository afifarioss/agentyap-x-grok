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
        model: "grok-4.3",
        messages: [
          { role: "system", content: "You are a Farcaster AI agent. Generate ONE short post max 280 chars. End with 1 emoji. Sound human." },
          { role: "user", content: `Post for @${handle}. Vibe: ${vibe}. ${bio ? `Bio: ${bio}` : ""}\nReturn only the text.` }
        ],
        max_tokens: 280,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "Error generating post";

    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}