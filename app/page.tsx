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
  const [bio, setBio] = useState("Dad from Ipoh building on Base for family 💰");
  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [preview, setPreview] = useState("");

  async function connectFarcaster() {
    if (!vibe) return alert("Pilih vibe dulu bro!");
    try {
      const res = await fetch("/api/create-signer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: profile?.fid || 3336130, username: profile?.username || handle }),
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

  async function handlePreview() {
    if (!vibe) return alert("Pilih vibe dulu bro!");
    const res = await fetch("/api/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vibe, handle: profile?.username || handle, bio }),
    });
    const data = await res.json();
    setPreview(data.text || data.error);
  }

  const handlePost = async () => {
    if (!signerUuid) return alert("Signer belum ready");
    setIsPosting(true);
    try {
      let text = preview;
      if (!text) {
        const genRes = await fetch("/api/generate-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vibe, handle: profile?.username || handle, bio }) });
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
      alert("Posted! Family First 💰");
    } catch (e: any) {
      alert(e.message);
    }
    setIsPosting(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#e0e0ff", padding: 20, fontFamily: "monospace" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 26, fontWeight: "bold" }}>AGENTYAP v1.0</div>
          <div style={{ color: "#22c55e", fontSize: 13 }}>GROK + NEYNAR • Ipoh Dad 👨‍👩‍👧</div>
        </div>

        {step === "setup" && (
          <>
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 6 }}>FARCASTER HANDLE</div>
              <input value={handle} onChange={e => setHandle(e.target.value.replace("@", ""))} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8 }} />
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 8 }}>SELECT VIBE</div>
              {VIBES.map(v => (
                <div key={v.id} onClick={() => setVibe(v.id)} style={{ padding: 12, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 8, borderRadius: 8, cursor: "pointer", border: vibe === v.id ? "1px solid #22c55e" : "none" }}>
                  {v.label} — {v.desc}
                </div>
              ))}
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>BIO (optional)</div>
              <textarea value={bio} onChange={e => setBio(e.target.value)} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8, minHeight: 80 }} />
            </div>

            {!isAuthenticated ? <SignInButton /> : (
              <button onClick={connectFarcaster} style={{ width: "100%", background: "#22c55e", color: "#000", padding: "16px", borderRadius: 12, fontWeight: "bold" }}>
                🔗 Connect & Continue
              </button>
            )}
          </>
        )}

        {step === "signer" && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 20 }}>One more step!</div>
            <a href={signerApprovalUrl} target="_blank" style={{ display: "block", background: "#6366f1", color: "#fff", padding: 16, borderRadius: 12, margin: "20px 0", textDecoration: "none" }}>
              APPROVE IN WARPCAST →
            </a>
            <button onClick={() => setStep("dashboard")} style={{ width: "100%", background: "#22c55e", color: "#000", padding: 14, borderRadius: 10 }}>
              ✅ I Approved — Dashboard
            </button>
          </div>
        )}

        {step === "dashboard" && (
          <div>
            <button onClick={handlePreview} style={{ background: "#333", padding: 12, marginRight: 8 }}>Preview</button>
            <button onClick={handlePost} disabled={isPosting} style={{ background: isPosting ? "#444" : "#22c55e", padding: 12 }}>
              {isPosting ? "Posting..." : "POST NOW"}
            </button>
            {preview && <div style={{ background: "#111", padding: 14, marginTop: 12 }}>{preview}</div>}
          </div>
        )}
      </div>
    </div>
  );
}