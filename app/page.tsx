'use client';

import { useState, useEffect, useRef, useCallback } from "react";

const VIBES = [
  { id: "builder", label: "🔨 Builder", desc: "Ship stuff, post updates, talk tech on Base" },
  { id: "degen",   label: "💎 Degen",   desc: "Crypto alpha, market moves, WAGMI energy" },
  { id: "creator", label: "🎨 Creator", desc: "Content, collab, community growth" },
  { id: "family",  label: "👨‍👩‍👧 Family Man", desc: "Journey, grind, real talk, building for family" },
];

const SCHEDULES = [
  { label: "3x Daily",  value: 3,  desc: "6AM · 12PM · 8PM" },
  { label: "5x Daily",  value: 5,  desc: "Every \~5 hours" },
  { label: "Hourly",    value: 24, desc: "Maximum exposure" },
];

async function postToFarcaster(neynarApiKey: string, signerUuid: string, text: string) {
  const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": neynarApiKey },
    body: JSON.stringify({ signer_uuid: signerUuid, text }),
  });
  if (!res.ok) throw new Error("Neynar failed");
  return res.json();
}

async function createNeynarSigner(neynarApiKey: string) {
  const res = await fetch("https://api.neynar.com/v2/farcaster/signer", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": neynarApiKey },
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

async function generateFarcasterPost(vibe: string, handle: string, bio: string, recentPosts: string[] = [], grokKey: string) {
  if (!grokKey) throw new Error("Grok key required");
  const avoid = recentPosts.length > 0 ? `\nAvoid: ${recentPosts.slice(0,2).join(" | ")}` : "";
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${grokKey}` },
    body: JSON.stringify({
      model: "grok-4.3",
      messages: [
        { role: "system", content: "You are a Farcaster AI agent. Generate ONE short post max 280 chars. End with 1 emoji. Sound human and real." },
        { role: "user", content: `Post for @${handle}. Vibe: ${vibe}. ${bio ? `Bio: \( {bio}` : ""} \){avoid}\nReturn only the text.` }
      ],
      max_tokens: 280, temperature: 0.7
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "Error generating post";
}

export default function AgentYap() {
  const [step, setStep] = useState<"setup"|"signer"|"dashboard">("setup");
  const [handle, setHandle] = useState("afifarioss");
  const [agentName, setAgentName] = useState("YapDaddy");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [neynarKey, setNeynarKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");
  const [signerStatus, setSignerStatus] = useState<"idle"|"pending"|"approved">("idle");
  const [agentActive, setAgentActive] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [previewPost, setPreviewPost] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const schedulerRef = useRef<any>(null);

  async function handleCreateSigner() {
    if (!neynarKey || !grokKey || !vibe) return alert("Isi Neynar + Grok key + Vibe");
    try {
      const s = await createNeynarSigner(neynarKey);
      setSignerUuid(s.signer_uuid);
      setSignerApprovalUrl(s.signer_approval_url);
      setSignerStatus("pending");
      setStep("signer");
      setTimeout(async () => {
        const status = await checkSignerStatus(neynarKey, s.signer_uuid);
        if (status.status === "approved") {
          setSignerStatus("approved");
          setStep("dashboard");
        }
      }, 8000);
    } catch (e: any) { alert(e.message); }
  }

  async function handlePreview() {
    if (!grokKey || !vibe) return alert("Letak Grok key & pilih vibe");
    setPreviewing(true);
    try {
      const text = await generateFarcasterPost(vibe, handle, bio, [], grokKey);
      setPreviewPost(text);
    } catch (e: any) { setPreviewPost("Error: " + e.message); }
    setPreviewing(false);
  }

  const postNow = useCallback(async () => {
    if (!signerUuid || !neynarKey || !grokKey || !vibe) return;
    setIsPosting(true);
    try {
      const text = await generateFarcasterPost(vibe, handle, bio, [], grokKey);
      await postToFarcaster(neynarKey, signerUuid, text);
      setPosts(p => [{ text, time: new Date().toLocaleTimeString() }, ...p]);
    } catch (e: any) { alert("Post failed: " + e.message); }
    setIsPosting(false);
  }, [signerUuid, neynarKey, grokKey, vibe, handle, bio]);

  function startAgent() {
    setAgentActive(true);
    postNow();
    schedulerRef.current = setInterval(postNow, (24 / postsPerDay) * 60 * 60 * 1000);
  }

  function stopAgent() {
    setAgentActive(false);
    if (schedulerRef.current) clearInterval(schedulerRef.current);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#e0e0ff", padding: 20, fontFamily: "monospace" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: "bold" }}>AGENTYAP v0.6</div>
          <div style={{ color: "#6366f1", fontSize: 13 }}>GROK POWERED • IPoh Dad • Family First 💙</div>
        </div>

        {step === "setup" && (
          <>
            <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#6366f1" }}>FARCASTER HANDLE</div>
              <input value={handle} onChange={e => setHandle(e.target.value.replace("@",""))} style={{ width: "100%", background: "#000", color: "#fff", padding: 10, borderRadius: 6, marginTop: 4 }} />
            </div>

            <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 6 }}>VIBE</div>
              {VIBES.map(v => (
                <div key={v.id} onClick={() => setVibe(v.id)} style={{ padding: 10, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 6, borderRadius: 6, cursor: "pointer" }}>
                  {v.label} — {v.desc}
                </div>
              ))}
            </div>

            <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#0ea5e9" }}>NEYNAR KEY</div>
              <input type="password" value={neynarKey} onChange={e => setNeynarKey(e.target.value)} style={{ width: "100%", background: "#000", color: "#fff", padding: 10, borderRadius: 6, marginTop: 4 }} />
            </div>

            <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#22c55e" }}>GROK API KEY (xai-...)</div>
              <input type="password" value={grokKey} onChange={e => setGrokKey(e.target.value)} style={{ width: "100%", background: "#000", color: "#fff", padding: 10, borderRadius: 6, marginTop: 4 }} />
            </div>

            <button onClick={handleCreateSigner} style={{ width: "100%", background: "#6366f1", color: "#fff", padding: 14, borderRadius: 10, fontWeight: "bold" }}>
              CONNECT FARCASTER
            </button>
          </>
        )}

        {step === "signer" && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 18, marginBottom: 16 }}>Approve signer in Warpcast</div>
            <a href={signerApprovalUrl} target="_blank" style={{ background: "#6366f1", color: "#fff", padding: 14, borderRadius: 10, display: "block" }}>OPEN IN WARPCAST →</a>
          </div>
        )}

        {step === "dashboard" && (
          <div>
            <div style={{ background: "#111", padding: 14, borderRadius: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>{agentName} (@{handle})</div>
                <button onClick={agentActive ? stopAgent : startAgent} style={{ background: agentActive ? "#ef4444" : "#22c55e", color: "#fff", padding: "6px 14px", borderRadius: 6 }}>
                  {agentActive ? "STOP" : "START"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={postNow} disabled={isPosting} style={{ flex: 1, background: "#6366f1", color: "#fff", padding: 12, borderRadius: 8 }}>POST NOW</button>
              <button onClick={handlePreview} disabled={previewing} style={{ flex: 1, background: "#333", color: "#fff", padding: 12, borderRadius: 8 }}>PREVIEW</button>
            </div>

            {previewPost && <div style={{ background: "#111", padding: 12, borderRadius: 8, marginBottom: 12 }}>{previewPost}</div>}

            <div style={{ background: "#111", padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>POSTS</div>
              {posts.length === 0 ? "No posts yet" : posts.map((p, i) => <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #222" }}>{p.text}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}