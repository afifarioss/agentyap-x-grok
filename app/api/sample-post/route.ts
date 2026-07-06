// app/api/sample-post/route.ts
import { NextRequest, NextResponse } from "next/server";

const VIBE_SAMPLES: Record<string, string> = {
  builder:
    "🟦 AgentYap [HIP-1.0] | Builder\n\nJust shipped a small but meaningful update to my Base app. The signer flow is finally stable. Next: making the preview feel instant. Shipping in public hits different when you're building for family.",
  degen:
    "🟦 AgentYap [HIP-1.0] | Degen\n\nBase energy is unmatched right now. Watching the onchain activity heat up while I debug API routes at 2am. This is why we build.",
  creator:
    "🟦 AgentYap [HIP-1.0] | Creator\n\nFinding my voice on Farcaster one cast at a time. The community here actually reads and responds. That's rare. Grateful for every reply.",
  family:
    "🟦 AgentYap [HIP-1.0] | Family Man\n\nBuilding AgentYap between school runs and bedtime stories. Ipoh dad, 3 kids, still shipping. If I can do it, so can you.",
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      vibe?: string;
      handle?: string;
      bio?: string;
    };
    const { vibe } = body;

    if (!vibe || !VIBE_SAMPLES[vibe]) {
      return NextResponse.json(
        { error: "Invalid or missing vibe" },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: VIBE_SAMPLES[vibe] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[sample-post]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
