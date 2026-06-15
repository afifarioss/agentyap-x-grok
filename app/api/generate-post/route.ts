import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { vibe, handle, bio } = await request.json();

    if (!vibe || !handle) {
      return NextResponse.json({ error: "Missing vibe or handle" }, { status: 400 });
    }

    const systemPrompt = `You are a Farcaster content agent. Write short, engaging casts (max 280 chars) in the style of a real Base builder.`;

    const userPrompt = `Generate one Farcaster cast for user @${handle}.
Vibe: ${vibe}
Bio: ${bio || "Ipoh Dad building on Base for family"}

Make it authentic, valuable, and family-first if possible. No hashtags in the text.`;

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!grokRes.ok) {
      const err = await grokRes.text();
      console.error("Grok API error:", err);
      throw new Error("Grok generation failed");
    }

    const data = await grokRes.json();
    const generatedText = data.choices?.[0]?.message?.content?.trim() || 
      `Building real value on Base with @${handle}. Family First 💰 #Base`;

    return NextResponse.json({ text: generatedText });

  } catch (error: any) {
    console.error("Generate post error:", error);
    return NextResponse.json({ 
      text: `Real talk from Ipoh Dad @${handle || 'afifarioss'}: Building for family on Base. Family First 💰` 
    });
  }
}