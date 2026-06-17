import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/create-signer
 * Body: { fid: number, username: string }
 * Returns: { signer_uuid: string, approval_url: string }
 *
 * Creates a managed signer via Neynar, returns the Warpcast deep-link
 * the user taps to approve AgentYap posting on their behalf.
 */
export async function POST(req: NextRequest) {
  try {
    const { fid, username } = await req.json();

    if (!fid) {
      return NextResponse.json({ error: "Missing fid" }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfigured: missing NEYNAR_API_KEY" }, { status: 500 });
    }

    // Step 1: create a signer
    const signerRes = await fetch("https://api.neynar.com/v2/farcaster/signer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });
    const signerData = await signerRes.json();

    if (!signerRes.ok) {
      console.error("Neynar create-signer error:", signerData);
      return NextResponse.json(
        { error: signerData?.message || "Failed to create signer" },
        { status: signerRes.status }
      );
    }

    const signerUuid = signerData.signer_uuid;

    // Step 2: register the signed key request (this is what generates
    // the approval_url the user taps in Warpcast)
    const fid_env = process.env.NEYNAR_APP_FID; // your app's FID
    const appPrivateKey = process.env.NEYNAR_APP_SIGNER_PRIVATE_KEY; // ed25519 key for signed_key_request

    if (!fid_env || !appPrivateKey) {
      // Fallback: some Neynar plans auto-generate approval_url on signer creation.
      if (signerData.signer_approval_url) {
        return NextResponse.json({
          signer_uuid: signerUuid,
          approval_url: signerData.signer_approval_url,
        });
      }
      return NextResponse.json(
        { error: "Server misconfigured: missing app FID or signer private key for signed_key_request" },
        { status: 500 }
      );
    }

    // If your Neynar plan requires manually registering the signed key request:
    const registerRes = await fetch(
      "https://api.neynar.com/v2/farcaster/signer/signed_key",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          signer_uuid: signerUuid,
          // deadline ~24h from now, in unix seconds
          deadline: Math.floor(Date.now() / 1000) + 86400,
        }),
      }
    );
    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      console.error("Neynar signed_key error:", registerData);
      return NextResponse.json(
        { error: registerData?.message || "Failed to register signed key request" },
        { status: registerRes.status }
      );
    }

    return NextResponse.json({
      signer_uuid: signerUuid,
      approval_url: registerData.signer_approval_url,
    });
  } catch (e: any) {
    console.error("create-signer fatal error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
