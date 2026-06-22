import { getSignedKey } from "@/utils/getSignedKey";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const signedKey = await getSignedKey();
    return NextResponse.json(
      {
        signer_uuid: signedKey.signer_uuid,
        approval_url: signedKey.signer_approval_url,
        demo: false,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("create-signer error:", error);

    // Check for Neynar 402 (Payment Required / credits exhausted)
    const errorMessage = error.message || "";
    const is402 = 
      error.status === 402 || 
      errorMessage.includes("402") || 
      errorMessage.includes("Payment Required") ||
      errorMessage.includes("credits") ||
      errorMessage.includes("quota");

    if (is402) {
      return NextResponse.json(
        {
          demo: true,
          message: "Demo mode — Neynar API credits required for signer creation. You can still generate and preview casts. Publishing requires credits.",
          signer_uuid: null,
          approval_url: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || "An error occurred" },
      { status: 500 }
    );
  }
}
