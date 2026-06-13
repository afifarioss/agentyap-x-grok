'use client';

import { useState, useEffect } from "react";

const VIBES = [
  { id: "builder", label: "🔨 Builder", desc: "Ship stuff, talk tech on Base" },
  { id: "degen",   label: "💎 Degen",   desc: "Crypto alpha & market moves" },
  { id: "creator", label: "🎨 Creator", desc: "Content & community growth" },
  { id: "family",  label: "👨‍👩‍👧 Family Man", desc: "Real talk, building for family" },
];

declare global {
  interface Window {
    onSignInSuccess?: (data: any) => void;
  }
}

export default function AgentYap() {
  const [step, setStep] = useState<"setup" | "dashboard">("setup");
  const [handle, setHandle] = useState("afifarioss");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [signerUuid, setSignerUuid] = useState("");
  const [fid, setFid] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    window.onSignInSuccess = (data: any) => {
      console.log("SIWN success:", data);
      setSignerUuid(data.signer_uuid);
      setFid(data.fid);
      setHandle(data.user?.username || handle);
      setIsAuthenticated(true);
    };

    return () => {
      window.onSignInSuccess = undefined;
    };
  }, []);

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
    if (!signerUuid) return alert("Please sign in with Farcaster first");
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
              <input
                value={handle}
                onChange={e => setHandle(e.target.value.replace("@", ""))}
                style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8, border: "none", outline: "none" }}
              />
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 8 }}>Select Vibe</div>
              {VIBES.map(v => (
                <div
                  key={v.id}
                  onClick={() => setVibe(v.id)}
                  style={{ padding: 12, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 8, borderRadius: 8, cursor: "pointer", border: vibe === v.id ? "1px solid #6366f1" : "1px solid transparent" }}
                >
                  {v.label} — {v.desc}
                </div>
              ))}
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>BIO (optional)</div>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Dad from Ipoh building on Base..."
                style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8, minHeight: 60, border: "none", outline: "none", resize: "none" }}
              />
            </div>

            <div style={{
              marginBottom: 20,
              display: "flex",
              justifyContent: "center",
              position: "relative",
              zIndex: 999
            }}>
              {!isAuthenticated ? (
                <div
                  className="neynar_signin"
                  data-client_id="62bd9f65-e3a5-44a7-875f-7e2bd715ca3a"
                  data-success-callback="onSignInSuccess"
                  data-theme="dark"
                  data-variant="warpcast"
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 999,
                    minWidth: "200px",
                    minHeight: "48px"
                  }}
                ></div>
              ) : (
                <div style={{ textAlign: "center", width: "100%" }}>
                  <div style={{ color: "#22c55e", marginBottom: 12, fontSize: 16 }}>
                    ✅ Signed in as @{handle} (FID: {fid})
                  </div>
                  <button
                    onClick={() => setStep("dashboard")}
                    style={{ background: "#6366f1", color: "#fff", padding: "14px 32px", borderRadius: 10, border: "none", fontWeight: "bold", fontSize: 16, cursor: "pointer", width: "100%" }}
                  >
                    Continue to Dashboard →
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {step === "dashboard" && (
          <div>
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold" }}>@{handle}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>FID: {fid}</div>
                </div>
                <div style={{ color: "#22c55e", fontSize: 12 }}>● Connected</div>
              </div>
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 8 }}>Vibe: {vibe || "Not selected"}</div>
              {VIBES.map(v => (
                <div
                  key={v.id}
                  onClick={() => setVibe(v.id)}
                  style={{ padding: 10, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 6, borderRadius: 8, cursor: "pointer", border: vibe === v.id ? "1px solid #6366f1" : "1px solid transparent", fontSize: 13 }}
                >
                  {v.label}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button
                onClick={handlePost}
                disabled={isPosting}
                style={{ flex: 1, background: isPosting ? "#444" : "#6366f1", color: "#fff", padding: 14, borderRadius: 10, border: "none", fontWeight: "bold", cursor: isPosting ? "not-allowed" : "pointer" }}
              >
                {isPosting ? "Posting..." : "📤 POST NOW"}
              </button>
              <button
                onClick={handlePreview}
                style={{ flex: 1, background: "#333", color: "#fff", padding: 14, borderRadius: 10, border: "none", cursor: "pointer" }}
              >
                👁 Preview
              </button>
            </div>

            {preview && (
              <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 16, border: "1px solid #6366f1", lineHeight: 1.6 }}>
                <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 8 }}>PREVIEW</div>
                {preview}
              </div>
            )}

            <div style={{ background: "#111", padding: 16, borderRadius: 12 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>Recent Posts</div>
              {posts.length === 0
                ? <div style={{ color: "#444", fontSize: 13 }}>No posts yet — tap POST NOW to send your first cast!</div>
                : posts.map((p, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #222", fontSize: 13, lineHeight: 1.5 }}>
                    <div>{p.text}</div>
                    <div style={{ color: "#444", fontSize: 11, marginTop: 4 }}>{p.time}</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}