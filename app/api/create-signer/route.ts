import { getSignedKey } from "@/utils/getSignedKey";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const signedKey = await getSignedKey();
    return NextResponse.json(
      {
        signer_uuid: signedKey.signer_uuid,
        approval_url: signedKey.signer_approval_url,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("create-signer error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}