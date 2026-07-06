import { NextRequest, NextResponse } from "next/server";

const VIBE_SAMPLES: Record<string, string> = {
  builder:
    "Shipped a small UI fix today. Nothing flashy, but it unblocks the next feature. That's the builder grind. 🟦",
  degen:
    "Base gas is basically free again. Might be time to rotate some positions. Not advice, just vibes. 🟦",
  creator:
    "The best content strategy on Farcaster? Show up every day and reply to 5 people genuinely. 🟦",
  family:
    "3 kids asleep, finally pushing code. Dad builders run on coffee and sheer willpower. 🟦",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      vibe?: string;
      handle?: string;
      bio?: string;
    };
    const { vibe } = body;

    if (!vibe || !VIBE_SAMPLES[vibe]) {
      return NextResponse.json({ error: "Invalid vibe" }, { status: 400 });
    }

    return NextResponse.json({ text: VIBE_SAMPLES[vibe] });
 
