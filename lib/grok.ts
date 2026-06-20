// lib/grok.ts
// Simple free version — no API call

export async function generateVibeCast(
  vibe: string,
  handle?: string,
  bio?: string,
  extraContext: string = "",
  isAgent: boolean = true
): Promise<string> {
  const VIBE_PROMPTS: Record<string, string> = {
    builder: "Just shipped something cool on Base. Real progress, no hype. Building for the long term. #BuildOnBase",
    degen: "Base is cooking. Staying based and collecting alpha. Degens know. #Base",
    creator: "Growing on Farcaster one cast at a time. Community is everything. Let's build together.",
    family: "Ipoh Dad building on Base while raising family. Family first. Real talk. Real plays. 💰",
  };

  let text = VIBE_PROMPTS[vibe as keyof typeof VIBE_PROMPTS] || VIBE_PROMPTS.family;

  if (extraContext) {
    text = text + " " + extraContext;
  }

  const cleaned = text.trim();

  const marker = isAgent ? " 🟦" : "";
  return cleaned + marker;
}
