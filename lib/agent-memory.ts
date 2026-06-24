// lib/agent-memory.ts — in-memory fallback (no Redis dependency)

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
  dailyResetDate: string;
  recentCasts: CastRecord[];
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_MEMORY = (): AgentMemory => ({
  totalCasts: 0,
  agentCasts: 0,
  humanCasts: 0,
  lastPostTimestamp: 0,
  dailyCastCount: 0,
  dailyResetDate: todayUTC(),
  recentCasts: [],
});

// In-memory store (resets on deploy, but build passes)
const store = new Map<number, AgentMemory>();

export async function getMemory(fid: number): Promise<AgentMemory> {
  try {
    const data = store.get(fid);
    if (!data) return EMPTY_MEMORY();

    if (data.dailyResetDate !== todayUTC()) {
      data.dailyCastCount = 0;
      data.dailyResetDate = todayUTC();
      store.set(fid, data);
    }
    return data;
  } catch (err) {
    console.error("[agent-memory] getMemory:", err);
    return EMPTY_MEMORY();
  }
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
    memory.recentCasts = [cast, ...memory.recentCasts].slice(0, 20);

    store.set(fid, memory);
  } catch (err) {
    console.error("[agent-memory] recordCast:", err);
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

    if (memory.lastPostTimestamp > 0) {
      const hoursSinceLast =
        (Date.now() - memory.lastPostTimestamp) / (1000 * 60 * 60);
      if (hoursSinceLast < minGapHours) {
        return {
          allowed: false,
          reason: `Too soon — last post ${hoursSinceLast.toFixed(1)}h ago`,
        };
      }
    }

    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}
