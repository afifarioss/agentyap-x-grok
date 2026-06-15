import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { signerUuid, text } = await request.json();

    if (!signerUuid || !text) {
      return NextResponse.json({ error: "Missing signerUuid or text" }, { status: 400 });
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
      console.error("Neynar post error:", errText);
      return NextResponse.json({ error: "Failed to post cast" }, { status: 500 });
    }

    const result = await neynarRes.json();
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Post cast error:", error);
    return NextResponse.json({ error: "Failed to post cast" }, { status: 500 });
  }
}