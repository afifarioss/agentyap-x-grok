'use client';

import { useState, useEffect, useRef } from "react";
import { SignInButton, useProfile } from '@farcaster/auth-kit';

const VIBES = [
  { id: "builder", label: "🔨 Builder", desc: "Ship stuff, talk tech on Base", successMsg: "🚀 Shipped to Farcaster." },
  { id: "degen", label: "💎 Degen", desc: "Crypto alpha & market moves", successMsg: "🚀 Cast is live, anon." },
  { id: "creator", label: "🎨 Creator", desc: "Content & community growth", successMsg: "🚀 Cast is live — keep creating." },
  { id: "family", label: "👨‍👩‍👧 Family Man", desc: "Real talk, building for family", successMsg: "🚀 Cast is live — Family First 💰" },
];

const MAX_POLL_ATTEMPTS = 45;
const POLL_INTERVAL_MS = 8000;

type Post = { text: string; time: string };

export default function AgentYap() {
  const { isAuthenticated, profile } = useProfile();

  const [step, setStep] = useState<"setup" | "signer" | "dashboard">("setup");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("Dad from Ipoh building on Base for family 💰");
  const [handle, setHandle] = useState("afifarioss");

  const [samplePreview, setSamplePreview] = useState("");
  const [preview, setPreview] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);

  const [signerUuid, setSignerUuid] = useState("");
  const [approvalUrl, setApprovalUrl] = useState("");
  const [signerStatus, setSignerStatus] = useState<"idle" | "creating" | "pending" | "approved" | "timeout">("idle");
  const [pollSeconds, setPollSeconds] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [stickyError, setStickyError] = useState<string | null>(null);

  const pollAttemptsRef = useRef(0);
  const autoConnectFiredRef = useRef(false);

  // Persist vibe & bio across refresh
  useEffect(() => {
    const savedVibe = localStorage.getItem('agentyap_vibe');
    const savedBio = localStorage.getItem('agentyap_bio');
    if (savedVibe) setVibe(savedVibe);
    if (savedBio) setBio(savedBio);
  }, []);

  useEffect(() => {
    if (vibe) localStorage.setItem('agentyap_vibe', vibe);
    localStorage.setItem('agentyap_bio', bio);
  }, [vibe, bio]);

  // Auto-clear feedback
  useEffect(() => { if (error) { const t = setTimeout(() => setError(null), 6500); return () => clearTimeout(t); } }, [error]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4500); return () => clearTimeout(t); } }, [toast]);

  // Live sample preview
  useEffect(() => {
    if (!vibe) return;
    const demos: Record<string, string> = {
      builder: "Just shipped v1.4 AgentYap with better error handling & retry. Base builders rise! 💰 #Base",
      degen: "Alpha: $TRDTALK pumping on Base. Degen season — stack for family bags. DYOR",
      creator: "New thread dropping: From Ipoh dad struggle to onchain creator. Join the journey!",
      family: "Real talk: Grinding on Base for Danish, Darissa, Damia & @wawazeqk. Family First 💰",
    };
    setSamplePreview(demos[vibe] || "Sample cast loading...");
  }, [vibe]);

  // Auto signer after SIWF
  useEffect(() => {
    if (isAuthenticated && profile?.fid && step === "setup" && !autoConnectFiredRef.current) {
      autoConnectFiredRef.current = true;
      connectFarcaster();
    }
  }, [isAuthenticated, profile?.fid, step]);

  // Polling with progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === "signer" && signerStatus === "pending" && signerUuid) {
      pollAttemptsRef.current = 0;
      setPollSeconds(0);
      interval = setInterval(async () => {
        pollAttemptsRef.current += 1;
        const secs = pollAttemptsRef.current * (POLL_INTERVAL_MS / 1000);
        setPollSeconds(secs);

        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          clearInterval(interval!);
          setSignerStatus("timeout");
          setError("Approval timeout. Tap Retry below.");
          return;
        }

        try {
          const res = await fetch(`/api/check-signer?signerUuid=${signerUuid}`);
          const data = await res.json();
          if (data.approved === true) {
            clearInterval(interval!);
            setSignerStatus("approved");
            setStep("dashboard");
            setToast("Signer approved! Ready to post.");
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, POLL_INTERVAL_MS);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [step, signerStatus, signerUuid]);

  async function connectFarcaster() {
    setError(null);
    setStickyError(null);
    if (!isAuthenticated || !profile?.fid) {
      setStickyError("Sign in with Farcaster first (button at the top).");
      return;
    }

    setSignerStatus("creating");
    try {
      const res = await fetch("/api/create-signer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: profile.fid, username: profile.username || handle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create signer");
      setSignerUuid(data.signer_uuid);
      setApprovalUrl(data.approval_url);
      setSignerStatus("pending");
      setStep("signer");
    } catch (e: any) {
      setError(e.message || "Signer creation failed. Check your NEYNAR_API_KEY.");
      setSignerStatus("idle");
    }
  }

  async function generateCastText(): Promise<string> {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe, handle: profile?.username || handle, bio }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      return data.text;
    } catch (e: any) {
      setError("Grok API issue — using fallback.");
      return `Fallback: ${vibe} mode. Ipoh Dad building on Base for family 💰 #Base`;
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePreview() {
    if (!vibe) { setError("Pilih vibe dulu bro!"); return; }
    const text = await generateCastText();
    setPreview(text);
  }

  const handlePost = async () => {
    if (!vibe || !signerUuid) { setError("Vibe & signer required."); return; }
    setIsPosting(true);
    setError(null);
    try {
      const text = preview || (await generateCastText());
      const res = await fetch("/api/post-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerUuid, text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Post failed");

      setPosts(prev => [{ text, time: new Date().toLocaleTimeString() }, ...prev]);
      setPreview("");
      const vibeConfig = VIBES.find(v => v.id === vibe);
      setToast(vibeConfig?.successMsg || "🚀 Posted on Farcaster!");
    } catch (e: any) {
      setError(e.message || "Posting failed — check signer.");
    } finally {
      setIsPosting(false);
    }
  };

  // ✅ FIXED & FULL retryConnect
  const retryConnect = () => {
    setSignerStatus("idle");
    setApprovalUrl("");
    setSignerUuid("");
    setError(null);
    setPollSeconds(0);
    setStickyError(null);
    // Re-trigger creation
    connectFarcaster();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050510", color: "#e0e0ff", padding: 20, fontFamily: "monospace" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: "bold" }}>AGENTYAP v1.4</div>
          <div style={{ color: "#22c55e" }}>GROK + NEYNAR • Ipoh Dad on Base</div>
          <p style={{ color: "#a1a1aa" }}>Vibe → Sample → Connect → Post. Family First 💰</p>
        </div>

        {stickyError && <div style={{ background: "#1a0e10", border: "2px solid #ef4444", color: "#fca5a5", padding: 16, borderRadius: 8, marginBottom: 16 }}>{stickyError}</div>}
        {error && <div style={{ background: "#1a0e10", border: "1px solid #ef4444", color: "#fca5a5", padding: 16, borderRadius: 8, marginBottom: 16 }}>{error}</div>}
        {toast && <div style={{ background: "#0e1a12", border: "1px solid #22c55e", color: "#86efac", padding: 16, borderRadius: 8, marginBottom: 16 }}>{toast}</div>}

        {/* Live Sample */}
        <div style={{ background: "#111", padding: 20, borderRadius: 12, marginBottom: 24, border: "2px solid #22c55e" }}>
          <div style={{ fontSize: 13, color: "#6366f1" }}>LIVE SAMPLE PREVIEW</div>
          <div style={{ background: "#000", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", minHeight: 110 }}>
            {samplePreview || "Pilih vibe untuk preview..."}
          </div>
        </div>

        {/* Vibe Selection */}
        <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 24 }}>
          {VIBES.map((v) => (
            <div key={v.id} onClick={() => setVibe(v.id)} style={{
              padding: 14, background: vibe === v.id ? "#1f2937" : "#000", marginBottom: 8,
              borderRadius: 8, cursor: "pointer", border: vibe === v.id ? "2px solid #22c55e" : "1px solid #333",
              transition: "all 0.2s ease", transform: vibe === v.id ? "scale(1.02)" : "scale(1)"
            }}
            onMouseEnter={e => { if (vibe !== v.id) e.currentTarget.style.transform = 'scale(1.01)'; }}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {v.label} — {v.desc}
            </div>
          ))}
        </div>

        {/* Setup */}
        {step === "setup" && (
          <>
            <div style={{ background: "#111", padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>BIO (optional)</div>
              <textarea value={bio} onChange={e => setBio(e.target.value)} style={{ width: "100%", background: "#000", color: "#fff", padding: 12, borderRadius: 8, minHeight: 80 }} placeholder="Ipoh Dad building on Base..." />
            </div>
            {!isAuthenticated ? <SignInButton /> : (
              <button onClick={connectFarcaster} disabled={signerStatus === "creating"} style={{ width: "100%", background: "#22c55e", color: "#000", padding: "16px", borderRadius: 12, fontWeight: "bold" }}>
                {signerStatus === "creating" ? "Creating Signer..." : "🚀 Connect & Get Signer"}
              </button>
            )}
          </>
        )}

        {/* Signer Step with timer */}
        {step === "signer" && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>Approve Signer in Warpcast</div>
            {approvalUrl && (
              <a href={approvalUrl} target="_blank" rel="noreferrer" style={{ display: "block", background: "#6366f1", color: "#fff", padding: 18, borderRadius: 12, margin: "20px 0", textDecoration: "none", fontWeight: "bold" }}>
                OPEN WARPCAST →
              </a>
            )}
            <div style={{ color: "#22c55e", marginBottom: 8 }}>Waiting... {pollSeconds}s</div>
            <div style={{ height: 8, background: "#333", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${Math.min((pollSeconds / (MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000)) * 100, 100)}%`, height: "100%", background: "#22c55e", transition: "width 0.4s ease" }} />
            </div>
            {signerStatus === "timeout" && (
              <button onClick={retryConnect} style={{ marginTop: 20, background: "#f59e0b", color: "#000", padding: "14px 32px", borderRadius: 8, fontWeight: "bold" }}>
                Retry Connect
              </button>
            )}
          </div>
        )}

        {/* Dashboard */}
        {step === "dashboard" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <button onClick={handlePreview} disabled={!vibe || isGenerating} style={{ flex: 1, padding: 14, background: "#333", borderRadius: 8 }}>
                {isGenerating ? "Generating..." : "Generate Preview"}
              </button>
              <button onClick={handlePost} disabled={!vibe || isPosting || !signerUuid} style={{ flex: 1, padding: 14, background: isPosting ? "#444" : "#22c55e", color: isPosting ? "#888" : "#000", borderRadius: 8 }}>
                {isPosting ? "Posting..." : "🚀 POST TO FARCASTER"}
              </button>
            </div>

            {preview && (
              <div style={{ background: "#111", padding: 20, borderRadius: 12, border: "3px solid #22c55e", marginBottom: 20 }}>
                <div style={{ color: "#22c55e", fontWeight: "bold" }}>PREVIEW ONLY (safe)</div>
                <div style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{preview}</div>
              </div>
            )}

            {posts.length > 0 && (
              <div>
                <div style={{ fontSize: 13, color: "#6366f1", marginBottom: 8 }}>RECENT CASTS</div>
                {posts.map((p, i) => (
                  <div key={i} style={{ background: "#111", padding: 12, borderRadius: 8, marginBottom: 8, whiteSpace: "pre-wrap" }}>
                    {p.text} <span style={{ color: "#666" }}>({p.time})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}