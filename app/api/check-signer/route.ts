import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/check-signer?signerUuid=xxxx
 * Returns: { approved: boolean, status: string }
 *
 * Polled every 5s by the frontend while waiting for the user to
 * approve the signer in Warpcast.
 */
export async function GET(req: NextRequest) {
  try {
    const signerUuid = req.nextUrl.searchParams.get("signerUuid");
    if (!signerUuid) {
      return NextResponse.json({ error: "Missing signerUuid" }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfigured: missing NEYNAR_API_KEY" }, { status: 500 });
    }

    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/signer?signer_uuid=${signerUuid}`,
      {
        headers: { "x-api-key": apiKey },
      }
    );
    const data = await res.json();

    if (!res.ok) {
      console.error("Neynar check-signer error:", data);
      return NextResponse.json({ error: data?.message || "Failed to check signer" }, { status: res.status });
    }

    // Neynar returns status: "generated" | "pending_approval" | "approved" | "revoked"
    const approved = data.status === "approved";

    return NextResponse.json({ approved, status: data.status });
  } catch (e: any) {
    console.error("check-signer fatal error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
