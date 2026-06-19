// app/api/heartbeat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { heartbeat } from "@/lib/agent-brain";

export async function GET(req: NextRequest) {
  const result = await heartbeat();
  return NextResponse.json(result);
}