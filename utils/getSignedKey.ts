import neynarClient from "@/lib/neynarClient";
import { ViemLocalEip712Signer } from "@farcaster/hub-nodejs";
import { bytesToHex, hexToBytes } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { getFid } from "./getFid";

export const getSignedKey = async () => {
  const createSigner = await neynarClient.createSigner();

  const { deadline, signature } = await generateSignature(
    createSigner.public_key
  );

  if (deadline === 0 || signature === "") {
    throw new Error("Failed to generate signature");
  }

  const fid = await getFid();

  const signedKey = await neynarClient.registerSignedKey({
    signerUuid: createSigner.signer_uuid,
    appFid: fid,
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

  const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h
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