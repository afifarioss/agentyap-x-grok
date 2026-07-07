// app/api/create-signer/route.ts
import { NextResponse } from "next/server";
import { createHash, randomBytes, scryptSync, createCipheriv } from "crypto";
import { getSignedKey } from "@/utils/getSignedKey";

const KEY_REGISTRY_ADDRESS = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e";

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (key) return key;
  const fallback = process.env.NEYNAR_API_KEY || "agentyap-fallback-key";
  return createHash("sha256").update(fallback).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { fid } = body;

    if (!fid) {
      return NextResponse.json({ error: "FID is required" }, { status: 400 });
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (neynarApiKey) {
      try {
        // THE REAL FIX: use getSignedKey(), which creates the signer AND
        // registers the signed-key request against it, producing a real
        // approval_url. The old inline logic here only ever created the
        // signer and returned Neynar's raw (unregistered) response — that's
        // why approval_url was always null and status always "generated".
        const result = await getSignedKey();
        return NextResponse.json({ ...result, demo: false });
      } catch (neynarError) {
        console.log("[create-signer] getSignedKey failed, falling back to hub mode:", neynarError);
      }
    }

    // Hub-mode fallback (unchanged)
    const { generateKeyPairSync } = await import("crypto");
    const keyPair = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "der" },
      privateKeyEncoding: { type: "pkcs8", format: "der" },
    });

    const publicKeyHex = `0x${keyPair.publicKey.toString("hex")}`;
    const privateKeyHex = keyPair.privateKey.toString("hex");

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
    return NextResponse.json({
      mode: "demo",
      demo: true,
      message: "Demo mode — Neynar credits required to publish. You can still generate and preview casts.",
    });
  }
}

function buildAddKeyCalldata(fid: number, publicKey: Buffer): string {
  const functionSelector = "0x0a1d5a51";
  const pad32 = (hex: string) => hex.padStart(64, "0");
  const keyType = 1;
  const metadataType = 1;
  const keyOffset = 128;
  const keyLength = publicKey.length;
  const keyHex = publicKey.toString("hex").padEnd(64, "0");

  let encoded = "";
  encoded += pad32(keyType.toString(16));
  encoded += pad32(keyOffset.toString(16));
  encoded += pad32(metadataType.toString(16));
  encoded += pad32((keyOffset + 64 + publicKey.length).toString(16));
  encoded += pad32(keyLength.toString(16));
  encoded += keyHex;
  encoded += pad32("0");
  encoded += "".padEnd(64, "0");

  return functionSelector + encoded;
}
