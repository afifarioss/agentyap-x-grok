import { Redis } from "@upstash/redis";

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

// ─── Redis Client ──────────────────────────────────────────────────

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Core Functions ────────────────────────────────────────────────

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

// ─── Heartbeat ─────────────────────────────────────────────────────

export async function heartbeat(): Promise<{
  status: "ok" | "error";
  timestamp: string;
  agentState?: BrainState;
}> {
  try {
    const timestamp = new Date().toISOString();
    await redis.set("agent:last_heartbeat", timestamp);
    
    const state = await getBrainState();

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

// ─── Think (stub) ──────────────────────────────────────────────────

export async function think(input: string): Promise<string> {
  return `[Agent] Received: ${input}`;
}

// ─── Default Export ────────────────────────────────────────────────

const agentBrain = {
  getAgentBrain,
  getBrainState,
  updateBrainState,
  heartbeat,
  think,
};

export default agentBrain;
