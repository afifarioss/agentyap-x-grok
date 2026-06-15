import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, username } = body;

    if (!fid || !username) {
      return NextResponse.json({ error: "Missing fid or username" }, { status: 400 });
    }

    // Call Neynar directly
    const neynarRes = await fetch("https://api.neynar.com/v2/farcaster/signer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
    });

    if (!neynarRes.ok) {
      const errorText = await neynarRes.text();
      console.error("Neynar API Error:", errorText);
      return NextResponse.json({ error: "Neynar signer creation failed. Check API key." }, { status: 500 });
    }

    const signer = await neynarRes.json();

    return NextResponse.json({
      signer_uuid: signer.signer_uuid,
      approval_url: signer.signer_approval_url || signer.deep_link_url,
    });

  } catch (error: any) {
    console.error("Signer route error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}
