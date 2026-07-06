import { NextRequest, NextResponse } from "next/server";
import { heartbeat } from "@/lib/agent-brain";

export async function GET(req: NextRequest) {
  // Security: Verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await heartbeat();
  return NextResponse.json(result);
}
