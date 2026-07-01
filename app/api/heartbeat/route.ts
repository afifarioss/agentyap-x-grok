// app/api/heartbeat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { heartbeat } from "@/lib/agent-brain";

export async function GET(req: NextRequest) {
  // Security: Only allow from Vercel Cron or with secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await heartbeat();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    ...result,
  });
}
