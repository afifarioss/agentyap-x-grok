// lib/openai.ts
// Replaces lib/grok.ts — OpenAI GPT-4o-mini (cheapest, fast)
// Drop-in compatible with existing generateVibeCast calls

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

// Vibe system prompts — HIP-aware, Base-native
const VIBE_SYSTEM_PROMPTS: Record<string, string> = {
  builder: `You are a Base ecosystem builder. Write short Farcaster casts under 280 chars.
Tone: technical, shipping-focused, zero hype. Reference Base L2, onchain tooling, or open-source work.
No hashtags. No emojis unless earned. No motivation fluff. Sound like someone who actually ships.`,

  degen: `You are a Base-native degen. Write short Farcaster casts under 280 chars.
Tone: high signal, alpha-seeking, community-first. Use natural crypto vocabulary.
Hashtags: #Base only if relevant. Medium emoji density. No fake pumping.`,

  creator: `You are a creator building on Farcaster and Base. Write short casts under 280 chars.
Tone: collaborative, community-driven, genuine. Reference the creative economy, Zora, or collecting.
Low hashtags. Low emoji. Sound like a real human making things.`,

  family: `You are a family man from Ipoh, Malaysia building on Base between parenting shifts.
Write short Farcaster casts under 280 chars.
Tone: grounded, honest, human. Mix building and real life. No fake sentimentality.
Reference Base, building on mobile, or shipping small things. Sound like a real dad who codes.`,
};

export async function generateVibeCast(
  vibe: string,
  handle?: string,
  bio?: string,
  extraContext: string = "",
  isAgent: boolean = true
): Promise<string> {
  const systemPrompt =
    VIBE_SYSTEM_PROMPTS[vibe] ?? VIBE_SYSTEM_PROMPTS.family;

  const contextParts = [
    handle ? `Farcaster handle: @${handle}` : null,
    bio ? `Bio: ${bio}` : null,
    extraContext ? `Context: ${extraContext}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `Write one Farcaster cast for vibe: "${vibe}".
${contextParts}
Return only the cast text. No quotes. No preamble. Under 280 characters.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[openai] No OPENAI_API_KEY — using fallback");
    return fallbackCast(vibe, extraContext, isAgent);
  }

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 120,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      throw new Error(`OpenAI ${res.status}`);
    }

    const data: OpenAIResponse = await res.json();
    const text = data.choices[0]?.message?.content?.trim() ?? "";

    if (!text) return fallbackCast(vibe, extraContext, isAgent);

    // Caller applies HIP marker — this function returns raw cast text only
    return text.slice(0, 280);
  } catch (err) {
    console.error("[openai] generateVibeCast failed:", err);
    return fallbackCast(vibe, extraContext, isAgent);
  }
}

function fallbackCast(
  vibe: string,
  extraContext: string = "",
  isAgent: boolean = true
): string {
  void isAgent; // intentionally used as parameter for API compatibility

  const FALLBACKS: Record<string, string> = {
    builder:
      "Shipping on Base. No announcements, just commits. Code is the roadmap.",
    degen:
      "Base is the move. Low fees, high signal. Staying onchain and staying based.",
    creator:
      "Creating on Farcaster because the feed is the gallery. Building in public.",
    family:
      "Ipoh dad. Building on Base between school runs. Family first. Shipping second. Close second.",
  };

  const base = FALLBACKS[vibe] ?? FALLBACKS.family;
  const full = extraContext ? `${base} ${extraContext}` : base;
  return full.slice(0, 280);
}
