import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check Neynar Key
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json({ 
        error: "NEYNAR_API_KEY is missing in Vercel" 
      }, { status: 500 });
    }

    const { signerUuid, text } = await request.json();

    if (!signerUuid || typeof signerUuid !== 'string') {
      return NextResponse.json({ error: "Missing or invalid signerUuid" }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || text.length > 280) {
      return NextResponse.json({ error: "Invalid cast text" }, { status: 400 });
    }

    const neynarRes = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text: text.trim(),
        embeds: [],
      }),
    });

    if (!neynarRes.ok) {
      const errText = await neynarRes.text();
      console.error("Neynar Error:", neynarRes.status, errText);
      return NextResponse.json({ 
        error: `Neynar failed: ${neynarRes.status}` 
      }, { status: 500 });
    }

    const result = await neynarRes.json();
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Post cast error:", error);
    return NextResponse.json({ error: "Failed to post cast" }, { status: 500 });
  }
}