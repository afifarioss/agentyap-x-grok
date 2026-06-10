import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { signerUuid, text } = await request.json();

    if (!signerUuid || !text) {
      return NextResponse.json({ error: "Missing signerUuid or text" }, { status: 400 });
    }

    const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
      body: JSON.stringify({ signer_uuid: signerUuid, text }),
    });

    if (!res.ok) throw new Error("Failed to post cast");

    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}