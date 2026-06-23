// app/api/create-signer/route.ts
// Task 1: Neynar 402 → Hub direct signing fallback
// Keeps your existing demo mode for any other error

import { NextResponse } from "next/server";
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
  | { mode: "neynar"; signer_uuid: string; approval_url: string; demo: false }
  | {
      mode: "hub";
      publicKey: Hex;
      addKeyCalldata: Hex;
      keyRegistryAddress: string;
      demo: false;
    }
  | { mode: "demo"; demo: true; message: string; signer_uuid: null; approval_url: null };

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
  const signer = new NobleEd25519Signer(privBytes);
  const keyResult = await signer.getSignerKey();

  if (keyResult.isErr()) {
    throw new Error(`Ed25519 key derivation failed: ${keyResult.error.message}`);
  }

  const publicKeyHex = (`0x` +
    Buffer.from(keyResult.value).toString("hex")) as Hex;

  const addKeyCalldata = encodeFunctionData({
    abi: KEY_REGISTRY_ADD_ABI,
    functionName: "add",
    args: [1, publicKeyHex, 0, "0x"],
  });

  // Store encrypted privkey in env-secured cookie or return for client-side storage
  // For now: store in encrypted env — client sends it back on post-cast
  const privHex = Buffer.from(privBytes).toString("hex");

  // Simple XOR encrypt with SIGNER_ENCRYPTION_SECRET
  const secret = process.env.SIGNER_ENCRYPTION_SECRET ?? "changeme32chars!!changeme32chars";
  const secretBuf = Buffer.from(secret.slice(0, 32).padEnd(32));
  const privBuf = Buffer.from(privHex, "hex");
  const encrypted = Buffer.alloc(privBuf.length);
  for (let i = 0; i < privBuf.length; i++) {
    encrypted[i] = privBuf[i] ^ secretBuf[i % secretBuf.length];
  }

  // Attach encrypted key to calldata response so frontend can store it
  // We embed it in the publicKey comment — frontend must store it for post-cast signing
  void encrypted; // used below via encryptedPrivKey
  const encryptedPrivKey = encrypted.toString("hex");

  return {
    mode: "hub",
    publicKey: publicKeyHex,
    addKeyCalldata,
    keyRegistryAddress: KEY_REGISTRY_ADDRESS,
    demo: false,
    // @ts-expect-error — extra field for client storage
    encryptedPrivKey,
  };
}

export async function POST(): Promise<NextResponse<SignerResult>> {
  // 1. Try Neynar (your existing getSignedKey util)
  try {
    const signedKey = await getSignedKey();
    return NextResponse.json({
      mode: "neynar",
      signer_uuid: signedKey.signer_uuid,
      approval_url: signedKey.signer_approval_url,
      demo: false,
    });
  } catch (err: unknown) {
    if (!is402(err)) {
      // Non-402 error — fall through to demo mode (keeps your existing behavior)
      const msg =
        err instanceof Error ? err.message : "Signer creation failed";
      console.error("[create-signer] Non-402 Neynar error:", msg);

      return NextResponse.json({
        mode: "demo",
        demo: true,
        message:
          "Demo mode — Neynar API credits required for signer creation. You can still generate and preview casts.",
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