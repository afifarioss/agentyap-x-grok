// utils/getFid.ts
export async function getFid(): Promise<number> {
  const fid = process.env.FARCASTER_DEVELOPER_FID;
  if (!fid) throw new Error("FARCASTER_DEVELOPER_FID not set");
  return parseInt(fid, 10);
}
