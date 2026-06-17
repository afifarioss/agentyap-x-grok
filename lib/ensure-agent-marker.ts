// lib/ensure-agent-marker.ts
export function ensureAgentYapMarker(text: string): string {
  let cleaned = (text || "").trim();

  // Jesse's improvement: normalize even if the model already added the marker
  if (cleaned.startsWith("🟦")) {
    // Remove any existing prefix + optional space, then re-add clean version
    cleaned = cleaned.replace(/^\🟦\s*/, "");
    return "🟦 " + cleaned;
  } else {
    return "🟦 " + cleaned;
  }
}