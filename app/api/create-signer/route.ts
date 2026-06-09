import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { fid, username } = await request.json();

    if (!fid || !username) {
      return NextResponse.json({ error: "Missing fid or username" }, { status: 400 });
    }

    // Create signer menggunakan Neynar
    const neynarRes = await fetch("https://api.neynar.com/v2/farcaster/signer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
    });

    if (!neynarRes.ok) {
      throw new Error("Failed to create Neynar signer");
    }

    const signer = await neynarRes.json();

    // Simpan user ke database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .upsert({ fid, username }, { onConflict: "fid" })
      .select()
      .single();

    if (userError) throw userError;

    // Simpan signer
    const { error: signerError } = await supabase.from("signers").insert({
      user_id: userData.id,
      signer_uuid: signer.signer_uuid,
      status: "pending",
    });

    if (signerError) throw signerError;

    return NextResponse.json({
      success: true,
      signer_uuid: signer.signer_uuid,
      approval_url: signer.signer_approval_url,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}