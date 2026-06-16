import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { fid } = await req.json();
    if (!fid || !NEYNAR_API_KEY) throw new Error("Missing FID or NEYNAR_API_KEY");

    const res = await fetch('https://api.neynar.com/v2/farcaster/signer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': NEYNAR_API_KEY },
      body: JSON.stringify({ fid }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Signer creation failed');

    return NextResponse.json({ signer_uuid: data.signer_uuid, approval_url: data.signer_approval_url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}