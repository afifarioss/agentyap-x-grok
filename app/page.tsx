'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { SignInButton, useProfile } from "@farcaster/auth-kit";

const VIBES = [
  { id: "builder", label: "🔨 Builder", desc: "Shipping updates, product lessons, and Base experiments" },
  { id: "degen", label: "💎 Degen", desc: "Crypto thoughts, Base energy, and token culture" },
  { id: "creator", label: "🎨 Creator", desc: "Audience growth, content ideas, and community posts" },
  { id: "family", label: "👨‍👩‍👧 Family Man", desc: "Real life, parenting, and building for family" },
];

const SIGNER_WAIT_MESSAGES = [
  "Opening the Farcaster approval flow...",
  "Waiting for your signer approval...",
  "Once approved, AgentYap can help you post casts.",
  "Still here — Farcaster approval can take a moment.",
  "You can return to this tab after approving.",
  "Almost there. If nothing happens, tap Try Again below.",
];

const PROMPT_IDEAS = [
  "I shipped a small update today and want to share it.",
  "I fixed a bug that was blocking my app.",
  "I'm learning how Farcaster signers work.",
  "I'm building AgentYap in public as a dad of 3.",
];

const HOW_IT_WORKS = [
  { num: "1", title: "Drop an idea", desc: "Write a rough thought, update, or story." },
  { num: "2", title: "Pick your vibe", desc: "Builder, Degen, Creator, or Family Man." },
  { num: "3", title: "Approve and post", desc: "AgentYap drafts it. You approve before it goes to Farcaster." },
];

const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;
const BACKOFF_AFTER_ATTEMPTS = 8;
const BACKOFF_INTERVAL_MS = 3000;
const MAX_GENERATING_RETRIES = 15;
const GENERATING_RETRY_DELAY_MS = 3000;

type Step = "setup" | "signer" | "hub-register" | "dashboard";
type SignerStatus = "idle" | "pending" | "approved" | "timeout";
type SignerMode = "neynar" | "hub" | "demo" | null;

interface HubSignerState {
  publicKey: string;
  encryptedPrivKey: string;
  addKeyCalldata: string;
  keyRegistryAddress: string;
}

interface Post {
  id: string;
  text: string;
  time: string;
  hash?: string;
}

function track(event: string, data?: Record<string, unknown>): void {
  console.log("[AgentYap event]", event, data ?? {});
}

