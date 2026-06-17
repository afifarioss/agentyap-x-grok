const AGENT_MARKER = "🟦AgentYap:";

export function ensureAgentYapMarker(text: string) {
  let cleaned = text
    .trim()
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/^Cast:\s*/i, "")
    .replace(/^Post:\s*/i, "")
    .trim();

  cleaned = cleaned
    .replace(/^(🟦\s*)+/g, "")
    .replace(/^AgentYap:\s*/i, "")
    .trim();

  return `${AGENT_MARKER}\n\n${cleaned}`;
}