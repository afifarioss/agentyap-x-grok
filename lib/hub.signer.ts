// lib/hub-signer.ts  ← NEW FILE
// Used by post-cast when mode === "hub"
import {
  NobleEd25519Signer,
  makeCastAdd,
  FarcasterNetwork,
  type CastAddMessage,
} from "@farcaster/hub-nodejs";

export function decryptPrivKey(encrypted: string): Uint8Array {
  const secret = process.env.SIGNER_ENCRYPTION_SECRET ?? "changeme32chars!!changeme32chars";
  const secretBuf = Buffer.from(secret.slice(0, 32).padEnd(32));
  const encBuf = Buffer.from(encrypted, "hex");
  const out = Buffer.alloc(encBuf.length);
  for (let i = 0; i < encBuf.length; i++) {
    out[i] = encBuf[i] ^ secretBuf[i % secretBuf.length];
  }
  return Uint8Array.from(out);
}

export async function signCastWithHubSigner(
  encryptedPrivKey: string,
  fid: number,
  text: string,
  embedUrls: string[] = []
): Promise<CastAddMessage> {
  const privBytes = decryptPrivKey(encryptedPrivKey);
  const signer = new NobleEd25519Signer(privBytes);

  const result = await makeCastAdd(
    {
      
      embeds: embedUrls.map((url) => ({ url })),
      embedsDeprecated: [],
      mentions: [],
      mentionsPositions: [],
    },
    { fid, network: FarcasterNetwork.MAINNET },
    signer
  );

  if (result.isErr()) {
    throw new Error(`Cast signing failed: ${result.error.message}`);
  }

  return result.value;
}