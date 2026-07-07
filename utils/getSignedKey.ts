// utils/getSignedKey.ts
import { ViemLocalEip712Signer } from "@farcaster/hub-nodejs";
import { bytesToHex, hexToBytes } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { getFid } from "./getFid";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_URL = "https://api.neynar.com/v2";

if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not defined");
}

const neynarFetch = async (path: string, body?: object) => {
  const res = await fetch(`${NEYNAR_API_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": NEYNAR_API_KEY!,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[neynarFetch] error:", res.status, data);
    throw Object.assign(new Error(data.message || "Neynar error"), {
      status: res.status,
      data,
    });
  }

  return data;
};

export const getSignedKey = async () => {
  // Step 1: Create signer
  const createSigner = await neynarFetch("/farcaster/signer", {});

  console.log("[getSignedKey] Created signer:", createSigner);

  // Check if signer needs approval (has approval_url)
  if (createSigner.status === "pending_approval" && createSigner.approval_url) {
    // Return the approval URL so the frontend can show QR code / Warpcast link
    return {
      status: "pending_approval",
      signer_uuid: createSigner.signer_uuid,
      public_key: createSigner.public_key,
      approval_url: createSigner.approval_url,
    };
  }

  // If already approved somehow, proceed with registration
  if (createSigner.status === "approved") {
    return await registerSignedKey(createSigner.signer_uuid, createSigner.public_key);
  }

  throw new Error(`Unknown signer response: ${JSON.stringify(createSigner)}`);
};

// Separate function to register after approval
export const registerSignedKeyAfterApproval = async (signerUuid: string, publicKey: string) => {
  return await registerSignedKey(signerUuid, publicKey);
};

const registerSignedKey = async (signerUuid: string, publicKey: string) => {
  // Step 2: Generate signature with mnemonic
  const { deadline, signature } = await generateSignature(publicKey);

  if (deadline === 0 || signature === "") {
    throw new Error("Failed to generate signature");
  }

  const fid = await getFid();

  // Step 3: Register signed key using the correct endpoint
  const signedKey = await neynarFetch("/farcaster/signer/signed_key", {
    signer_uuid: signerUuid,
    app_fid: fid,
    deadline,
    signature,
  });

  return signedKey;
};

const generateSignature = async (publicKey: string) => {
  if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
    throw new Error("FARCASTER_DEVELOPER_MNEMONIC is not defined");
  }

  const mnemonic = process.env.FARCASTER_DEVELOPER_MNEMONIC as `${string} ${string} ${string}`;
  const fid = await getFid();

  const account = mnemonicToAccount(mnemonic);
  const appAccountKey = new ViemLocalEip712Signer(account);

  const deadline = Math.floor(Date.now() / 1000) + 86400;
  const publicKeyBytes = hexToBytes(publicKey as `0x${string}`);

  const signature = await appAccountKey.signKeyRequest({
    requestFid: BigInt(fid),
    key: publicKeyBytes,
    deadline: BigInt(deadline),
  });

  if (signature.isErr()) {
    return { deadline, signature: "" };
  }

  const sigHex = bytesToHex(signature.value);

  return { deadline, signature: sigHex };
};
