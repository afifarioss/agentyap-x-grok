// lib/ensure-agent-marker.ts
export function ensureAgentYapMarker(text: string): string {
  const cleaned = (text || "").trim();
  if (!cleaned.startsWith("🟦")) {
    return "🟦 " + cleaned;
  }
  return cleaned;
}