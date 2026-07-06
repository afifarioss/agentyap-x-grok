567// lib/agent-brain.ts - Autonomous agent heartbeat logic
import { generateVibeCast } from "./openai";
import { recordCast, canPostNow, getMemory } from "./agent-memory";
import { getFid } from "@/utils/getFid";

const VIBES = ["builder", "degen", "creator", "family"];
const AGENT_FID = parseInt(process.env.FARCASTER_DEVELOPER_FID || "0", 10);

/**
 * Heartbeat: Fired every 6 hours by Vercel Cron
 * - Checks if agent can post
 * - Generates a vibe-based cast
 * - Records it in memory
 */
export async function heartbeat() {
  try {
    if (!AGENT_FID || AGENT_FID === 0) {
      return { status: "skipped", reason: "FARCASTER_DEVELOPER_FID not set" };
    }

    const memory = await getMemory(AGENT_FID);
    const { allowed, reason } = await canPostNow(AGENT_FID);

    if (!allowed) {
      return { status: "skipped", reason };
    }

    // Pick a random vibe
    const vibe = VIBES[Math.floor(Math.random() * VIBES.length)];

    // Generate cast
    const castText = await generateVibeCast(vibe, "afifarioss", "", "");

    // Record in memory
    await recordCast(AGENT_FID, {
      hash: `local_${Date.now()}`, // Placeholder
      text: castText,
      fid: AGENT_FID,
      vibe,
      isAgent: true,
      timestamp: Date.now(),
    });

    return {
      status: "ok",
      vibe,
      cast: castText,
      memory: {
        totalCasts: memory.totalCasts + 1,
        agentCasts: memory.agentCasts + 1,
        dailyCastCount: memory.dailyCastCount + 1,
      },
    };
  } catch (err) {
    console.error("[heartbeat] error:", err);
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
