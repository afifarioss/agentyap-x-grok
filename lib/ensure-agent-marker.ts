// lib/ensure-agent-marker.ts
/**
 * Ensures every AgentYap cast starts with exactly one clean 🟦 marker.
 * Uses regex normalization so it works even if the model already added the prefix.
 */
export function ensureAgentYapMarker(text: string): string {
  let cleaned = (text || "").trim();

  // Regex: remove any leading 🟦 (with optional whitespace after it)
  cleaned = cleaned.replace(/^\🟦\s*/, "");

  // Always add clean prefix
  return "🟦 " + cleaned;
}