// app/api/complete-signer/route.ts
import { NextResponse } from "next/server";
import { registerSignedKeyAfterApproval } from "../../../utils/getSignedKey";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { signer_uuid: signerUuid, public_key: publicKey } = body;

    if (!signerUuid || !publicKey) {
      return NextResponse.json({ error: "Missing signer_uuid or public_key" }, { status: 400 });
    }

    try {
      const res = await registerSignedKeyAfterApproval(signerUuid, publicKey);
      return NextResponse.json({ success: true, result: res });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      console.error("[complete-signer] registration error:", e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[complete-signer] fatal:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
