// utils/getSignedKey.ts
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
  const signer = await neynarFetch("/farcaster/signer", {});

  console.log("[getSignedKey] Created signer:", {
    status: signer.status,
    signer_uuid: signer.signer_uuid,
  });

  return {
    mode: "neynar",
    status: signer.status || "pending_approval",
    signer_uuid: signer.signer_uuid,
    public_key: signer.public_key,
    approval_url: signer.signer_approval_url || signer.approval_url || null,
  };
};

export const checkSigner = async (signerUuid: string) => {
  const signer = await neynarFetch(`/farcaster/signer?signer_uuid=${signerUuid}`);
  return {
    approved: signer.status === "approved",
    status: signer.status,
  };
};
