import { x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

const facilitatorUrl =
  process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

export const server = new x402ResourceServer(facilitatorClient);

registerExactEvmScheme(server);

export const payToAddress = process.env.AGENTYAP_PAYOUT_WALLET as string;

if (!payToAddress) {
  console.warn(
    "⚠️ AGENTYAP_PAYOUT_WALLET is not set — x402 payments have nowhere to go."
  );
}