// lib/agent-memory.ts
// Upstash Redis — free tier, no Supabase needed
// 10k commands/day, 256MB, zero cost

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface CastRecord {
  hash: string;
  text: string;
  fid: number;
  vibe: string;
  isAgent: boolean;
  timestamp: number;
  agentTokenId?: string;
}

export interface AgentMemory {
  totalCasts: number;
  agentCasts: number;
  humanCasts: number;
  lastPostTimestamp: number;
  dailyCastCount: number;
  dailyResetDate: string; // "YYYY-MM-DD"
  recentCasts: CastRecord[];
}

const MEMORY_KEY = (fid: number): string => `agentyap:memory:${fid}`;
const CAST_LOG_KEY = (fid: number): string => `agentyap:casts:${fid}`;
const MAX_RECENT_CASTS = 20;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getMemory(fid: number): Promise<AgentMemory> {
  try {
    const data = await redis.get<AgentMemory>(MEMORY_KEY(fid));
    if (data) {
      // Reset daily count if it's a new day
      if (data.dailyResetDate !== todayUTC()) {
        data.dailyCastCount = 0;
        data.dailyResetDate = todayUTC();
        await redis.set(MEMORY_KEY(fid), data);
      }
      return data;
    }
  } catch (err) {
    console.error("[agent-memory] getMemory failed:", err);
  }

  return {
    totalCasts: 0,
    agentCasts: 0,
    humanCasts: 0,
    lastPostTimestamp: 0,
    dailyCastCount: 0,
    dailyResetDate: todayUTC(),
    recentCasts: [],
  };
}

export async function recordCast(
  fid: number,
  cast: CastRecord
): Promise<void> {
  try {
    const memory = await getMemory(fid);

    memory.totalCasts += 1;
    memory.lastPostTimestamp = cast.timestamp;
    memory.dailyCastCount += 1;
    memory.dailyResetDate = todayUTC();

    if (cast.isAgent) {
      memory.agentCasts += 1;
    } else {
      memory.humanCasts += 1;
    }

    // Keep last 20 casts in memory
    memory.recentCasts = [cast, ...memory.recentCasts].slice(
      0,
      MAX_RECENT_CASTS
    );

    await redis.set(MEMORY_KEY(fid), memory);

    // Separate cast log with 30-day TTL
    await redis.lpush(CAST_LOG_KEY(fid), JSON.stringify(cast));
    await redis.ltrim(CAST_LOG_KEY(fid), 0, 99); // keep last 100
    await redis.expire(CAST_LOG_KEY(fid), 60 * 60 * 24 * 30);
  } catch (err) {
    // Non-blocking — don't fail the cast if memory write fails
    console.error("[agent-memory] recordCast failed:", err);
  }
}

export async function canPostNow(
  fid: number,
  maxPerDay = 5,
  minGapHours = 4
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const memory = await getMemory(fid);

    if (memory.dailyCastCount >= maxPerDay) {
      return { allowed: false, reason: `Daily limit of ${maxPerDay} reached` };
    }

    const hoursSinceLast =
      (Date.now() - memory.lastPostTimestamp) / (1000 * 60 * 60);

    if (memory.lastPostTimestamp > 0 && hoursSinceLast < minGapHours) {
      return {
        allowed: false,
        reason: `Too soon — last post was ${hoursSinceLast.toFixed(1)}h ago`,
      };
    }

    return { allowed: true };
  } catch {
    return { allowed: true }; // fail open
  }
}