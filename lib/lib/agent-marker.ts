// lib/agent-marker.ts
// HIP — Hybrid Identity Protocol marker system
// 🟦 = onchain-attributed, human-approved AI cast
// No marker = human (Afif) voice

export const HIP_VERSION = "1.0";
export const HIP_MARKER = "🟦";

// Cast metadata that other protocols can read
export interface HIPMetadata {
  marker: "🟦";
  protocol: "HIP";
  version: string;
  fid: number;
  agentId: string; // "agentyap"
  humanApproved: true;
  vibe: string;
  timestamp: number;
  agentTokenId?: string; // ERC-6551 TBA — populated in Phase 2
}

export type CastVoice = "agent" | "human";

export function detectVoice(castText: string): CastVoice {
  return castText.trimStart().startsWith("🟦 AgentYap:") ? "agent" : "human";
}

export function applyHIPMarker(
  rawText: string,
  fid: number,
  vibe: string,
  agentTokenId?: string
): { text: string; metadata: HIPMetadata } {
  // Strip any existing marker attempts to prevent double-marking
  const cleaned = rawText
    .trim()
    .replace(/^["""]+|["""]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .replace(/^(🟦\s*)+/g, "")
    .replace(/^AgentYap:\s*/i, "")
    .trim();

  // HIP format: 🟦 AgentYap [v{version}] | {vibe}\n\n{content}
  // The header is machine-readable, the content is human-readable
  const header = `🟦 AgentYap [HIP-${HIP_VERSION}] | ${vibe}`;
  const text = `${header}\n\n${cleaned}`;

  const metadata: HIPMetadata = {
    marker: "🟦",
    protocol: "HIP",
    version: HIP_VERSION,
    fid,
    agentId: "agentyap",
    humanApproved: true,
    vibe,
    timestamp: Date.now(),
    ...(agentTokenId && { agentTokenId }),
  };

  return { text, metadata };
}

export function stripHIPMarker(text: string): string {
  return text
    .replace(/^🟦 AgentYap \[HIP-[\d.]+\] \| \w+\n\n/, "")
    .replace(/^🟦 AgentYap:\n\n/, "")
    .trim();
}