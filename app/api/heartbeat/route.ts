// app/api/heartbeat/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const result = {
    status: "ok",
    time: new Date().toISOString(),
    version: "1.0.0",
  };
  return NextResponse.json(result);
}
