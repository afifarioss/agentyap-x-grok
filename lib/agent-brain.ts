import { Redis } from "@upstash/redis";
import { openai } from "./openai";
import { getAgentMemory } from "./agent-memory";

// ─── Types ─────────────────────────────────────────────────────────

export interface AgentBrain {
  model: string;
  context: Record<string, unknown>;
  lastHeartbeat?: string;
}

export interface BrainState {
  persona: string;
  mood: string;
  recentInteractions: number;
}

// ─── Redis Client (using your Upstash env vars) ────────────────────

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Core Brain Functions ──────────────────────────────────────────

export function getAgentBrain(): AgentBrain {
  return {
    model: process.env.OPENROUTER_API_KEY ? "openrouter" : "default",
    context: {},
  };
}

export async function getBrainState(): Promise<BrainState | null> {
  const state = await redis.get<BrainState>("agent:brain:state");
  return state ?? null;
}

export async function updateBrainState(partial: Partial<BrainState>): Promise<void> {
  const current = await getBrainState();
  const next = { ...current, ...partial } as BrainState;
  await redis.set("agent:brain:state", next);
}

// ─── Heartbeat (keeps the agent alive / cron job) ─────────────────

export async function heartbeat(): Promise<{
  status: "ok" | "error";
  timestamp: string;
  agentState?: BrainState;
}> {
  try {
    const timestamp = new Date().toISOString();
    
    // Update last heartbeat in Redis
    await redis.set("agent:last_heartbeat", timestamp);
    
    // Optional: refresh memory, check queue, etc.
    const memory = await getAgentMemory();
    const state = await getBrainState();

    // Log the pulse (remove in production if too noisy)
    console.log(`[Agent Heartbeat] ${timestamp} — Memory entries: ${memory?.length ?? 0}`);

    return {
      status: "ok",
      timestamp,
      agentState: state ?? undefined,
    };
  } catch (error) {
    console.error("[Agent Heartbeat] Failed:", error);
    return {
      status: "error",
      timestamp: new Date().toISOString(),
    };
  }
}

// ─── AI Response Generator ─────────────────────────────────────────

export async function think(input: string, context?: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  // You can swap this for your actual OpenRouter call in openai.ts
  const response = await openai.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: context || "You are a helpful Farcaster agent." },
      { role: "user", content: input },
    ],
  });

  return response.choices[0]?.message?.content || "Hmm, I'm speechless.";
}

// ─── Export default for convenience ────────────────────────────────

export default {
  getAgentBrain,
  getBrainState,
  updateBrainState,
  heartbeat,
  think,
};
