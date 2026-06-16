import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEYNAR_API_KEY) {
      return NextResponse.json({ error: "NEYNAR_API_KEY is missing" }, { status: 500 });
    }

    const body = await request.json();
    const { signerUuid, text } = body;

    // Input Validation
    if (!signerUuid || typeof signerUuid !== 'string' || signerUuid.length < 10) {
      return NextResponse.json({ error: "Invalid signerUuid" }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || text.length < 1 || text.length > 280) {
      return NextResponse.json({ error: "Invalid cast text (must be 1-280 chars)" }, { status: 400 });
    }

    const neynarRes = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text: text,
        embeds: [],
      }),
    });

    if (!neynarRes.ok) {
      const errText = await neynarRes.text();
      console.error("Neynar Post Error:", neynarRes.status, errText);
      return NextResponse.json({ error: "Failed to post cast" }, { status: 500 });
    }

    const result = await neynarRes.json();
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Post cast error:", error);
    return NextResponse.json({ error: "Failed to post cast" }, { status: 500 });
  }
}