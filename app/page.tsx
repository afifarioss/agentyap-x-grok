'use client';

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// AGENTYAP v0.6 — GROK POWERED
// ============================================================

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
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": neynarApiKey },
    body: JSON.stringify({ signer_uuid: signerUuid, text }),
  });
  if (!res.ok) throw new Error("Neynar post failed");
  return await res.json();
}

async function createNeynarSigner(neynarApiKey: string) {
  const res = await fetch("https://api.neynar.com/v2/farcaster/signer", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": neynarApiKey },
  });
  if (!res.ok) throw new Error("Failed to create signer");
  return await res.json();
}

async function checkSignerStatus(neynarApiKey: string, signerUuid: string) {
  const res = await fetch(`https://api.neynar.com/v2/farcaster/signer?signer_uuid=${signerUuid}`, {
    headers: { "x-api-key": neynarApiKey },
  });
  if (!res.ok) throw new Error("Failed to check signer");
  return await res.json();
}

async function generateFarcasterPost(vibe: string, handle: string, bio: string, recentPosts: string[] = [], grokKey: string) {
  if (!grokKey) throw new Error("Grok API key required");
  const avoidRepeat = recentPosts.length > 0 ? `\n\nAvoid repeating these recent posts:\n${recentPosts.slice(0, 3).map(p => `- ${p}`).join("\n")}` : "";

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${grokKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.3",
      messages: [
        {
          role: "system",
          content: `You are an AI agent that posts on Farcaster on behalf of crypto builders. Generate ONE short Farcaster post. Max 280 characters. No hashtags. End with one emoji. Sound human.`,
        },
        {
          role: "user",
          content: `Generate 1 Farcaster post for @${handle}. Personality: ${vibe}. \( {bio ? `Bio: " \){bio}"` : ""}${avoidRepeat}\n\nReturn ONLY the post text.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.75,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "";
}

function TypingText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}{!done && <span style={{ animation: "blink 0.8s infinite" }}>|</span>}</span>;
}

export default function AgentYap() {
  const [step, setStep] = useState<"setup" | "signer" | "dashboard">("setup");
  const [handle, setHandle] = useState("");
  const [agentName, setAgentName] = useState("");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [neynarKey, setNeynarKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [postsPerDay, setPostsPerDay] = useState(3);

  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");
  const [signerStatus, setSignerStatus] = useState<"idle" | "creating" | "pending" | "approved" | "error">("idle");
  const [signerError, setSignerError] = useState("");

  const [agentActive, setAgentActive] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [nextPostIn, setNextPostIn] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [previewPost, setPreviewPost] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const schedulerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const recentPostsRef = useRef<string[]>([]);

  async function handleCreateSigner() {
    if (!neynarKey || !handle || !vibe || !grokKey) return alert("Isi semua key + handle + vibe");
    setSignerStatus("creating");
    try {
      const signer = await createNeynarSigner(neynarKey);
      setSignerUuid(signer.signer_uuid);
      setSignerApprovalUrl(signer.signer_approval_url);
      setSignerStatus("pending");
      setStep("signer");
      pollSignerApproval(signer.signer_uuid);
    } catch (e: any) {
      setSignerStatus("error");
      setSignerError(e.message);
    }
  }

  function pollSignerApproval(uuid: string) {
    const interval = setInterval(async () => {
      try {
        const s = await checkSignerStatus(neynarKey, uuid);
        if (s.status === "approved") {
          clearInterval(interval);
          setSignerStatus("approved");
          setStep("dashboard");
        }
      } catch (e) {}
    }, 3000);
  }

  async function handlePreview() {
    if (!grokKey) return alert("Letak Grok key");
    setPreviewing(true);
    try {
      const post = await generateFarcasterPost(vibe!, handle, bio, recentPostsRef.current, grokKey);
      setPreviewPost(post);
    } catch (e: any) {
      setPreviewPost("Error: " + e.message);
    }
    setPreviewing(false);
  }

  const postNow = useCallback(async () => {
    if (isPosting || !signerUuid || !neynarKey || !grokKey) return;
    setIsPosting(true);
    try {
      const text = await generateFarcasterPost(vibe!, handle, bio, recentPostsRef.current, grokKey);
      const result = await postToFarcaster(neynarKey, signerUuid, text);
      const newPost = { text, time: new Date().toLocaleTimeString(), hash: result.cast?.hash, url: result.cast?.hash ? `https://warpcast.com/\( {handle}/ \){result.cast.hash}` : null, status: "posted" };
      setPosts(prev => [newPost, ...prev]);
      recentPostsRef.current = [text, ...recentPostsRef.current].slice(0, 10);
    } catch (e: any) {
      setPostError(e.message);
    }
    setIsPosting(false);
  }, [isPosting, signerUuid, neynarKey, grokKey, vibe, handle, bio]);

  function startScheduler() {
    setAgentActive(true);
    const intervalMs = (24 / postsPerDay) * 60 * 60 * 1000;
    setNextPostIn(intervalMs / 1000);
    postNow();
    schedulerRef.current = setInterval(() => { postNow(); setNextPostIn(intervalMs / 1000); }, intervalMs);
    countdownRef.current = setInterval(() => setNextPostIn(prev => prev <= 1 ? intervalMs / 1000 : prev - 1), 1000);
  }

  function stopScheduler() {
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setAgentActive(false);
  }

  useEffect(() => () => {
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  function formatCountdown(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0 ? `${h}h \( {m}m` : m > 0 ? ` \){m}m \( {s}s` : ` \){s}s`;
  }

  const selectedVibe = VIBES.find(v => v.id === vibe);

  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#e0e0ff", fontFamily: "monospace", padding: 20 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: "bold" }}>AGENTYAP v0.6</div>
            <div style={{ fontSize: 12, color: "#6366f1" }}>GROK POWERED • FAMILY FIRST 💙</div>
          </div>
          {step === "dashboard" && <div style={{ background: agentActive ? "#22c55e20" : "#ffffff10", padding: "4px 12px", borderRadius: 20, fontSize: 12 }}>{agentActive ? "🟢 LIVE" : "PAUSED"}</div>}
        </div>

        {step === "setup" && (
          <div>
            <div style={{ background: "#ffffff08", padding: 16, borderRadius: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6366f1", marginBottom: 6 }}>FARCASTER HANDLE</div>
              <input value={handle} onChange={e => setHandle(e.target.value.replace("@", ""))} placeholder="afifarioss" style={{ width: "100%", background: "#ffffff08", border: "