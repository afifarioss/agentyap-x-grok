import { getSignedKey } from "@/utils/getSignedKey";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const signedKey = await getSignedKey();
    return NextResponse.json(signedKey, { status: 200 });
  } catch (error: any) {
    console.error("Signer creation error:", error);
    return NextResponse.json(
      { error: error.message || "Signer creation failed" },
      { status: 500 }
    );
  }
}