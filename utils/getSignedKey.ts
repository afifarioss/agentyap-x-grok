import { ViemLocalEip712Signer } from "@farcaster/hub-nodejs";
import { bytesToHex, hexToBytes } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { getFid } from "./getFid";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_URL = "https://api.neynar.com/v2";

if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not defined");
}

// Direct fetch with explicit API key header
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

  console.log("[getSignedKey] Created signer:", {
    status: createSigner.status,
    signer_uuid: createSigner.signer_uuid,
  });

  // REAL FIX: For a fresh signer (status === "generated" or "pending_approval"),
  // call registerSignedKey immediately. The POST /signer/signed_key call is what
  // generates the approval_url — it doesn't appear by itself.
  if (
    createSigner.status === "generated" ||
    createSigner.status === "pending_approval"
  ) {
    const registered = await registerSignedKey(
      createSigner.signer_uuid,
      createSigner.public_key
    );

    // registered now contains the REAL approval_url from Neynar
    return {
      mode: "neynar",
      status: "pending_approval",
      signer_uuid: registered.signer_uuid,
      public_key: createSigner.public_key,
      approval_url: registered.approval_url,
    };
  }

  // If already approved, just return registered state
  if (createSigner.status === "approved") {
    return {
      mode: "neynar",
      status: "registered",
      signer_uuid: createSigner.signer_uuid,
      public_key: createSigner.public_key,
      approval_url: null,
    };
  }

  throw new Error(`Unknown signer response: ${JSON.stringify(createSigner)}`);
};

// Call this AFTER user approves in Warpcast (frontend polls check-signer first)
export const registerSignedKeyAfterApproval = async (signerUuid: string, publicKey: string) => {
  return await registerSignedKey(signerUuid, publicKey);
};

const registerSignedKey = async (signerUuid: string, publicKey: string) => {
  // Step 2: Generate signature with developer mnemonic
  const { deadline, signature } = await generateSignature(publicKey);

  if (deadline === 0 || signature === "") {
    throw new Error("Failed to generate signature — check FARCASTER_DEVELOPER_MNEMONIC");
  }

  const fid = await getFid();

  // Step 3: Register signed key — THIS is what generates the approval_url
  const signedKey = await neynarFetch("/farcaster/signer/signed_key", {
    signer_uuid: signerUuid,
    app_fid: fid,
    deadline,
    signature,
  });

  // REAL FIX: Return pending_approval with the actual approval_url from Neynar,
  // not a fake "registered" status. The signer is NOT registered yet — the user
  // still needs to tap the approval_url in Warpcast.
  return {
    mode: "neynar",
    status: "pending_approval",
    signer_uuid: signedKey.signer_uuid || signerUuid,
    approval_url: signedKey.signer_approval_url || signedKey.approval_url || null,
    fid: signedKey.fid || fid,
  };
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

  const sigHex = bytesToHex(signature.value);

  return { deadline, signature: sigHex };
};
