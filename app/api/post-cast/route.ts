import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/post-cast
 * Body: { signerUuid: string, text: string }
 * Returns: { hash: string } (the cast hash) or { error: string }
 *
 * Publishes the approved cast to Farcaster via Neynar, using the
 * user's own approved signer.
 */
export async function POST(req: NextRequest) {
  try {
    const { signerUuid, text } = await req.json();

    if (!signerUuid || !text) {
      return NextResponse.json({ error: "Missing signerUuid or text" }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfigured: missing NEYNAR_API_KEY" }, { status: 500 });
    }

    const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Neynar post-cast error:", data);
      // Common case: signer not approved yet
      const message =
        data?.message?.includes("not approved")
          ? "Signer not approved yet — please approve in Warpcast first."
          : data?.message || "Failed to post cast";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json({ hash: data.cast?.hash });
  } catch (e: any) {
    console.error("post-cast fatal error:", e);
    return NextResponse.json({ error: e.message || "Internal error" }, { status: 500 });
  }
}
