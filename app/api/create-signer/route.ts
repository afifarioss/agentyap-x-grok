import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fid, username } = await request.json();
    if (!fid || !username) {
      return NextResponse.json({ error: "Missing fid or username" }, { status: 400 });
    }

    const neynarRes = await fetch("https://api.neynar.com/v2/farcaster/signer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
    });

    if (!neynarRes.ok) throw new Error("Neynar signer failed");

    const signer = await neynarRes.json();

    return NextResponse.json({
      signer_uuid: signer.signer_uuid,
      approval_url: signer.signer_approval_url || signer.deep_link_url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}