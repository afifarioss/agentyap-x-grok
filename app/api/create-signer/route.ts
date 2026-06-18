import { getcreate-signer} from "@/utils/getcreate-signer";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const create-signer = await getcreate-signer();
    return NextResponse.json(
      {
        signer_uuid: create-signer-uuid,
        approval_url: create-signer_approval_url,
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