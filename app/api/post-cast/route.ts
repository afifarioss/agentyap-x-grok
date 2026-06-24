// app/api/post-cast/route.ts
import { NextRequest, NextResponse } from "next/server";
import { recordCast } from "@/lib/agent-memory";
import { applyHIPMarker } from "@/lib/agent-marker";
import { signCastWithHubSigner } from "@/lib/hub-signer";
import { Message } from "@farcaster/hub-nodejs";

interface NeynarCastResponse {
  cast?: { hash: string };
  message?: string;
}

interface PostCastBody {
  // Neynar mode
  signerUuid?: string;
  text: string;
  fid?: number;
  vibe?: string;
  isAgent?: boolean;
  // Hub mode
  mode?: "neynar" | "hub";
  encryptedPrivKey?: string;
  agentTokenId?: string;
}

async function postViaNeynar(
  signerUuid: string,
  text: string,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ signer_uuid: signerUuid, text }),
    signal: AbortSignal.timeout(15_000),
  });

  const data: NeynarCastResponse = await res.json();

  if (!res.ok) {
    const message = data?.message?.includes("not approved")
      ? "Signer not approved yet — please approve in Warpcast first."
      : data?.message ?? "Failed to post cast";
    throw Object.assign(new Error(message), { status: res.status });
  }

  if (!data.cast?.hash) throw new Error("No cast hash in Neynar response");
  return data.cast.hash;
}

async function postViaHub(
  encryptedPrivKey: string,
  fid: number,
  text: string
): Promise<string> {
  const hubUrl = process.env.HUB_HTTP_URL;
  if (!hubUrl) throw new Error("HUB_HTTP_URL not set");

  const castMessage = await signCastWithHubSigner(encryptedPrivKey, fid, text);
  const messageBytes = Message.encode(castMessage).finish();

  const res = await fetch(`${hubUrl}/v1/submitMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: Buffer.from(messageBytes), // <-- FIXED: was messageBytes
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Hub submitMessage ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { hash: string };
  return data.hash;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: PostCastBody;

  try {
    body = (await req.json()) as PostCastBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, fid, vibe = "builder", isAgent = true, agentTokenId } = body;

  if (!text?.trim()) {
    return NextResponse.json(
      { error: "Missing text" },
      { status: 400 }
    );
  }

  // Apply HIP marker to agent casts before publishing
  const { text: markedText, metadata: hipMetadata } = isAgent && fid
    ? applyHIPMarker(text, fid, vibe, agentTokenId)
    : { text, metadata: null };

  const apiKey = process.env.NEYNAR_API_KEY;

  let hash: string;

  try {
    if (body.mode === "hub" && body.encryptedPrivKey && fid) {
      hash = await postViaHub(body.encryptedPrivKey, fid, markedText);
    } else if (body.signerUuid && apiKey) {
      hash = await postViaNeynar(body.signerUuid, markedText, apiKey);
    } else {
      return NextResponse.json(
        { error: "Missing signerUuid or hub credentials" },
        { status: 400 }
      );
    }
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    console.error("[post-cast] publish error:", e.message);
    return NextResponse.json(
      { error: e.message ?? "Failed to post cast" },
      { status: e.status ?? 502 }
    );
  }

  // Write to memory — non-blocking, never fails the response
  if (fid) {
    void recordCast(fid, {
      hash,
      text: markedText,
      fid,
      vibe,
      isAgent,
      timestamp: Date.now(),
      ...(agentTokenId && { agentTokenId }),
    });
  }

  return NextResponse.json({
    hash,
    cast_url: `https://warpcast.com/~/conversations/${hash}`,
    hip: hipMetadata,
  });
}

