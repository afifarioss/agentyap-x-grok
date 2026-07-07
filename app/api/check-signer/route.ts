import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const signerUuid = req.nextUrl.searchParams.get("signerUuid");
    if (!signerUuid) {
      return NextResponse.json({ error: "Missing signerUuid" }, { status: 400 });
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing NEYNAR_API_KEY" }, { status: 500 });
    }

    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/signer?signer_uuid=${signerUuid}`,
      { headers: { "x-api-key": apiKey } }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Neynar check-signer error:", data);
      return NextResponse.json(
        { error: data?.message || "Failed to check signer" },
        { status: res.status }
      );
    }

    const approved = data.status === "approved";
    return NextResponse.json({
      approved,
      status: data.status,
      approval_url: data.approval_url || null,
      public_key: data.public_key || null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("check-signer fatal error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

