// lib/grok.ts
// OpenRouter free tier — no payment card needed

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateVibeCast(
  vibe: string,
  handle?: string,
  bio?: string,
  extraContext: string = "",
  isAgent: boolean = true
): Promise<string> {
  // Build system prompt based on vibe
  const vibeSystemPrompts: Record<string, string> = {
    builder: `You are a Base ecosystem builder. Write short, punchy Farcaster casts (under 320 chars). Tone: shipping-focused, humble, no hype. Mention building on Base. Use minimal hashtags. No emojis unless needed.`,
    degen: `You are a Base degen. Write short, energetic Farcaster casts (under 320 chars). Tone: confident, alpha-seeking, community-first. Use crypto slang naturally. Hashtags: #Base #Degen. Emoji density: medium.`,
    creator: `You are a creator growing on Farcaster. Write short, warm casts (under 320 chars). Tone: community-focused, collaborative, authentic. Mention creating together. Minimal hashtags. Emoji density: low.`,
    family: `You are a family man from Ipoh, Malaysia building on Base. Write short, real casts (under 320 chars). Tone: grounded, family-first, honest about crypto. Mix parenting and building. Hashtags: #Base #FamilyFirst. Emoji: natural.`,
  };

  const systemPrompt = vibeSystemPrompts[vibe] || vibeSystemPrompts.family;

  const userPrompt = `Write a Farcaster cast for vibe: "${vibe}".
${handle ? `Handle: @${handle}` : ""}
${bio ? `Bio: ${bio}` : ""}
${extraContext ? `Extra context: ${extraContext}` : ""}
Keep it under 320 characters. Make it feel authentic, not robotic.`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://agentyap-x-grok.vercel.app",
        "X-Title": "AgentYap",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-maverick:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data: OpenRouterResponse = await response.json();
    let text = data.choices[0]?.message?.content?.trim() || "";

    // Fallback if empty response
    if (!text) {
      text = await fallbackCast(vibe, extraContext);
    }

    // Add agent marker
    const marker = isAgent ? " 🟦" : "";
    return text.slice(0, 320) + marker;
  } catch (error) {
    console.error("OpenRouter failed, using fallback:", error);
    return fallbackCast(vibe, extraContext, isAgent);
  }
}

// Free fallback — no API needed
async function fallbackCast(
  vibe: string,
  extraContext: string = "",
  isAgent: boolean = true
): Promise<string> {
  const VIBE_PROMPTS: Record<string, string> = {
    builder: "Just shipped something cool on Base. Real progress, no hype. Building for the long term. #BuildOnBase",
    degen: "Base is cooking. Staying based and collecting alpha. Degens know. #Base",
    creator: "Growing on Farcaster one cast at a time. Community is everything. Let's build together.",
    family: "Ipoh Dad building on Base while raising family. Family first. Real talk. Real plays.",
  };

  let text = VIBE_PROMPTS[vibe] || VIBE_PROMPTS.family;

  if (extraContext) {
    text = text + " " + extraContext;
  }

  const marker = isAgent ? " 🟦" : "";
  return text.trim().slice(0, 320) + marker;
}
