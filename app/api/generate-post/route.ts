import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROK_API_KEY) {
      return NextResponse.json({ error: "GROK_API_KEY is missing" }, { status: 500 });
    }

    const body = await request.json();
    const { vibe, handle, bio } = body;

    // Input Validation
    if (!vibe || typeof vibe !== 'string' || vibe.length > 50) {
      return NextResponse.json({ error: "Invalid vibe" }, { status: 400 });
    }
    if (!handle || typeof handle !== 'string' || handle.length > 30 || !/^[a-zA-Z0-9_]+$/.test(handle)) {
      return NextResponse.json({ error: "Invalid Farcaster handle" }, { status: 400 });
    }
    if (bio && (typeof bio !== 'string' || bio.length > 200)) {
      return NextResponse.json({ error: "Bio too long" }, { status: 400 });
    }

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful Farcaster content agent. Write short, natural casts (under 250 chars) for Base builders. Keep it real and valuable." 
          },
          { 
            role: "user", 
            content: `Generate ONE Farcaster cast for @${handle}.
Vibe: ${vibe}
Bio: ${bio || "Building on Base for family"}` 
          }
        ],
        max_tokens: 120,
        temperature: 0.7,
      }),
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text();
      console.error("Grok API failed:", grokRes.status, errText);
      throw new Error(`Grok error ${grokRes.status}`);
    }

    const data = await grokRes.json();
    let text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("No content from Grok");
    }

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("Generate post error:", error.message);
    
    const { handle = 'afifarioss' } = await request.json().catch(() => ({}));

    return NextResponse.json({ 
      text: `Real talk from Ipoh Dad @${handle}. Building sustainable wealth on Base for family. Family First 💰` 
    });
  }
}