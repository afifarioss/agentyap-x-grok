'use client';

import { useState, useRef, useEffect } from "react";

// ==================== TYPES ====================
interface Post {
  text: string;
  time: string;
  hash?: string;
  url?: string | null;
}

// ==================== NEYNAR FUNCTIONS ====================
async function createNeynarSigner(neynarApiKey: string) {
  const res = await fetch("https://api.neynar.com/v2/farcaster/signer", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": neynarApiKey },
  });
  if (!res.ok) throw new Error("Create signer failed");
  return res.json();
}

async function checkSignerStatus(neynarApiKey: string, signerUuid: string) {
  const res = await fetch(`https://api.neynar.com/v2/farcaster/signer?signer_uuid=${signerUuid}`, {
    headers: { "x-api-key": neynarApiKey },
  });
  if (!res.ok) throw new Error("Check signer failed");
  return res.json();
}

async function postToFarcaster(neynarApiKey: string, signerUuid: string, text: string, retryCount = 0): Promise<any> {
  try {
    const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": neynarApiKey },
      body: JSON.stringify({ signer_uuid: signerUuid, text }),
    });

    if (res.status === 429 && retryCount < 3) {
      await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
      return postToFarcaster(neynarApiKey, signerUuid, text, retryCount + 1);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to post cast");
    }

    return await res.json();
  } catch (error: any) {
    throw new Error(error.message || "Network error");
  }
}

