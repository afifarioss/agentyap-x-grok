'use client';

import { useState } from "react";

const VIBES = [
  { id: "builder", label: "🔨 Builder", desc: "Ship stuff, talk tech on Base" },
  { id: "degen",   label: "💎 Degen",   desc: "Crypto alpha & market moves" },
  { id: "creator", label: "🎨 Creator", desc: "Content & community growth" },
  { id: "family",  label: "👨‍👩‍👧 Family Man", desc: "Real talk, building for family" },
];

async function generatePost(vibe: string, handle: string, bio: string, grokKey: string) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${grokKey}` },
    body: JSON.stringify({
      model: "grok-4.3",
      messages: [
        { role: "system", content: "You are a Farcaster AI agent. Generate ONE short post max 280 chars. End with 1 emoji. Sound human." },
        { role: "user", content: `Post for @${handle}. Vibe: ${vibe}. ${bio ? `Bio: ${bio}` : ""}\nReturn only the text.` }
      ],
      max_tokens: 280,
      temperature: 0.7,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "Error generating post";
}

async function postCast(neynarKey: string, signerUuid: string, text: string) {
  const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": neynarKey },
    body: JSON.stringify({ signer_uuid: signerUuid, text }),
  });
  if (!res.ok) throw new Error("Failed to post cast");
  return res.json();
}

export default function AgentYap() {
  const [step, setStep] = useState<"setup" | "signer" | "dashboard">("setup");
  const [handle, setHandle] = useState("afifarioss");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [neynarKey, setNeynarKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [preview, setPreview] = useState("");

  async function connectFarcaster() {
    if (!neynarKey || !grokKey || !vibe) return alert("Isi semua key + pilih vibe");

    try {
      const res = await fetch("/api/create-signer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: 12345, username: handle }),
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
    // Simple manual check for now
    alert("Please approve in Warpcast first, then refresh this page.");
  }

  async function handlePreview() {
    if (!grokKey || !vibe) return alert("Isi Grok key & pilih vibe");
    const text = await generatePost(vibe, handle, bio, grokKey);
    setPreview(text);
  }

  const handlePost = async () => {
    if (!signerUuid || !neynarKey) return alert("Signer not ready");
    setIsPosting(true);
    try {
      const text = preview || await generatePost(vibe!, handle, bio, grokKey);
      await postCast(neynarKey, signerUuid, text);
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
          <div style={{ fontSize: 26, fontWeight: "bold" }}>AGENTYAP v0.8</div>
          <div style={{ color: "#6366f1", fontSize: 13 }}>GROK + NEYNAR • REAL-TIME</div>
        </div>

        {step === "setup" && (
          <>
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 6 }}>FARCASTER HANDLE</div>
              <input value={handle} onChange={e => setHandle(e.target.value.replace("@",""))} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8 }} />
            </div>

            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 8 }}>Pilih Vibe</div>
              {VIBES.map(v => (
                <div key={v.id} onClick={() => setVibe(v.id)} style={{ padding: 12, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 8, borderRadius: 8, cursor: "pointer" }}>
                  {v.label} — {v.desc}
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

            <button onClick={connectFarcaster} style={{ width: "100%", background: "#6366f1", color: "#fff", padding: 16, borderRadius: 12, fontWeight: "bold" }}>
              CONNECT FARCASTER
            </button>
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