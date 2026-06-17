// lib/ensure-agent-marker.ts

/**
 * Ensures every AgentYap-voice post starts with exactly one 🟦 marker.
 *
 * Two failure modes this guards against:
 * 1. Model forgets the marker entirely -> we prepend it.
 * 2. Model remembers AND we also prepend -> double marker. We dedupe
 *    that down to a single 🟦 instead of leaving "🟦 🟦 text".
 *
 * .trim() FIRST is critical — Grok sometimes adds leading whitespace
 * before the emoji, which makes a plain startsWith("🟦") check fail
 * silently and let an unmarked (or double-marked) post through.
 */
export function ensureAgentYapMarker(rawText: string): string {
  let text = rawText.trim();

  // Collapse any run of 🟦 (with optional spaces between) at the start
  // down to a single 🟦, regardless of how many the model produced.
  text = text.replace(/^(🟦\s*)+/, "");

  return `🟦 ${text}`;
}