async function fetchRecentPosts(fid: number, neynarApiKey: string, limit = 5) {
  const res = await fetch(`https://api.neynar.com/v2/farcaster/feed?fid=\( {fid}&limit= \){limit}`, {
    headers: { "x-api-key": neynarApiKey },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.casts || [];
}

// ==================== GROK FUNCTION ====================
async function generateFarcasterPost(vibe: string, handle: string, bio: string, grokKey: string) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${grokKey}` },
    body: JSON.stringify({
      model: "grok-4.3",
      messages: [
        { role: "system", content: "You are a Farcaster AI agent. Generate ONE short post max 280 chars. End with 1 emoji. Sound human and real." },
        { role: "user", content: `Post for @${handle}. Vibe: ${vibe}. ${bio ? `Bio: ${bio}` : ""}\nReturn only the text.` }
      ],
      max_tokens: 280,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "Error generating post";
}

// ==================== MAIN COMPONENT ====================
export default function AgentYap() {
  const [step, setStep] = useState<"setup" | "signer" | "dashboard">("setup");
  const [handle, setHandle] = useState("afifarioss");
  const [agentName, setAgentName] = useState("YapDaddy");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [neynarKey, setNeynarKey] = useState("");
  const [grokKey, setGrokKey] = useState("");

  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");
  const [signerStatus, setSignerStatus] = useState<"idle" | "pending" | "approved">("idle");

  const [agentActive, setAgentActive] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [previewPost, setPreviewPost] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const pollRef = useRef<any>(null);

  // ==================== SIGNER ====================
  async function handleCreateSigner() {
    if (!neynarKey || !grokKey || !vibe) return alert("Isi Neynar Key + Grok Key + Vibe");

    try {
      const signer = await createNeynarSigner(neynarKey);
      setSignerUuid(signer.signer_uuid);
      setSignerApprovalUrl(signer.signer_approval_url);
      setSignerStatus("pending");
      setStep("signer");

      // Auto polling
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const s = await checkSignerStatus(neynarKey, signer.signer_uuid);
          if (s.status === "approved") {
            if (pollRef.current) clearInterval(pollRef.current);
            setSignerStatus("approved");
            setStep("dashboard");
            fetchRecentPosts(12345, neynarKey).then(setRecentPosts); // Tukar FID
          }
        } catch (e) {}
      }, 4000);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function manualCheckStatus() {
    if (!signerUuid || !neynarKey) return;
    try {
      const s = await checkSignerStatus(neynarKey, signerUuid);
      if (s.status === "approved") {
        if (pollRef.current) clearInterval(pollRef.current);
        setSignerStatus("approved");
        setStep("dashboard");
      } else {
        alert("Belum approved. Cuba approve dalam Warpcast.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  }

  // ==================== POSTING ====================
  async function handlePreview() {
    if (!grokKey || !vibe) return alert("Isi Grok key & pilih vibe");
    setPreviewing(true);
    try {
      const text = await generateFarcasterPost(vibe, handle, bio, grokKey);
      setPreviewPost(text);
    } catch (e: any) {
      setPreviewPost("Error: " + e.message);
    }
    setPreviewing(false);
  }

  const postNow = async () => {
    if (!signerUuid || !neynarKey || !grokKey || !vibe) return;

    setIsPosting(true);
    setPostStatus("idle");
    setStatusMessage("");

    try {
      const text = await generateFarcasterPost(vibe, handle, bio, grokKey);
      const result = await postToFarcaster(neynarKey, signerUuid, text);

      setPostStatus("success");
      setStatusMessage("Posted successfully!");

      setPosts(prev => [{
        text,
        time: new Date().toLocaleTimeString(),
        hash: result.cast?.hash,
        url: result.cast?.hash ? `https://warpcast.com/\( {handle}/ \){result.cast.hash}` : null,
      }, ...prev]);

      setTimeout(() => {
        setPostStatus("idle");
        setStatusMessage("");
      }, 3000);
    } catch (error: any) {
      setPostStatus("error");
      setStatusMessage(error.message || "Failed to post");
      setTimeout(() => {
        setPostStatus("idle");
        setStatusMessage("");
      }, 4000);
    } finally {
      setIsPosting(false);
    }
  };

  // ==================== AGENT CONTROL ====================
  function startAgent() {
    setAgentActive(true);
    postNow();
  }

  function stopAgent() {
    setAgentActive(false);
  }

  // ==================== RENDER ====================
  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#e0e0ff", padding: 20, fontFamily: "monospace" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: "bold" }}>AGENTYAP v0.8</div>
          <div style={{ color: "#6366f1", fontSize: 13 }}>GROK + NEYNAR • REAL-TIME CASTING</div>
        </div>

        {/* ==================== SETUP ==================== */}
        {step === "setup" && (
          <>
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 6 }}>FARCASTER HANDLE</div>
              <input value={handle} onChange={e => setHandle(e.target.value.replace("@", ""))} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8 }} />
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 8 }}>VIBE</div>
              {[
                { id: "builder", label: "🔨 Builder" },
                { id: "degen", label: "💎 Degen" },
                { id: "creator", label: "🎨 Creator" },
                { id: "family", label: "👨‍👩‍👧 Family Man" },
              ].map(v => (
                <div key={v.id} onClick={() => setVibe(v.id)} style={{ padding: 12, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 8, borderRadius: 8, cursor: "pointer" }}>
                  {v.label}
                </div>
              ))}
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#0ea5e9" }}>NEYNAR API KEY</div>
              <input type="password" value={neynarKey} onChange={e => setNeynarKey(e.target.value)} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8, marginTop: 6 }} />
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#22c55e" }}>GROK API KEY</div>
              <input type="password" value={grokKey} onChange={e => setGrokKey(e.target.value)} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8, marginTop: 6 }} />
            </div>

            <button onClick={handleCreateSigner} style={{ width: "100%", background: "#6366f1", color: "#fff", padding: 16, borderRadius: 12, fontWeight: "bold" }}>
              CONNECT FARCASTER
            </button>
          </>
        )}

        {/* ==================== SIGNER ==================== */}
        {step === "signer" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>Approve in Warpcast</div>
            <a href={signerApprovalUrl} target="_blank" style={{ display: "block", background: "#6366f1", color: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              OPEN IN WARPCAST →
            </a>
            <button onClick={manualCheckStatus} style={{ width: "100%", background: "#333", color: "#fff", padding: 14, borderRadius: 10 }}>
              Check Status (tekan selepas approve)
            </button>
          </div>
        )}

        {/* ==================== DASHBOARD ==================== */}
        {step === "dashboard" && (
          <div>
            {/* Header */}
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold" }}>{agentName}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>@{handle}</div>
                </div>
                <button onClick={agentActive ? stopAgent : startAgent} style={{ background: agentActive ? "#ef4444" : "#22c55e", color: "#fff", padding: "8px 16px", borderRadius: 8 }}>
                  {agentActive ? "STOP" : "START"}
                </button>
              </div>
            </div>

            {/* Post Controls */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button onClick={postNow} disabled={isPosting} style={{ flex: 1, background: isPosting ? "#374151" : "#6366f1", color: "#fff", padding: 14, borderRadius: 10, fontWeight: "bold" }}>
                {isPosting ? "POSTING..." : "📤 POST NOW"}
              </button>
              <button onClick={handlePreview} disabled={previewing} style={{ flex: 1, background: "#333", color: "#fff", padding: 14, borderRadius: 10 }}>
                {previewing ? "..." : "👁 PREVIEW"}
              </button>
            </div>

            {/* Status Message */}
            {statusMessage && (
              <div style={{ background: postStatus === "success" ? "#052e16" : "#450a0a", color: postStatus === "success" ? "#4ade80" : "#f87171", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                {statusMessage}
              </div>
            )}

            {/* Preview */}
            {previewPost && (
              <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 16, whiteSpace: "pre-wrap" }}>
                {previewPost}
              </div>
            )}

            {/* Recent Posts from Farcaster */}
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Recent Farcaster Posts</div>
              {recentPosts.length === 0 ? (
                <div style={{ color: "#666" }}>No recent posts</div>
              ) : (
                recentPosts.map((post, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #222" }}>
                    <div>{post.text}</div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{new Date(post.timestamp).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>

            {/* Post History */}
            <div style={{ background: "#111", padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Your Posts</div>
              {posts.length === 0 ? "No posts yet" : posts.map((p, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>
                  {p.text}
                  {p.url && <a href={p.url} target="_blank" style={{ color: "#6366f1", marginLeft: 8 }}>View</a>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}