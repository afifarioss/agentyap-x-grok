import { NextRequest, NextResponse } from 'next/server';

const GROK_API_KEY = process.env.GROK_API_KEY;

export async function POST(req: NextRequest) {
  const { vibe, handle, bio } = await req.json();
  try {
    const systemPrompt = `You are ${handle}, an Ipoh Dad building on Base. Bio: ${bio}. Vibe: ${vibe}. Write 1 short engaging Farcaster cast (max 280 chars). Authentic, family-first, Base focused.`;
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "grok-4.3", // or latest
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate one cast now." }],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "Fallback cast from Grok.";
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, text: "Grok unavailable — using demo cast." });
  }
}