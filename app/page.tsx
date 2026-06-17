'use client';

import { useState, useEffect, useRef } from "react";
import { SignInButton, useProfile } from '@farcaster/auth-kit';

const VIBES = [
  { id: "builder", label: "🔨 Builder", desc: "Ship stuff, talk tech on Base" },
  { id: "degen",   label: "💎 Degen",   desc: "Crypto alpha & market moves" },
  { id: "creator", label: "🎨 Creator", desc: "Content & community growth" },
  { id: "family",  label: "👨‍👩‍👧 Family Man", desc: "Real talk, building for family" },
];

const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 5000;
const BACKOFF_AFTER_ATTEMPTS = 6; // after ~30s of no response, slow down
const BACKOFF_INTERVAL_MS = 10000; // step up to 10s between polls

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

  // 🔧 NEW
  const [error, setError] = useState<string | null>(null);
  const [signerStatus, setSignerStatus] = useState<"idle" | "pending" | "approved" | "timeout">("idle");
  const [pollSeconds, setPollSeconds] = useState(0);
  const pollAttemptsRef = useRef(0);
  const autoConnectFiredRef = useRef(false);

  // 🔧 NEW — auto-clear error after 6s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  // 🔧 FIX — one-click: auto-connect the moment auth succeeds, no second button
  useEffect(() => {
    if (isAuthenticated && profile?.fid && !autoConnectFiredRef.current && step === "setup") {
      autoConnectFiredRef.current = true;
      connectFarcaster();
    }
  }, [isAuthenticated, profile?.fid, step]);

  // 🔧 FIX — real polling instead of an honor-system "I Approved" button
  // 🔧 NEW — backs off to a slower interval after BACKOFF_AFTER_ATTEMPTS
  // failed checks, so we're not hammering /api/check-signer the whole
  // time someone takes a while in Warpcast (jesseXBT's suggestion).
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    if (step === "signer" && signerStatus === "pending" && signerUuid) {
      pollAttemptsRef.current = 0;
      setPollSeconds(0);

      const elapsedMsRef = { current: 0 };

      const poll = async () => {
        if (cancelled) return;
        pollAttemptsRef.current += 1;
        elapsedMsRef.current +=
          pollAttemptsRef.current <= BACKOFF_AFTER_ATTEMPTS
            ? POLL_INTERVAL_MS
            : BACKOFF_INTERVAL_MS;
        setPollSeconds(Math.round(elapsedMsRef.current / 1000));

        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          setSignerStatus("timeout");
          return;
        }

        try {
          const res = await fetch(`/api/check-signer?signerUuid=${signerUuid}`);
          const data = await res.json();
          if (data.approved === true) {
            setSignerStatus("approved");
            setStep("dashboard");
            return; // stop polling, don't schedule next
          }
        } catch (e) {
          console.error("Polling error:", e);
          // transient network error — don't kill the loop, just keep going
        }

        if (cancelled) return;
        // 🔧 step up the interval after BACKOFF_AFTER_ATTEMPTS attempts
        const nextDelay =
          pollAttemptsRef.current < BACKOFF_AFTER_ATTEMPTS
            ? POLL_INTERVAL_MS
            : BACKOFF_INTERVAL_MS;
        timeoutId = setTimeout(poll, nextDelay);
      };

      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [step, signerStatus, signerUuid]);

  async function connectFarcaster() {
    // 🔧 FIX — no hardcoded fallback FID. Hard stop instead.
    if (!isAuthenticated || !profile?.fid) {
      setError("Sign in with Farcaster first — we need your FID to create a signer.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/create-signer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: profile.fid, username: profile.username || handle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create signer");
      setSignerUuid(data.signer_uuid);
      setSignerApprovalUrl(data.approval_url);
      setSignerStatus("pending");
      setStep("signer");
    } catch (e: any) {
      setError(e.message || "Something went wrong creating your signer.");
      autoConnectFiredRef.current = false; // allow retry
    }
  }

  function retryConnect() {
    setSignerStatus("idle");
    setSignerApprovalUrl("");
    setSignerUuid("");
    autoConnectFiredRef.current = false;
    setStep("setup");
    connectFarcaster();
  }

  async function handlePreview() {
    if (!vibe) { setError("Pick a vibe above first."); return; }
    setError(null);
    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe, handle: profile?.username || handle, bio }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      setPreview(data.text);
    } catch (e: any) {
      setError(e.message || "Couldn't generate preview.");
    }
  }

  const handlePost = async () => {
    if (!signerUuid) { setError("Signer not ready — reconnect Farcaster."); return; }
    setError(null);
    setIsPosting(true);
    try {
      let text = preview;
      if (!text) {
        const genRes = await fetch("/api/generate-post", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vibe, handle: profile?.username || handle, bio }),
        });
        const genData = await genRes.json();
        if (genData.error) throw new Error(genData.error);
        text = genData.text;
      }
      const postRes = await fetch("/api/post-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerUuid, text }),
      });
      const postData = await postRes.json();
      if (!postRes.ok || postData.error) throw new Error(postData.error || "Post failed");
      setPosts(p => [{ text, time: new Date().toLocaleTimeString() }, ...p]);
      setPreview("");
    } catch (e: any) {
      setError(e.message || "Couldn't post that cast.");
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

        {/* 🔧 NEW — inline error replaces alert() everywhere */}
        {error && (
          <div style={{ background: "#1a0e10", border: "1px solid #ef4444", color: "#fca5a5", padding: "12px 16px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {step === "setup" && (
          <>
            {/* 🔧 NEW — jesseXBT's #1 flag: explain what the app does before
                asking anyone to sign in or pick anything. */}
            <div style={{ background: "#111", padding: 20, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: "#6366f1", marginBottom: 8 }}>WHAT YOU GET</div>
              <ul style={{ color: "#a1a1aa", lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
                <li>AI writes Farcaster casts in your chosen vibe — Builder, Degen, Creator, or Family Man</li>
                <li>Your own signer — AgentYap posts as you, never holds your keys</li>
                <li>One tap approval in Warpcast, then post anytime</li>
                <li>Stay visible on Farcaster without spending hours writing casts</li>
              </ul>
            </div>

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

            {/* 🔧 FIX — sign-in is the ONLY action now. No second "Connect" button. */}
            {!isAuthenticated ? (
              <>
                <SignInButton />
                <div style={{ fontSize: 12, color: "#71717a", marginTop: 10, textAlign: "center" }}>
                  Signing in automatically sets up your signer — no extra steps.
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "#22c55e", padding: 12 }}>
                Setting up your signer...
              </div>
            )}
          </>
        )}

        {step === "signer" && (
          <div style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 20, marginBottom: 16 }}>Almost there — approve your signer</div>

            {signerStatus === "pending" && (
              <div>
                <a href={signerApprovalUrl} target="_blank" rel="noreferrer" style={{ display: "block", background: "#6366f1", color: "#fff", padding: 16, borderRadius: 12, margin: "20px 0", textDecoration: "none", fontWeight: "bold" }}>
                  Approve AgentYap in Warpcast →
                </a>
                <p style={{ fontSize: 14, color: "#22c55e" }}>Waiting for approval in Warpcast... {pollSeconds}s</p>
                <p style={{ fontSize: 13, color: "#666" }}>This page updates automatically once you approve — no need to come back and check.</p>
              </div>
            )}

            {signerStatus === "timeout" && (
              <div>
                <p style={{ color: "#f59e0b", fontSize: 16, marginBottom: 16 }}>No problem — just tap below when you're ready.</p>
                <button onClick={retryConnect} style={{ background: "#6366f1", color: "#fff", padding: "14px 24px", borderRadius: 10, fontWeight: "bold", border: "none", cursor: "pointer" }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {step === "dashboard" && (
          <div>
            <button onClick={handlePreview} style={{ background: "#333", color: "#fff", padding: 12, marginRight: 8, borderRadius: 8, border: "none" }}>Preview</button>
            <button onClick={handlePost} disabled={isPosting} style={{ background: isPosting ? "#444" : "#22c55e", color: "#000", padding: 12, borderRadius: 8, border: "none", fontWeight: "bold" }}>
              {isPosting ? "Posting..." : "POST NOW"}
            </button>
            {preview && <div style={{ background: "#111", padding: 14, marginTop: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>{preview}</div>}
            {posts.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Recent Casts</div>
                {posts.map((p, i) => (
                  <div key={i} style={{ background: "#111", padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <div>{p.text}</div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{p.time}</div>
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
