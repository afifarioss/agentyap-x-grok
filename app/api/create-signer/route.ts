// app/api/create-signer/route.ts
import { NextResponse } from "next/server";
import { createHash, randomBytes, scryptSync, createCipheriv } from "crypto";

const KEY_REGISTRY_ADDRESS = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";

// Derive encryption key from NEYNAR_API_KEY if ENCRYPTION_KEY is not set
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (key) return key;
  // Fallback: hash NEYNAR_API_KEY to 32 chars so it never crashes
  const fallback = process.env.NEYNAR_API_KEY || "agentyap-fallback-key";
  return createHash("sha256").update(fallback).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { fid, username } = body;

    if (!fid) {
      return NextResponse.json(
        { error: "FID is required" },
        { status: 400 }
      );
    }

    // ─── Try Neynar first ───
    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (neynarApiKey) {
      try {
        const neynarRes = await fetch("https://api.neynar.com/v2/farcaster/signer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": neynarApiKey,
          },
          body: JSON.stringify({
            fid: Number(fid),
            username: username || "",
          }),
        });

        if (neynarRes.ok) {
          const neynarData = await neynarRes.json();
          return NextResponse.json({
            mode: "neynar",
            signer_uuid: neynarData.signer_uuid,
            approval_url: neynarData.approval_url,
            demo: false,
          });
        }

        // Log non-402 errors
        if (neynarRes.status !== 402) {
          console.log("[create-signer] Neynar error status:", neynarRes.status);
        }
      } catch (neynarError) {
        console.log("[create-signer] Neynar fetch failed:", neynarError);
      }
    }

    // ─── Hub Mode Fallback (Neynar 402 or no API key) ───
    const { generateKeyPairSync } = await import("crypto");

    const keyPair = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "der" },
    });

    const publicKeyHex = `0x${keyPair.publicKey.toString("hex")}`;
    const privateKeyHex = keyPair.privateKey.toString("hex");

    // Encrypt the private key before sending to client
    const encryptionKey = getEncryptionKey();
    const salt = randomBytes(16);
    const key = scryptSync(encryptionKey, salt, 32);
    const iv = randomBytes(16);

    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(privateKeyHex), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const encryptedPrivKey = [
      salt.toString("base64"),
      iv.toString("base64"),
      authTag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":");

    // Build addKey calldata for Farcaster Key Registry
    const addKeyCalldata = buildAddKeyCalldata(Number(fid), keyPair.publicKey);

    return NextResponse.json({
      mode: "hub",
      publicKey: publicKeyHex,
      encryptedPrivKey,
      addKeyCalldata,
      keyRegistryAddress: KEY_REGISTRY_ADDRESS,
      demo: false,
    });

  } catch (error) {
    console.error("[create-signer] Unhandled error:", error);

    // Ultimate fallback — let the user still use the app
    return NextResponse.json({
      mode: "demo",
      demo: true,
      message: "Demo mode — Neynar credits required to publish. You can still generate and preview casts.",
    });
  }
}

// ─── Helper: Build KeyRegistry.add() calldata ───
function buildAddKeyCalldata(fid: number, publicKey: Buffer): string {
  // Simplified ABI encoder. For production, install viem and use:
  // import { encodeFunctionData } from "viem";
  //
  // return encodeFunctionData({
  //   abi: keyRegistryAbi,
  //   functionName: "add",
  //   args: [1, publicKey, 1, metadata],
  // });

  const functionSelector = "0x0a1d5a51"; // keccak256("add(uint32,bytes,uint8,bytes)").slice(0,10)

  const pad32 = (hex: string) => hex.padStart(64, "0");
  const keyType = 1; // Ed25519
  const metadataType = 1;

  const keyOffset = 128; // 4 * 32 bytes
  const keyLength = publicKey.length;
  const keyHex = publicKey.toString("hex").padEnd(64, "0");

  let encoded = "";
  encoded += pad32(keyType.toString(16)); // keyType
  encoded += pad32(keyOffset.toString(16)); // key offset
  encoded += pad32(metadataType.toString(16)); // metadataType
  encoded += pad32((keyOffset + 64 + publicKey.length).toString(16)); // metadata offset
  encoded += pad32(keyLength.toString(16)); // key length
  encoded += keyHex; // key data
  encoded += pad32("0"); // metadata length (empty)
  encoded += "".padEnd(64, "0"); // metadata data

  return functionSelector + encoded;
}
