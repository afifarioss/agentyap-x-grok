'use client';

import { useState } from "react";
import { SignInButton, useProfile } from '@farcaster/auth-kit';

const VIBES = [
  { id: "builder", label: "🔨 Builder", desc: "Ship stuff, talk tech on Base" },
  { id: "degen",   label: "💎 Degen",   desc: "Crypto alpha & market moves" },
  { id: "creator", label: "🎨 Creator", desc: "Content & community growth" },
  { id: "family",  label: "👨‍👩‍👧 Family Man", desc: "Real talk, building for family" },
];

export default function AgentYap() {
  const { isAuthenticated, profile } = useProfile();
  const [step, setStep] = useState<"setup" | "signer" | "dashboard">("setup");
  const [handle, setHandle] = useState("afifarioss");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [preview, setPreview] = useState("");

  async function connectFarcaster() {
    if (!vibe) return alert("Please select a vibe first");

    try {
      const res = await fetch("/api/create-signer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: profile?.fid || 12345, username: profile?.username || handle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSignerUuid(data.signer_uuid);
      setSignerApprovalUrl(data.approval_url);
      setStep("signer");
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function checkApproval() {
    alert("Please approve in Warpcast first, then refresh this page.");
  }

  async function handlePreview() {
    if (!vibe) return alert("Please select a vibe first");
    const res = await fetch("/api/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vibe, handle, bio }),
    });
    const data = await res.json();
    setPreview(data.text || data.error);
  }

  const handlePost = async () => {
    if (!signerUuid) return alert("Signer not ready yet");
    setIsPosting(true);
    try {
      let text = preview;
      if (!text) {
        const genRes = await fetch("/api/generate-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vibe, handle, bio }),
        });
        const genData = await genRes.json();
        text = genData.text;
      }

      const postRes = await fetch("/api/post-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerUuid, text }),
      });
      const postData = await postRes.json();
      if (postData.error) throw new Error(postData.error);

      setPosts(p => [{ text, time: new Date().toLocaleTimeString() }, ...p]);
      setPreview("");
      alert("Posted successfully!");
    } catch (e: any) {
      alert(e.message);
    }
    setIsPosting(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#e0e0ff", padding: 20, fontFamily: "monospace" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: "bold" }}>AGENTYAP v0.9 (Mini App)</div>
          <div style={{ color: "#6366f1", fontSize: 13 }}>GROK + NEYNAR • HOSTED</div>
        </div>

        {step === "setup" && (
          <>
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 6 }}>FARCASTER HANDLE</div>
              <input value={handle} onChange={e => setHandle(e.target.value.replace("@",""))} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8 }} />
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 8 }}>Select Vibe</div>
              {VIBES.map(v => (
                <div key={v.id} onClick={() => setVibe(v.id)} style={{ padding: 12, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 8, borderRadius: 8, cursor: "pointer" }}>
                  {v.label} — {v.desc}
                </div>
              ))}
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>BIO (optional)</div>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Dad from Ipoh building on Base..." style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8, minHeight: 60 }} />
            </div>

            {/* REAL FARCASTER SIGN-IN */}
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
              {!isAuthenticated ? (
                <SignInButton onSuccess={() => connectFarcaster()} />
              ) : (
                <div style={{ textAlign: "center", color: "#22c55e" }}>
                  ✅ Signed in as @{profile?.username} (FID: {profile?.fid})
                </div>
              )}
            </div>
          </>
        )}

        {step === "signer" && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>Approve in Warpcast</div>
            <a href={signerApprovalUrl} target="_blank" style={{ display: "block", background: "#6366f1", color: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              OPEN IN WARPCAST →
            </a>
            <button onClick={checkApproval} style={{ width: "100%", background: "#333", color: "#fff", padding: 14, borderRadius: 10 }}>
              Check Status
            </button>
          </div>
        )}

        {step === "dashboard" && (
          <div>
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>{handle}</div>
                <button onClick={() => alert("Agent started (demo)")} style={{ background: "#22c55e", color: "#fff", padding: "6px 14px", borderRadius: 6 }}>
                  START AGENT
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button onClick={handlePost} disabled={isPosting} style={{ flex: 1, background: "#6366f1", color: "#fff", padding: 14, borderRadius: 10 }}>
                {isPosting ? "Posting..." : "📤 POST NOW"}
              </button>
              <button onClick={handlePreview} style={{ flex: 1, background: "#333", color: "#fff", padding: 14, borderRadius: 10 }}>
                Preview
              </button>
            </div>

            {preview && <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 16 }}>{preview}</div>}

            <div style={{ background: "#111", padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Your Posts</div>
              {posts.length === 0 ? "No posts yet" : posts.map((p, i) => <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>{p.text}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
