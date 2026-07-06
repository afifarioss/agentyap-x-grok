// In buildHubKeypair(), add this before return:
const secret = (process.env.SIGNER_ENCRYPTION_SECRET || "changeme32chars!!changeme32chars").slice(0, 32).padEnd(32);
const secretBuf = Buffer.from(secret);
const privBuf = Buffer.from(privBytes);
const encrypted = Buffer.alloc(privBuf.length);
for (let i = 0; i < privBuf.length; i++) encrypted[i] = privBuf[i] ^ secretBuf[i % secretBuf.length];
const encryptedPrivKey = encrypted.toString("hex");

// Add encryptedPrivKey to the return object:
return {
  mode: "hub",
  publicKey: `0x${Buffer.from(publicKey).toString("hex")}` as Hex,
  addKeyCalldata: metadata,
  keyRegistryAddress: KEY_REGISTRY_ADDRESS,
  demo: false,
  encryptedPrivKey, // <-- ADD THIS
};
