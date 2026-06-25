import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const buttonIndex = body.untrustedData?.buttonIndex ?? 1;
  
  const vibes = ["builder", "degen", "creator", "family"];
  const vibe = vibes[buttonIndex - 1] ?? "builder";

  const gen = await fetch(
    "https://agentyap-x-grok.vercel.app/api/generate-post",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vibe }),
    }
  );
  
  const { text } = await gen.json();

  return NextResponse.json({
    type: "frame",
    frame: {
      version: "next",
      title: "AgentYap",
      image: `https://placehold.co/600x400/0052FF/FFFFFF?text=${encodeURIComponent(text.slice(0, 40))}`,
      input: { text: { placeholder: text.slice(0, 280) } },
      buttons: [
        { label: "Builder", action: "post" },
        { label: "Degen", action: "post" },
        { label: "Post →", action: "link", target: `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}` },
      ],
      postUrl: "https://agentyap-x-grok.vercel.app/api/frame",
    },
  });
}