function makePostId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AgentYap() {
  const { isAuthenticated, profile } = useProfile();

  const fid = profile?.fid;
  const username = profile?.username;

  const [step, setStep] = useState<Step>("setup");
  const [handle, setHandle] = useState("afifarioss");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState("Dad from Ipoh building AgentYap on Base for family.");

  const [signerMode, setSignerMode] = useState<SignerMode>(null);
  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");
  const [hubSigner, setHubSigner] = useState<HubSignerState | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [preview, setPreview] = useState("");

  const [samplePost, setSamplePost] = useState("");
  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const sampleCacheRef = useRef<Record<string, string>>({});
  const latestVibeRef = useRef<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [signerStatus, setSignerStatus] = useState<SignerStatus>("idle");
  const [pollSeconds, setPollSeconds] = useState(0);

  const pollAttemptsRef = useRef(0);
  const autoConnectFiredRef = useRef(false);
  const landingTrackedRef = useRef(false);
  const generatingRetriesRef = useRef(0);

  const selectedVibe = VIBES.find((v) => v.id === vibe);

  const signerMessage =
    SIGNER_WAIT_MESSAGES[
      Math.min(Math.floor(pollSeconds / 10), SIGNER_WAIT_MESSAGES.length - 1)
    ];

  useEffect(() => {
    if (!landingTrackedRef.current) {
      landingTrackedRef.current = true;
      track("landing_view");
    }
  }, []);

  useEffect(() => { latestVibeRef.current = vibe; }, [vibe]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const connectFarcaster = useCallback(
    async (): Promise<void> => {
      if (!isAuthenticated || !fid) {
        setError("Sign in with Farcaster first.");
        return;
      }

      setError(null);
      track("signer_create_started", { fid });

      try {
        const res = await fetch("/api/create-signer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fid, username: username ?? handle }),
        });

        const data = (await res.json()) as {
          mode?: string;
          status?: string;
          demo?: boolean;
          message?: string;
          signer_uuid?: string;
          approval_url?: string;
          publicKey?: string;
          encryptedPrivKey?: string;
          addKeyCalldata?: string;
          keyRegistryAddress?: string;
        };

        if (data.demo === true) {
          setSignerMode("demo");
          setError(
            data.message || "Demo mode — Neynar credits required to publish. You can still generate and preview casts."
          );
          autoConnectFiredRef.current = false;
          track("signer_demo_mode");
          return;
        }

        if (data.mode === "hub" && data.publicKey && data.encryptedPrivKey) {
          setSignerMode("hub");
          setHubSigner({
            publicKey: data.publicKey,
            encryptedPrivKey: data.encryptedPrivKey,
            addKeyCalldata: data.addKeyCalldata ?? "",
            keyRegistryAddress: data.keyRegistryAddress ?? "",
          });
          setStep("hub-register");
          track("signer_hub_mode", { publicKey: data.publicKey });
          return;
        }

        if (data.mode === "neynar" && data.signer_uuid && data.approval_url) {
          generatingRetriesRef.current = 0;
          setSignerMode("neynar");
          setSignerUuid(data.signer_uuid);
          setSignerApprovalUrl(data.approval_url);
          setSignerStatus("pending");
          setStep("signer");
          track("signer_created", { signerUuid: data.signer_uuid });
          return;
        }

        if (data.mode === "neynar" && data.status === "generated" && data.signer_uuid) {
          if (generatingRetriesRef.current < MAX_GENERATING_RETRIES) {
            generatingRetriesRef.current += 1;
            setToast("Setting up your signer, just a moment...");
            track("signer_generating_retry", {
              signerUuid: data.signer_uuid,
              attempt: generatingRetriesRef.current,
            });
            setTimeout(() => { void connectFarcaster(); }, GENERATING_RETRY_DELAY_MS);
            return;
          }
          throw new Error(
            "Setup is taking longer than usual. Tap Continue setup below to try again — this happens sometimes with Farcaster's servers, nothing wrong with your account."
          );
        }

        throw new Error(data.message ?? "Unknown signer response");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        autoConnectFiredRef.current = false;
        track("signer_create_error", { message: msg });
      }
    },
    [isAuthenticated, fid, username, handle]
  );

  useEffect(() => {
    if (isAuthenticated && fid && !autoConnectFiredRef.current && step === "setup") {
      autoConnectFiredRef.current = true;
      track("signin_completed", { fid, username });
      void connectFarcaster();
    }
  }, [isAuthenticated, fid, username, step, connectFarcaster]);

  // Neynar signer polling
  useEffect(() => {
    if (step !== "signer" || signerStatus !== "pending" || !signerUuid) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    pollAttemptsRef.current = 0;
    queueMicrotask(() => setPollSeconds(0));
    const elapsedMs = { current: 0 };

    const poll = async (isFocusCheck = false): Promise<void> => {
      if (cancelled) return;

      if (!isFocusCheck) {
        pollAttemptsRef.current += 1;
        const interval = pollAttemptsRef.current <= BACKOFF_AFTER_ATTEMPTS
          ? POLL_INTERVAL_MS : BACKOFF_INTERVAL_MS;
        elapsedMs.current += interval;
        setPollSeconds(Math.round(elapsedMs.current / 1000));

        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          setSignerStatus("timeout");
          track("signer_timeout", { signerUuid });
          return;
        }
      }

      try {
        const res = await fetch(`/api/check-signer?signerUuid=${signerUuid}`);
        const data = (await res.json()) as { approved?: boolean; status?: string };
        track("signer_poll", { approved: data.approved, attempt: pollAttemptsRef.current, focusCheck: isFocusCheck });

        if (data.approved === true) {
          setSignerStatus("approved");
          setStep("dashboard");
          track("signer_approved", { signerUuid });
          return;
        }
      } catch {
        // silently fail poll errors
      }

      if (cancelled || isFocusCheck) return;
      timeoutId = setTimeout(
        poll,
        pollAttemptsRef.current < BACKOFF_AFTER_ATTEMPTS ? POLL_INTERVAL_MS : BACKOFF_INTERVAL_MS
      );
    };

    timeoutId = setTimeout(poll, 1500);

    const handleFocus = () => {
      if (cancelled) return;
      void poll(true);
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [step, signerStatus, signerUuid]);

  useEffect(() => {
    if (step === "dashboard") {
      track("dashboard_view", { vibe, username: username ?? handle });
    }
  }, [step, vibe, username, handle]);

  function retryConnect(): void {
    setSignerStatus("idle");
    setSignerApprovalUrl("");
    setSignerUuid("");
    setHubSigner(null);
    setSignerMode(null);
    setPollSeconds(0);
    generatingRetriesRef.current = 0;
    autoConnectFiredRef.current = false;
    setStep("setup");
    setTimeout(() => { void connectFarcaster(); }, 0);
  }

  async function handleVibeSelect(vibeId: string): Promise<void> {
    setVibe(vibeId);
    latestVibeRef.current = vibeId;
    track("vibe_selected", { vibe: vibeId });

    if (sampleCacheRef.current[vibeId]) {
      setSamplePost(sampleCacheRef.current[vibeId]);
      return;
    }

    setIsSampleLoading(true);
    setSamplePost("");

    try {
      const res = await fetch("/api/sample-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe: vibeId, handle, bio }),
      });

      const data = (await res.json()) as { text?: string; error?: string };
      if (latestVibeRef.current !== vibeId) return;
      if (!res.ok || data.error) throw new Error(data.error ?? "Sample generation failed");

      sampleCacheRef.current[vibeId] = data.text ?? "";
      setSamplePost(data.text ?? "");
    } catch {
      if (latestVibeRef.current === vibeId) {
        setSamplePost("⚠️ Could not load a sample — tap the vibe again.");
      }
    } finally {
      if (latestVibeRef.current === vibeId) setIsSampleLoading(false);
    }
  }

  async function handlePreview(): Promise<void> {
    if (!vibe) { setError("Pick a vibe first."); return; }
    setError(null);
    setIsPreviewLoading(true);

    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe, handle: username ?? handle, bio }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");
      setPreview(data.text ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not generate preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handlePost(): Promise<void> {
    if (!vibe) { setError("Pick a vibe first."); return; }

    const isHubMode = signerMode === "hub" && hubSigner;
    const isNeynarMode = signerMode === "neynar" && signerUuid;

    if (!isHubMode && !isNeynarMode) {
      setError("Signer not ready — reconnect Farcaster.");
      return;
    }

    setError(null);
    setIsPosting(true);

    try {
      let text = preview;

      if (!text) {
        const genRes = await fetch("/api/generate-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vibe, handle: username ?? handle, bio }),
        });
        const genData = (await genRes.json()) as { text?: string; error?: string };
        if (!genRes.ok || genData.error) throw new Error(genData.error ?? "Could not generate cast.");
        text = genData.text ?? "";
      }

      const postBody = isHubMode
        ? {
            mode: "hub" as const,
            encryptedPrivKey: hubSigner.encryptedPrivKey,
            fid,
            text,
            vibe: vibe ?? "builder",
            isAgent: true,
          }
        : {
            mode: "neynar" as const,
            signerUuid,
            fid,
            text,
            vibe: vibe ?? "builder",
            isAgent: true,
          };

      const postRes = await fetch("/api/post-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody),
      });

      const postData = (await postRes.json()) as {
        hash?: string;
        cast_url?: string;
        error?: string;
      };

      if (!postRes.ok || postData.error) throw new Error(postData.error ?? "Post failed");

      setPosts((current) => [
        {
          id: makePostId(),
          text,
          time: new Date().toLocaleTimeString(),
          hash: postData.hash,
        },
        ...current,
      ]);

      setPreview("");
      setToast("🟦 Cast posted to Farcaster");
      track("cast_posted", { vibe, hash: postData.hash, mode: signerMode });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not post that cast.");
    } finally {
      setIsPosting(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "#0b1120",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    border: "1px solid #1f2937",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#818cf8",
    marginBottom: 8,
    letterSpacing: 0.8,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "#020617",
    color: "#fff",
    padding: 13,
    borderRadius: 10,
    border: "1px solid #1f2937",
    outline: "none",
  };

  return (
    <>
      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #111827 0%, #050510 45%, #020617 100%)",
        color: "#e0e0ff",
        padding: 20,
        fontFamily: "monospace",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <style jsx global>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulseGlow {
              0% { box-shadow: 0 0 0 rgba(34,197,94,0); }
              50% { box-shadow: 0 0 24px rgba(34,197,94,0.18); }
              100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
            }
          `}</style>

          <header style={{ marginBottom: 24, paddingTop: 12 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#111827", border: "1px solid #1f2937",
              color: "#22c55e", fontSize: 12, padding: "6px 10px",
              borderRadius: 999, marginBottom: 14,
            }}>
              HIP v1.0 • BUILT ON BASE • FARCASTER-NATIVE
            </div>

            <div style={{ fontSize: 34, fontWeight: "bold", lineHeight: 1.1 }}>AgentYap</div>
            <div style={{ fontSize: 18, color: "#c4b5fd", marginTop: 8, lineHeight: 1.4 }}>
              Turn rough ideas into Farcaster casts — with AI assistance clearly marked.
            </div>
            <div style={{ fontSize: 14, color: "#71717a", marginTop: 6, lineHeight: 1.5 }}>
              Built for builders who want to stay visible without pretending AI did not help.
            </div>
            <p style={{ color: "#a1a1aa", lineHeight: 1.7, marginTop: 14 }}>
              AI generates. You approve. AgentYap marks every cast as AI-assisted.
              Every cast is human-approved before it leaves your account.
            </p>
            <p style={{ color: "#71717a", fontSize: 13, lineHeight: 1.6 }}>
              Built by <strong style={{ color: "#e0e0ff" }}>afifarioss</strong> — Ipoh dad. Base builder. 3 kids.
            </p>
          </header>

          {error && (
            <div style={{
              background: "#1a0e10", border: "1px solid #ef4444",
              color: "#fca5a5", padding: "12px 16px", borderRadius: 10,
              marginBottom: 16, fontSize: 14,
            }}>{error}</div>
          )}
          {toast && (
            <div style={{
              background: "#0e1a12", border: "1px solid #22c55e",
              color: "#86efac", padding: "12px 16px", borderRadius: 10,
              marginBottom: 16, fontSize: 14,
            }}>{toast}</div>
          )}

          {step === "setup" && (
            <>
              {/* HOW IT WORKS — 3 cards */}
              <section style={cardStyle}>
                <div style={labelStyle}>HOW IT WORKS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {HOW_IT_WORKS.map((item) => (
                    <div key={item.num} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: "#1f2937",
                        color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: "bold", flexShrink: 0,
                      }}>
                        {item.num}
                      </div>
                      <div>
                        <div style={{ color: "#e0e0ff", fontWeight: "bold", fontSize: 14 }}>{item.title}</div>
                        <div style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.5 }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={cardStyle}>
                <div style={labelStyle}>WHY AGENTYAP EXISTS</div>
                <p style={{ color: "#d4d4d8", lineHeight: 1.7, margin: 0 }}>
                  Posting every day is hard. AgentYap turns rough ideas into clean Farcaster casts —
                  without losing your voice. AI assists. You approve. 🟦 marks the attribution.
                </p>
              </section>

              <section style={cardStyle}>
                <div style={labelStyle}>FARCASTER HANDLE</div>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace("@", ""))}
                  placeholder="afifarioss"
                  style={inputStyle}
                />
              </section>

              <section style={cardStyle}>
                <div style={labelStyle}>CHOOSE YOUR VIBE</div>
                <div style={{ fontSize: 13, color: "#71717a", marginBottom: 12 }}>
                  Tap one to see a sample before signing in.
                </div>

                {VIBES.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => void handleVibeSelect(v.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && void handleVibeSelect(v.id)}
                    aria-pressed={vibe === v.id}
                    style={{
                      padding: 14,
                      background: vibe === v.id ? "#12231a" : "#020617",
                      marginBottom: 10, borderRadius: 12, cursor: "pointer",
                      border: vibe === v.id ? "1px solid #22c55e" : "1px solid #1f2937",
                    }}
                  >
                    <div style={{ color: "#fff", fontWeight: "bold" }}>{v.label}</div>
                    <div style={{ color: "#a1a1aa", fontSize: 13, marginTop: 4 }}>{v.desc}</div>
                  </div>
                ))}

                {vibe && (isSampleLoading || samplePost) && (
                  <div style={{
                    marginTop: 14, background: "#020617",
                    borderLeft: "3px solid #22c55e", padding: 14, borderRadius: 10,
                  }}>
                    <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 8, letterSpacing: 0.6 }}>
                      SAMPLE CAST — HIP PREVIEW
                    </div>
                    {isSampleLoading ? (
                      <div style={{ color: "#71717a", fontSize: 14 }}>Writing a sample...</div>
                    ) : (
                      <div style={{ color: "#e0e0ff", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                        {samplePost}
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section style={cardStyle}>
                <div style={labelStyle}>BIO OR ROUGH IDEA</div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Drop a rough idea. AgentYap will clean it up."
                  style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
                />
                <button
                  onClick={() => void handlePreview()}
                  disabled={isPreviewLoading || !vibe}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    background: isPreviewLoading || !vibe ? "#1f2937" : "#6366f1",
                    color: "#fff",
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: "none",
                    fontWeight: "bold",
                    cursor: isPreviewLoading || !vibe ? "not-allowed" : "pointer",
                    fontSize: 15,
                  }}
                >
                  {isPreviewLoading ? "AgentYap is thinking..." : "Generate sample cast →"}
                </button>
              </section>

              {/* PREVIEW + EDIT — shown before sign-in */}
              {preview && (
                <>
                  <section style={cardStyle}>
                    <div style={labelStyle}>PREVIEW — EDIT BEFORE YOU POST</div>
                    <textarea
                      value={preview}
                      onChange={(e) => setPreview(e.target.value)}
                      style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                    />
                    <div style={{ fontSize: 12, color: "#71717a", marginTop: 8, lineHeight: 1.5 }}>
                      Edit the draft above. When you&apos;re happy with it, sign in to post.
                    </div>
                  </section>

                  {/* EXAMPLE 🟦 CAST */}
                  <section style={cardStyle}>
                    <div style={labelStyle}>EXAMPLE 🟦 CAST</div>
                    <div style={{
                      background: "#020617", border: "1px solid #1f2937",
                      borderRadius: 12, padding: 14,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #22c55e, #0ea5e9)" }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: "bold", color: "#e0e0ff" }}>@afifarioss</div>
                          <div style={{ fontSize: 11, color: "#52525b" }}>2h ago</div>
                        </div>
                      </div>
                      <p style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                        Just shipped a new feature on Base. Real talk: AI helped me draft this, but I approved every word. Family first. 💰
                      </p>
                      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                        <span style={{ fontSize: 11, background: "#1e3a5f", color: "#60a5fa", padding: "3px 8px", borderRadius: 999 }}>
                          🟦 ai-assisted: AgentYap HIP-1.0
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* HIP EXPLANATION */}
                  <section style={cardStyle}>
                    <div style={labelStyle}>🟦 HYBRID IDENTITY PROTOCOL</div>
                    <p style={{ color: "#d4d4d8", lineHeight: 1.7, margin: 0, marginBottom: 10 }}>
                      <strong>HIP = Hybrid Identity Protocol.</strong> Your identity stays human.
                      AI helps write. You approve. AgentYap adds transparent attribution.
                    </p>
                    <p style={{ color: "#a1a1aa", lineHeight: 1.7, margin: 0 }}>
                      Every AI-assisted cast gets a 🟦 marker. No deception —
                      the marker is machine-readable cast metadata. Human still owns
                      the identity. Agent provides the voice. You approve every post.
                    </p>
                  </section>
                </>
              )}

              {/* SIGN IN — only after preview is generated */}
              {!isAuthenticated ? (
                <div style={{ textAlign: "center", marginBottom: 30 }}>
                  {preview ? (
                    <>
                      <div onClick={() => track("signin_clicked", { vibe: vibe ?? undefined })} style={{ marginBottom: 12 }}>
                        <SignInButton />
                      </div>
                      <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.6 }}>
                        Sign in with Farcaster to post this 🟦 cast.
                      </div>
                      <div style={{ fontSize: 12, color: "#52525b", marginTop: 8, lineHeight: 1.6 }}>
                        AgentYap never gets your private keys. You approve before anything posts.
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#71717a", lineHeight: 1.6, marginBottom: 30 }}>
                      Pick a vibe and generate a preview first — no sign-in required.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  textAlign: "center", color: "#22c55e", padding: 14,
                  background: "#052e16", border: "1px solid #14532d", borderRadius: 12,
                }}>
                  <div style={{ marginBottom: 10 }}>Setting up your signer...</div>
                  <button
                    onClick={() => {
                      autoConnectFiredRef.current = false;
                      void connectFarcaster();
                    }}
                    style={{
                      background: "#22c55e", color: "#000", padding: "10px 14px",
                      borderRadius: 10, border: "none", fontWeight: "bold", cursor: "pointer",
                    }}
                  >
                    Continue setup
                  </button>
                </div>
              )}
            </>
          )}

          {step === "signer" && (
            <div style={{
              textAlign: "center", padding: 28,
              background: "#0b1120", border: "1px solid #1f2937", borderRadius: 16,
              animation: "pulseGlow 2.4s ease-in-out infinite",
            }}>
              <div style={{
                width: 46, height: 46, border: "3px solid #1f2937",
                borderTop: "3px solid #22c55e", borderRadius: "50%",
                margin: "0 auto 18px", animation: "spin 1s linear infinite",
              }} />

              <div style={{ fontSize: 22, marginBottom: 10, fontWeight: "bold" }}>
                Approve your AgentYap signer
              </div>

              {signerStatus === "pending" && (
                <>
                  <a
                    href={signerApprovalUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "block", background: "#6366f1", color: "#fff",
                      padding: 16, borderRadius: 12, margin: "18px 0",
                      textDecoration: "none", fontWeight: "bold",
                    }}
                  >
                    Open Farcaster approval →
                  </a>

                  <div style={{
                    background: "#020617", border: "1px solid #1f2937",
                    borderRadius: 12, padding: 14, marginTop: 14,
                  }}>
                    <p style={{ fontSize: 14, color: "#22c55e", margin: 0, lineHeight: 1.6 }}>
                      {signerMessage}
                    </p>
                    <div style={{ fontSize: 12, color: "#71717a", marginTop: 6 }}>
                      Checking... {pollSeconds}s
                    </div>
                  </div>

                  <div style={{
                    background: "#0b1120", border: "1px solid #312e81",
                    borderRadius: 12, padding: 16, marginTop: 14, textAlign: "left",
                  }}>
                    <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 8, letterSpacing: 0.6 }}>
                      🟦 WHILE YOU WAIT — WHY THE MARKER MATTERS
                    </div>
                    <p style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.7, margin: 0 }}>
                      Every AgentYap cast carries a 🟦 marker so anyone reading it instantly
                      knows: AI drafted it, a human reviewed it, and nothing posts without
                      your approval. No black-box bots posting as you — just transparent,
                      attributed help. That&apos;s the whole idea behind HIP: AI assists,
                      you stay in control, the blockchain keeps it honest.
                    </p>
                  </div>

                  {pollSeconds >= 20 && (
                    <button
                      onClick={retryConnect}
                      style={{
                        background: "#1f2937", color: "#fff", padding: "10px 14px",
                        borderRadius: 10, border: "1px solid #374151", cursor: "pointer", marginTop: 12,
                      }}
                    >
                      Still stuck? Try again
                    </button>
                  )}
                </>
              )}

              {signerStatus === "timeout" && (
                <>
                  <p style={{ color: "#f59e0b", fontSize: 16, marginBottom: 16 }}>
                    Approval timed out. Restart the flow below.
                  </p>
                  <button
                    onClick={retryConnect}
                    style={{
                      background: "#6366f1", color: "#fff", padding: "14px 24px",
                      borderRadius: 10, fontWeight: "bold", border: "none", cursor: "pointer",
                    }}
                  >
                    Restart signer setup
                  </button>
                </>
              )}
            </div>
          )}

          {step === "hub-register" && hubSigner && (
            <div style={{
              padding: 24, background: "#0b1120",
              border: "1px solid #1f2937", borderRadius: 16,
            }}>
              <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
                🟦 Register your agent key onchain
              </div>
              <p style={{ color: "#a1a1aa", lineHeight: 1.7, marginBottom: 16 }}>
                Neynar credits are exhausted. AgentYap generated a direct signing key.
                You need to register it onchain via the Farcaster Key Registry on Optimism.
              </p>

              <div style={{
                background: "#020617", border: "1px solid #374151",
                borderRadius: 10, padding: 14, marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 6 }}>YOUR AGENT PUBLIC KEY</div>
                <div style={{ fontSize: 11, color: "#22c55e", wordBreak: "break-all", fontFamily: "monospace" }}>
                  {hubSigner.publicKey}
                </div>
              </div>

              <div style={{
                background: "#1a1000", border: "1px solid #78350f",
                borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: "#fbbf24",
                lineHeight: 1.7,
              }}>
                <strong>How to register:</strong><br />
                1. Open a wallet on Optimism (MetaMask, Rainbow, etc.)<br />
                2. Call <code>add()</code> on Key Registry: <code>0x00000000Fc1237824fb747aBDE0FF18990E59b7e</code><br />
                3. Use the calldata below, or paste it into a raw transaction<br />
                4. After the tx confirms, come back and tap Continue
              </div>

              <div style={{
                background: "#020617", border: "1px solid #374151",
                borderRadius: 10, padding: 12, marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 6 }}>CALLDATA</div>
                <div style={{
                  fontSize: 10, color: "#a1a1aa", wordBreak: "break-all",
                  fontFamily: "monospace", maxHeight: 80, overflow: "auto",
                }}>
                  {hubSigner.addKeyCalldata}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hubSigner.addKeyCalldata);
                    setToast("Calldata copied");
                  }}
                  style={{
                    background: "#1f2937", color: "#fff", padding: "10px 14px",
                    borderRadius: 10, border: "1px solid #374151", cursor: "pointer", flex: 1,
                  }}
                >
                  Copy calldata
                </button>
                <button
                  onClick={() => setStep("dashboard")}
                  style={{
                    background: "#22c55e", color: "#000", padding: "10px 14px",
                    borderRadius: 10, border: "none", fontWeight: "bold", cursor: "pointer", flex: 1,
                  }}
                >
                  Continue →
                </button>
              </div>

              <button
                onClick={retryConnect}
                style={{
                  background: "transparent", color: "#71717a", padding: "10px 0",
                  border: "none", cursor: "pointer", fontSize: 13, marginTop: 10, width: "100%",
                }}
              >
                Try Neynar again instead
              </button>
            </div>
          )}

          {step === "dashboard" && (
            <div>
              <section style={cardStyle}>
                <div style={{ fontSize: 22, fontWeight: "bold", marginBottom: 6 }}>
                  Your AgentYap workspace
                </div>

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: signerMode === "hub" ? "#1a1000" : "#052e16",
                  border: `1px solid ${signerMode === "hub" ? "#78350f" : "#14532d"}`,
                  color: signerMode === "hub" ? "#fbbf24" : "#22c55e",
                  fontSize: 11, padding: "4px 10px", borderRadius: 999, marginBottom: 14,
                }}>
                  {signerMode === "hub"
                    ? "🔑 Hub direct signing (onchain key)"
                    : signerMode === "neynar"
                    ? "✅ Neynar managed signer"
                    : "👁 Demo mode"}
                </div>

                <div style={{
                  background: "#020617", border: "1px solid #1f2937",
                  borderRadius: 12, padding: 14, marginBottom: 14,
                }}>
                  <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 8, letterSpacing: 0.6 }}>
                    HIP STATUS
                  </div>
                  <div style={{ color: "#e0e0ff", fontSize: 14, lineHeight: 1.7 }}>
                    Vibe: <strong>{selectedVibe?.label ?? "Not selected"}</strong><br />
                    Handle: <strong>@{username ?? handle}</strong><br />
                    Attribution: <strong>🟦 AgentYap [HIP-1.0]</strong>
                  </div>
                </div>

                <div style={labelStyle}>WHAT SHOULD AGENTYAP WRITE ABOUT?</div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What are you building, learning, or thinking about today?"
                  style={{ ...inputStyle, minHeight: 96, resize: "vertical", marginBottom: 14 }}
                />

                <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                  {PROMPT_IDEAS.map((idea) => (
                    <button
                      key={idea}
                      onClick={() => setBio(idea)}
                      style={{
                        textAlign: "left", background: "#020617", color: "#a1a1aa",
                        border: "1px solid #1f2937", borderRadius: 10, padding: 10, cursor: "pointer",
                      }}
                    >
                      {idea}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => void handlePreview()}
                    disabled={isPreviewLoading}
                    style={{
                      background: "#1f2937", color: "#fff", padding: "12px 16px",
                      borderRadius: 10, border: "1px solid #374151",
                      cursor: isPreviewLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {isPreviewLoading ? "Generating..." : "Generate preview"}
                  </button>

                  <button
                    onClick={() => void handlePost()}
                    disabled={isPosting || signerMode === "demo"}
                    title={signerMode === "demo" ? "Demo mode — publishing disabled" : undefined}
                    style={{
                      background: isPosting || signerMode === "demo" ? "#444" : "#22c55e",
                      color: "#000", padding: "12px 16px", borderRadius: 10,
                      border: "none", fontWeight: "bold",
                      cursor: isPosting || signerMode === "demo" ? "not-allowed" : "pointer",
                    }}
                  >
                    {isPosting ? "Posting..." : signerMode === "demo" ? "Demo — no credits" : "Post 🟦 to Farcaster"}
                  </button>
                </div>
              </section>

              {preview && (
                <section style={{
                  background: "#020617", padding: 16, marginTop: 12,
                  borderRadius: 12, whiteSpace: "pre-wrap",
                  border: "1px solid #22c55e", lineHeight: 1.7,
                }}>
                  <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 8, letterSpacing: 0.6 }}>
                    PREVIEW — HIP-1.0 ATTRIBUTED
                  </div>
                  {preview}
                </section>
              )}

              <section style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Recent Casts</div>

                {posts.length === 0 ? (
                  <div style={{
                    background: "#0b1120", border: "1px solid #1f2937", borderRadius: 12,
                    padding: 18, color: "#52525b", fontSize: 13, textAlign: "center",
                  }}>
                    No posts yet — generate and post your first 🟦 cast above.
                  </div>
                ) : (
                  posts.map((p, i) => (
                    <div key={p.id} style={{
                      background: "#0b1120", padding: 14, borderRadius: 12,
                      marginBottom: 10, border: "1px solid #1f2937",
                    }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", marginBottom: 8,
                      }}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: "50%", background: "#1f2937",
                          color: "#a1a1aa", fontSize: 11, fontWeight: "bold",
                        }}>
                          {posts.length - i}
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                p.text.replace(/^🟦 AgentYap \[HIP-[\d.]+\] \| \w+\n\n/, "").trim()
                              );
                              setToast("Copied (text only)");
                            }}
                            style={{
                              background: "transparent", color: "#71717a",
                              border: "1px solid #1f2937", borderRadius: 8,
                              padding: "4px 10px", fontSize: 12, cursor: "pointer",
                            }}
                          >
                            Copy
                          </button>

                          {p.text.startsWith("🟦") && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(p.text);
                                setToast("Copied with 🟦 HIP attribution");
                              }}
                              style={{
                                background: "transparent", color: "#71717a",
                                border: "1px solid #1f2937", borderRadius: 8,
                                padding: "4px 10px", fontSize: 12, cursor: "pointer",
                              }}
                            >
                              Copy + 🟦
                            </button>
                          )}

                          {p.hash && (
                            <a
                              href={`https://warpcast.com/~/conversations/${p.hash}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: "transparent", color: "#6366f1",
                                border: "1px solid #1f2937", borderRadius: 8,
                                padding: "4px 10px", fontSize: 12, textDecoration: "none",
                              }}
                            >
                              View
                            </a>
                          )}

                          <button
                            onClick={() => setPosts((c) => c.filter((x) => x.id !== p.id))}
                            style={{
                              background: "transparent", color: "#71717a",
                              border: "1px solid #1f2937", borderRadius: 8,
                              padding: "4px 10px", fontSize: 12, cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{p.text}</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>
                        Posted {p.time}
                        {p.hash && <span style={{ marginLeft: 8, color: "#374151" }}>#{p.hash.slice(0, 10)}</span>}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}

          <footer style={{
            marginTop: 32, padding: "20px 0", color: "#52525b",
            fontSize: 12, textAlign: "center", lineHeight: 1.6,
          }}>
            🟦 AgentYap HIP-1.0 • Built by afifarioss on Base
            <br />
            AI assists. You approve. Blockchain attributes.
          </footer>
        </div>
      </div>
    </>
  );
}
