// lib/agent-marker.ts
export const HIP_VERSION = "1.0";

export interface HIPMetadata {
  marker: "🟦";
  protocol: "HIP";
  version: string;
  fid: number;
  agentId: string;
  humanApproved: true;
  vibe: string;
  timestamp: number;
  agentTokenId?: string;
}

export function applyHIPMarker(
  rawText: string,
  fid: number,
  vibe: string,
  agentTokenId?: string
): { text: string; metadata: HIPMetadata } {
  const cleaned = rawText
    .trim()
    .replace(/^["""]+|["""]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .replace(/^(🟦\s*)+/g, "")
    .replace(/^AgentYap:\s*/i, "")
    .trim();

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