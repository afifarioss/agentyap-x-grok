import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    if (!neynarRes.ok) throw new Error("Failed to create Neynar signer");

    const signer = await neynarRes.json();

    const { data: userData } = await supabase
      .from("users")
      .upsert({ fid, username }, { onConflict: "fid" })
      .select()
      .single();

    await supabase.from("signers").insert({
      user_id: userData.id,
      signer_uuid: signer.signer_uuid,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      signer_uuid: signer.signer_uuid,
      approval_url: signer.signer_approval_url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}