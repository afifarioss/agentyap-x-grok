ximport { NextResponse } from "next/server";
import { getSignedKey } from "@/utils/getSignedKey";
import { NobleEd25519Signer } from "@farcaster/hub-nodejs";
import { ed25519 } from "@noble/curves/ed25519";
import { encodeFunctionData, type Hex } from "viem";

// Farcaster Key Registry on Optimism
const KEY_REGISTRY_ADDRESS =
  "0x00000000Fc1237824fb747aBDE0FF18990E59b7e" as const;

const KEY_REGISTRY_ADD_ABI = [
  {
    name: "add",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "keyType", type: "uint32" },
      { name: "key", type: "bytes" },
      { name: "metadataType", type: "uint8" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

type SignerResult =
  | {
      mode: "neynar";
      signer_uuid: string;
      approval_url: string;
      demo: false;
    }
  | {
      mode: "hub";
      publicKey: Hex;
      addKeyCalldata: Hex;
      keyRegistryAddress: string;
      demo: false;
    }
  | {
      mode: "demo";
      demo: true;
      message: string;
      signer_uuid: null;
      approval_url: null;
    };

function is402(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  const withStatus = err as Error & { status?: number; statusCode?: number };
  return (
    withStatus.status === 402 ||
    withStatus.statusCode === 402 ||
    msg.includes("402") ||
    msg.includes("payment required") ||
    msg.includes("credits") ||
    msg.includes("quota") ||
    msg.includes("limit")
  );
}

async function buildHubKeypair(): Promise<
  Extract<SignerResult, { mode: "hub" }>
> {
  const privBytes = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privBytes);
  const signer = new NobleEd25519Signer(privBytes);
  const signerResult = await signer.getSignerKey();
  if (signerResult.isErr()) throw new Error("Failed to derive signer key");
  const key = signerResult.value;

  const metadata = encodeFunctionData({
    abi: KEY_REGISTRY_ADD_ABI,
    functionName: "add",
    args: [1, `0x${Buffer.from(key).toString("hex")}` as Hex, 1, "0x"],
  });

  return {
    mode: "hub",
    publicKey: `0x${Buffer.from(publicKey).toString("hex")}` as Hex,
    addKeyCalldata: metadata,
    keyRegistryAddress: KEY_REGISTRY_ADDRESS,
    demo: false,
  };
}

export async function POST(): Promise<NextResponse<SignerResult>> {
  // 1. Try Neynar (your existing getSignedKey util)
  try {
    const signedKey = await getSignedKey();
    return NextResponse.json({
      mode: "neynar",
      signer_uuid: signedKey.signer_uuid,
      approval_url: signedKey.signer_approval_url ?? "",
      demo: false,
    });
  } catch (err: unknown) {
    const status =
      (err as any)?.status ||
      (err as any)?.statusCode ||
      (err as any)?.response?.status ||
      "unknown";
    const msg =
      err instanceof Error ? err.message : "Signer creation failed";

    // DEBUG: Log the actual error before any fallback
    console.error("[create-signer] ACTUAL STATUS:", status);
    console.error("[create-signer] ACTUAL MSG:", msg);
    console.error("[create-signer] FULL ERROR:", err);

    if (!is402(err)) {
      // Non-402 error — log it but still fall through to demo mode
      console.error("[create-signer] Non-402 Neynar error:", msg);
      return NextResponse.json({
        mode: "demo",
        demo: true,
        message:
          "Demo mode — Neynar API error (status: " +
          status +
          "). You can still generate and preview casts.",
        signer_uuid: null,
        approval_url: null,
      });
    }

    console.warn("[create-signer] Neynar 402 — switching to Hub direct signing");
  }

  // 2. Hub fallback on 402
  try {
    const hubResult = await buildHubKeypair();
    return NextResponse.json(hubResult);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Hub fallback failed";
    console.error("[create-signer] Hub fallback error:", msg);

    // Last resort — demo mode
    return NextResponse.json({
      mode: "demo",
      demo: true,
      message: "Demo mode — signer unavailable. Cast generation still works.",
      signer_uuid: null,
      approval_url: null,
    });
  }
}
