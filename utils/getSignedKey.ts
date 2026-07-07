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

const generateSignature = async (publicKey: string) => {
  if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
    throw new Error("FARCASTER_DEVELOPER_MNEMONIC is not defined");
  }

  const mnemonic = process.env.FARCASTER_DEVELOPER_MNEMONIC as `${string} ${string} ${string}`;
  const fid = await getFid();

  const account = mnemonicToAccount(mnemonic);
  const appAccountKey = new ViemLocalEip712Signer(account);

  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h
  const publicKeyBytes = hexToBytes(publicKey as `0x${string}`);

  const signature = await appAccountKey.signKeyRequest({
    requestFid: BigInt(fid),
    key: publicKeyBytes,
    deadline: BigInt(deadline),
  });

  if (signature.isErr()) {
    console.error("[generateSignature] Failed:", signature.error);
    return { deadline, signature: "" };
  }

  return { deadline, signature: bytesToHex(signature.value) };
};

// THE ACTUAL FIX: Neynar will NOT generate an approval_url until you register
// a developer-signed key request against the signer via /signer/signed_key.
// A fresh signer sitting at status "generated" has no approval link at all
// until this call runs — no amount of waiting or polling changes that.
const registerSignedKey = async (signerUuid: string, publicKey: string) => {
  const { deadline, signature } = await generateSignature(publicKey);

  if (deadline === 0 || signature === "") {
    throw new Error("Failed to generate signature — check FARCASTER_DEVELOPER_MNEMONIC");
  }

  const fid = await getFid();

  const signedKey = await neynarFetch("/farcaster/signer/signed_key", {
    signer_uuid: signerUuid,
    app_fid: fid,
    deadline,
    signature,
  });

  console.log("[registerSignedKey] Neynar response:", {
    status: signedKey.status,
    approval_url: signedKey.signer_approval_url,
  });

  return {
    mode: "neynar",
    status: "pending_approval",
    signer_uuid: signedKey.signer_uuid || signerUuid,
    public_key: signedKey.public_key || publicKey,
    approval_url: signedKey.signer_approval_url || null,
  };
};

export const getSignedKey = async () => {
  const signer = await neynarFetch("/farcaster/signer", {});

  console.log("[getSignedKey] Created signer:", {
    status: signer.status,
    signer_uuid: signer.signer_uuid,
  });

  // Rare: signer already approved (e.g. a reused signer_uuid)
  if (signer.status === "approved") {
    return {
      mode: "neynar",
      status: "approved",
      signer_uuid: signer.signer_uuid,
      public_key: signer.public_key,
      approval_url: null,
    };
  }

  // Already has an approval url attached — just pass it through
  if (signer.approval_url || signer.signer_approval_url) {
    return {
      mode: "neynar",
      status: "pending_approval",
      signer_uuid: signer.signer_uuid,
      public_key: signer.public_key,
      approval_url: signer.signer_approval_url || signer.approval_url,
    };
  }

  // Brand-new signer ("generated" status) — must register the signed key
  // to get an approval_url. This step was missing before.
  if (signer.signer_uuid && signer.public_key) {
    return await registerSignedKey(signer.signer_uuid, signer.public_key);
  }

  throw new Error(`Unknown signer response: ${JSON.stringify(signer)}`);
};

export const checkSigner = async (signerUuid: string) => {
  const signer = await neynarFetch(`/farcaster/signer?signer_uuid=${signerUuid}`);
  return {
    approved: signer.status === "approved",
    status: signer.status,
  };
};

// Called after the frontend's poll detects status === "approved". The actual
// key registration already happened inside getSignedKey() — this just
// re-confirms the signer is live so the caller has a clean final object.
export const registerSignedKeyAfterApproval = async (signerUuid: string, publicKey: string) => {
  const signer = await neynarFetch(`/farcaster/signer?signer_uuid=${signerUuid}`);

  if (signer.status !== "approved") {
    throw new Error(`Signer ${signerUuid} is not approved yet (status: ${signer.status})`);
  }

  console.log("[registerSignedKeyAfterApproval] Confirmed approved:", signerUuid);

  return {
    mode: "neynar",
    status: "registered",
    signer_uuid: signer.signer_uuid || signerUuid,
    public_key: signer.public_key || publicKey,
  };
};
