'use client';

import { useState, useEffect, useRef } from "react";
import { SignInButton, useProfile } from "@farcaster/auth-kit";

const VIBES = [
  {
    id: "builder",
    label: "🔨 Builder",
    desc: "Shipping updates, product lessons, and Base experiments",
  },
  {
    id: "degen",
    label: "💎 Degen",
    desc: "Crypto thoughts, Base energy, and token culture",
  },
  {
    id: "creator",
    label: "🎨 Creator",
    desc: "Audience growth, content ideas, and community posts",
  },
  {
    id: "family",
    label: "👨‍👩‍👧 Family Man",
    desc: "Real life, parenting, and building for family",
  },
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
  "I’m learning how Farcaster signers work.",
  "I’m building AgentYap in public as a dad of 3.",
];

const MAX_POLL_ATTEMPTS = 60;
const POLL_INTERVAL_MS = 5000;
const BACKOFF_AFTER_ATTEMPTS = 6;
const BACKOFF_INTERVAL_MS = 10000;

type Step = "setup" | "signer" | "dashboard";
type SignerStatus = "idle" | "pending" | "approved" | "timeout";

function track(event: string, data?: Record<string, any>) {
  console.log("[AgentYap event]", event, data || {});
}

export default function AgentYap() {
  const { isAuthenticated, profile } = useProfile();

  const [step, setStep] = useState<Step>("setup");
  const [handle, setHandle] = useState("afifarioss");
  const [vibe, setVibe] = useState<string | null>(null);
  const [bio, setBio] = useState(
    "Dad from Ipoh building AgentYap on Base for family."
  );

  const [signerUuid, setSignerUuid] = useState("");
  const [signerApprovalUrl, setSignerApprovalUrl] = useState("");

  const [posts, setPosts] = useState<{ text: string; time: string }[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [preview, setPreview] = useState("");

  const [samplePost, setSamplePost] = useState("");
  const [isSampleLoading, setIsSampleLoading] = useState(false);
  const sampleCacheRef = useRef<Record<string, string>>({});
  const latestVibeRef = useRef<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [signerStatus, setSignerStatus] = useState<SignerStatus>("idle");
  const [pollSeconds, setPollSeconds] = useState(0);

  const pollAttemptsRef = useRef(0);
  const autoConnectFiredRef = useRef(false);
  const landingTrackedRef = useRef(false);

  const selectedVibe = VIBES.find((v) => v.id === vibe);

  const signerMessage =
    SIGNER_WAIT_MESSAGES[
      Math.min(
        Math.floor(pollSeconds / 10),
        SIGNER_WAIT_MESSAGES.length - 1
      )
    ];

  useEffect(() => {
    if (!landingTrackedRef.current) {
      landingTrackedRef.current = true;
      track("landing_view");
    }
  }, []);

  useEffect(() => {
    latestVibeRef.current = vibe;
  }, [vibe]);

  useEffect(() => {
    if (!error) return;

    const timeout = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (
      isAuthenticated &&
      profile?.fid &&
      !autoConnectFiredRef.current &&
      step === "setup"
    ) {
      autoConnectFiredRef.current = true;
      track("signin_completed", {
        fid: profile.fid,
        username: profile.username,
      });
      connectFarcaster();
    }
  }, [isAuthenticated, profile?.fid, step]);

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
          track("signer_timeout", {
            signerUuid,
            pollSeconds: elapsedMsRef.current / 1000,
          });
          return;
        }

        try {
          const res = await fetch(
            `/api/check-signer?signerUuid=${signerUuid}`
          );
          const data = await res.json();

          track("signer_poll", {
            approved: data.approved,
            status: data.status,
            attempt: pollAttemptsRef.current,
          });

          if (data.approved === true) {
            setSignerStatus("approved");
            setStep("dashboard");
            track("signer_approved", {
              signerUuid,
              status: data.status,
            });
            return;
          }
        } catch (e) {
          console.error("Polling error:", e);
          track("signer_poll_error", {
            attempt: pollAttemptsRef.current,
          });
        }

        if (cancelled) return;

        const nextDelay =
          pollAttemptsRef.current < BACKOFF_AFTER_ATTEMPTS
            ? POLL_INTERVAL_MS
            : BACKOFF_INTERVAL_MS;

        timeoutId = setTimeout(poll, nextDelay);
      };

      timeoutId = setTimeout(poll, 1500);
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [step, signerStatus, signerUuid]);

  useEffect(() => {
    if (step === "dashboard") {
      track("dashboard_view", {
        vibe,
        username: profile?.username || handle,
      });
    }
  }, [step]);

  async function connectFarcaster() {
    if (!isAuthenticated || !profile?.fid) {
      setError(
        "Sign in with Farcaster first — we need your FID to create a signer."
      );
      return;
    }

    setError(null);
    track("signer_create_started", {
      fid: profile.fid,
      username: profile.username || handle,
    });

    try {
      const res = await fetch("/api/create-signer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fid: profile.fid,
          username: profile.username || handle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not create signer");
      }

      setSignerUuid(data.signer_uuid);
      setSignerApprovalUrl(data.approval_url);
      setSignerStatus("pending");
      setStep("signer");

      track("signer_created", {
        signerUuid: data.signer_uuid,
        hasApprovalUrl: Boolean(data.approval_url),
      });
    } catch (e: any) {
      setError(e.message || "Something went wrong creating your signer.");
      autoConnectFiredRef.current = false;

      track("signer_create_error", {
        message: e.message,
      });
    }
  }

  function retryConnect() {
    track("signer_retry_clicked");

    setSignerStatus("idle");
    setSignerApprovalUrl("");
    setSignerUuid("");
    setPollSeconds(0);
    autoConnectFiredRef.current = false;
    setStep("setup");

    setTimeout(() => {
      connectFarcaster();
    }, 0);
  }

  async function handleVibeSelect(vibeId: string) {
    setVibe(vibeId);
    latestVibeRef.current = vibeId;

    track("vibe_selected", {
      vibe: vibeId,
    });

    if (sampleCacheRef.current[vibeId]) {
      setSamplePost(sampleCacheRef.current[vibeId]);
      return;
    }

    setIsSampleLoading(true);
    setSamplePost("");

    try {
      const res = await fetch("/api/sample-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vibe: vibeId,
          handle,
          bio,
        }),
      });

      const data = await res.json();

      if (latestVibeRef.current !== vibeId) return;

      if (!res.ok || data.error) {
        throw new Error(data.error || "Sample generation failed");
      }

      sampleCacheRef.current[vibeId] = data.text;
      setSamplePost(data.text);

      track("sample_generated", {
        vibe: vibeId,
      });
    } catch (e: any) {
      if (latestVibeRef.current === vibeId) {
        setSamplePost(
          "⚠️ Could not load a sample right now — try tapping again."
        );
      }

      track("sample_error", {
        vibe: vibeId,
        message: e.message,
      });
    } finally {
      if (latestVibeRef.current === vibeId) {
        setIsSampleLoading(false);
      }
    }
  }

  async function handlePreview() {
    if (!vibe) {
      setError("Pick a vibe first.");
      return;
    }

    setError(null);
    setIsPreviewLoading(true);

    track("preview_started", {
      vibe,
    });

    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vibe,
          handle: profile?.username || handle,
          bio,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Generation failed");
      }

      setPreview(data.text);

      track("preview_generated", {
        vibe,
      });
    } catch (e: any) {
      setError(e.message || "Could not generate preview.");

      track("preview_error", {
        vibe,
        message: e.message,
      });
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handlePost() {
    if (!signerUuid) {
      setError("Signer not ready — reconnect Farcaster.");
      return;
    }

    if (!vibe) {
      setError("Pick a vibe first.");
      return;
    }

    setError(null);
    setIsPosting(true);

    track("post_started", {
      vibe,
    });

    try {
      let text = preview;

      if (!text) {
        const genRes = await fetch("/api/generate-post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vibe,
            handle: profile?.username || handle,
            bio,
          }),
        });

        const genData = await genRes.json();

        if (!genRes.ok || genData.error) {
          throw new Error(genData.error || "Could not generate cast.");
        }

        text = genData.text;
      }

      const postRes = await fetch("/api/post-cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signerUuid,
          text,
        }),
      });

      const postData = await postRes.json();

      if (!postRes.ok || postData.error) {
        throw new Error(postData.error || "Post failed");
      }

      setPosts((currentPosts) => [
        {
          text,
          time: new Date().toLocaleTimeString(),
        },
        ...currentPosts,
      ]);

      setPreview("");

      track("cast_posted", {
        vibe,
        hash: postData.hash,
      });
    } catch (e: any) {
      setError(e.message || "Could not post that cast.");

      track("post_error", {
        vibe,
        message: e.message,
      });
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #111827 0%, #050510 45%, #020617 100%)",
        color: "#e0e0ff",
        padding: 20,
        fontFamily: "monospace",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <style jsx global>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulseGlow {
            0% {
              box-shadow: 0 0 0 rgba(34, 197, 94, 0);
            }
            50% {
              box-shadow: 0 0 24px rgba(34, 197, 94, 0.18);
            }
            100% {
              box-shadow: 0 0 0 rgba(34, 197, 94, 0);
            }
          }
        `}</style>

        <header style={{ marginBottom: 24, paddingTop: 12 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#111827",
              border: "1px solid #1f2937",
              color: "#22c55e",
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 999,
              marginBottom: 14,
            }}
          >
            GROK + NEYNAR • BUILT ON FARCASTER
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: "bold",
              lineHeight: 1.1,
            }}
          >
            AgentYap
          </div>

          <div
            style={{
              fontSize: 18,
              color: "#c4b5fd",
              marginTop: 8,
              lineHeight: 1.4,
            }}
          >
            AI casts for Farcaster builders, creators, and Base natives.
          </div>

          <p
            style={{
              color: "#a1a1aa",
              lineHeight: 1.7,
              marginTop: 14,
            }}
          >
            Turn rough ideas into ready-to-post Farcaster casts in seconds.
            Choose your vibe, preview the cast, edit it, and post when you are
            ready.
          </p>

          <p
            style={{
              color: "#71717a",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Built by <strong style={{ color: "#e0e0ff" }}>afifarioss</strong> —
            an Ipoh dad building AgentYap in public on Base.
          </p>
        </header>

        {error && (
          <div
            style={{
              background: "#1a0e10",
              border: "1px solid #ef4444",
              color: "#fca5a5",
              padding: "12px 16px",
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {step === "setup" && (
          <>
            <section
              style={{
                background: "#0b1120",
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#818cf8",
                  marginBottom: 8,
                  letterSpacing: 0.8,
                }}
              >
                WHY AGENTYAP EXISTS
              </div>

              <p
                style={{
                  color: "#d4d4d8",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                Posting every day is hard. Sometimes your idea is messy.
                Sometimes you are tired after work, family, building, and life.
                AgentYap helps turn simple thoughts into clean Farcaster casts —
                without losing your voice.
              </p>
            </section>

            <section
              style={{
                background: "#0b1120",
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#818cf8",
                  marginBottom: 10,
                  letterSpacing: 0.8,
                }}
              >
                WHAT YOU GET
              </div>

              <ul
                style={{
                  color: "#a1a1aa",
                  lineHeight: 1.8,
                  paddingLeft: 20,
                  margin: 0,
                }}
              >
                <li>AI-written Farcaster casts in your chosen style</li>
                <li>Cast ideas for builders, creators, degens, and parents</li>
                <li>Preview and edit before posting</li>
                <li>Your own approved signer through Neynar</li>
                <li>AgentYap never holds your wallet keys</li>
                <li>You stay in control of every cast</li>
              </ul>
            </section>

            <section
              style={{
                background: "#0b1120",
                padding: 18,
                borderRadius: 16,
                marginBottom: 14,
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#818cf8",
                  marginBottom: 6,
                  letterSpacing: 0.8,
                }}
              >
                FARCASTER HANDLE
              </div>

              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace("@", ""))}
                placeholder="afifarioss"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#020617",
                  color: "#fff",
                  padding: 13,
                  borderRadius: 10,
                  border: "1px solid #1f2937",
                  outline: "none",
                }}
              />
            </section>

            <section
              style={{
                background: "#0b1120",
                padding: 18,
                borderRadius: 16,
                marginBottom: 14,
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#818cf8",
                  marginBottom: 8,
                  letterSpacing: 0.8,
                }}
              >
                CHOOSE YOUR VIBE
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#71717a",
                  marginBottom: 12,
                }}
              >
                Tap one to see a sample before signing in.
              </div>

              {VIBES.map((v) => (
                <div
                  key={v.id}
                  onClick={() => handleVibeSelect(v.id)}
                  style={{
                    padding: 14,
                    background: vibe === v.id ? "#12231a" : "#020617",
                    marginBottom: 10,
                    borderRadius: 12,
                    cursor: "pointer",
                    border:
                      vibe === v.id
                        ? "1px solid #22c55e"
                        : "1px solid #1f2937",
                  }}
                >
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    {v.label}
                  </div>

                  <div
                    style={{
                      color: "#a1a1aa",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    {v.desc}
                  </div>
                </div>
              ))}

              {vibe && (isSampleLoading || samplePost) && (
                <div
                  style={{
                    marginTop: 14,
                    background: "#020617",
                    borderLeft: "3px solid #22c55e",
                    padding: 14,
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#22c55e",
                      marginBottom: 8,
                      letterSpacing: 0.6,
                    }}
                  >
                    SAMPLE CAST
                  </div>

                  {isSampleLoading ? (
                    <div
                      style={{
                        color: "#71717a",
                        fontSize: 14,
                      }}
                    >
                      Writing a sample...
                    </div>
                  ) : (
                    <div
                      style={{
                        color: "#e0e0ff",
                        fontSize: 14,
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {samplePost}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section
              style={{
                background: "#0b1120",
                padding: 18,
                borderRadius: 16,
                marginBottom: 18,
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#818cf8",
                  marginBottom: 6,
                  letterSpacing: 0.8,
                }}
              >
                BIO OR ROUGH IDEA
              </div>

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Example: I’m building an AI tool for Farcaster creators."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#020617",
                  color: "#fff",
                  padding: 13,
                  borderRadius: 10,
                  border: "1px solid #1f2937",
                  minHeight: 96,
                  outline: "none",
                  resize: "vertical",
                }}
              />

              <div
                style={{
                  fontSize: 12,
                  color: "#71717a",
                  marginTop: 8,
                }}
              >
                Drop a rough idea. AgentYap will clean it up into a
                Farcaster-ready cast.
              </div>
            </section>

            <section
              style={{
                background: "#0b1120",
                padding: 18,
                borderRadius: 16,
                marginBottom: 18,
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#818cf8",
                  marginBottom: 8,
                  letterSpacing: 0.8,
                }}
              >
                YOUR ACCOUNT STAYS YOURS
              </div>

              <p
                style={{
                  color: "#a1a1aa",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                AgentYap uses a Farcaster signer through Neynar. You approve
                access, you can revoke it anytime, and AgentYap never holds your
                wallet keys. You preview and edit before posting.
              </p>
            </section>

            {!isAuthenticated ? (
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 30,
                }}
              >
                <div
                  onClick={() =>
                    track("signin_clicked", {
                      vibe,
                    })
                  }
                  style={{ marginBottom: 12 }}
                >
                  <SignInButton />
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#71717a",
                    lineHeight: 1.6,
                  }}
                >
                  Sign in with Farcaster to generate and post your first cast.
                  <br />
                  Signing in automatically sets up your signer.
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#22c55e",
                  padding: 14,
                  background: "#052e16",
                  border: "1px solid #14532d",
                  borderRadius: 12,
                }}
              >
                <div style={{ marginBottom: 10 }}>Setting up your signer...</div>

                <button
                  onClick={connectFarcaster}
                  style={{
                    background: "#22c55e",
                    color: "#000",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Continue setup
                </button>
              </div>
            )}
          </>
        )}

        {step === "signer" && (
          <div
            style={{
              textAlign: "center",
              padding: 28,
              background: "#0b1120",
              border: "1px solid #1f2937",
              borderRadius: 16,
              animation: "pulseGlow 2.4s ease-in-out infinite",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                border: "3px solid #1f2937",
                borderTop: "3px solid #22c55e",
                borderRadius: "50%",
                margin: "0 auto 18px",
                animation: "spin 1s linear infinite",
              }}
            />

            <div
              style={{
                fontSize: 22,
                marginBottom: 10,
                fontWeight: "bold",
              }}
            >
              Approve your AgentYap signer
            </div>

            <p
              style={{
                color: "#a1a1aa",
                fontSize: 14,
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              This signer lets AgentYap publish casts you generate and confirm.
              Your wallet keys stay yours.
            </p>

            {signerStatus === "pending" && (
              <div>
                <a
                  href={signerApprovalUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    track("signer_approval_clicked", {
                      signerUuid,
                    })
                  }
                  style={{
                    display: "block",
                    background: "#6366f1",
                    color: "#fff",
                    padding: 16,
                    borderRadius: 12,
                    margin: "18px 0",
                    textDecoration: "none",
                    fontWeight: "bold",
                  }}
                >
                  Open Farcaster approval →
                </a>

                <div
                  style={{
                    background: "#020617",
                    border: "1px solid #1f2937",
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 14,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      color: "#22c55e",
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {signerMessage}
                  </p>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#71717a",
                      marginTop: 6,
                    }}
                  >
                    Checking approval status... {pollSeconds}s
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: "#71717a",
                    marginTop: 14,
                    lineHeight: 1.6,
                  }}
                >
                  After approving in Farcaster, return to this tab. AgentYap
                  will move forward automatically.
                </p>

                {pollSeconds >= 20 && (
                  <button
                    onClick={retryConnect}
                    style={{
                      background: "#1f2937",
                      color: "#fff",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #374151",
                      cursor: "pointer",
                      marginTop: 8,
                    }}
                  >
                    Still stuck? Try again
                  </button>
                )}
              </div>
            )}

            {signerStatus === "timeout" && (
              <div>
                <p
                  style={{
                    color: "#f59e0b",
                    fontSize: 16,
                    marginBottom: 16,
                  }}
                >
                  Signer approval took too long. No worries — you can restart
                  the approval flow.
                </p>

                <button
                  onClick={retryConnect}
                  style={{
                    background: "#6366f1",
                    color: "#fff",
                    padding: "14px 24px",
                    borderRadius: 10,
                    fontWeight: "bold",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Restart signer setup
                </button>
              </div>
            )}
          </div>
        )}

        {step === "dashboard" && (
          <div>
            <section
              style={{
                background: "#0b1120",
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                border: "1px solid #1f2937",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  marginBottom: 6,
                }}
              >
                Your AgentYap workspace
              </div>

              <p
                style={{
                  color: "#a1a1aa",
                  lineHeight: 1.7,
                  marginTop: 0,
                }}
              >
                Pick your vibe, update your rough idea, generate a cast, then
                post when it sounds like you.
              </p>

              <div
                style={{
                  background: "#020617",
                  border: "1px solid #1f2937",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#22c55e",
                    marginBottom: 8,
                    letterSpacing: 0.6,
                  }}
                >
                  CURRENT SETUP
                </div>

                <div
                  style={{
                    color: "#e0e0ff",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  Vibe:{" "}
                  <strong>{selectedVibe?.label || "Not selected"}</strong>
                  <br />
                  Handle: <strong>@{profile?.username || handle}</strong>
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#818cf8",
                  marginBottom: 6,
                  letterSpacing: 0.8,
                }}
              >
                WHAT SHOULD AGENTYAP WRITE ABOUT?
              </div>

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you building, learning, or thinking about today?"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#020617",
                  color: "#fff",
                  padding: 13,
                  borderRadius: 10,
                  border: "1px solid #1f2937",
                  minHeight: 96,
                  outline: "none",
                  resize: "vertical",
                  marginBottom: 14,
                }}
              />

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {PROMPT_IDEAS.map((idea) => (
                  <button
                    key={idea}
                    onClick={() => setBio(idea)}
                    style={{
                      textAlign: "left",
                      background: "#020617",
                      color: "#a1a1aa",
                      border: "1px solid #1f2937",
                      borderRadius: 10,
                      padding: 10,
                      cursor: "pointer",
                    }}
                  >
                    {idea}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={handlePreview}
                  disabled={isPreviewLoading}
                  style={{
                    background: "#1f2937",
                    color: "#fff",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid #374151",
                    cursor: isPreviewLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {isPreviewLoading ? "Generating..." : "Generate preview"}
                </button>

                <button
                  onClick={handlePost}
                  disabled={isPosting}
                  style={{
                    background: isPosting ? "#444" : "#22c55e",
                    color: "#000",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "none",
                    fontWeight: "bold",
                    cursor: isPosting ? "not-allowed" : "pointer",
                  }}
                >
                  {isPosting ? "Posting..." : "Post to Farcaster"}
                </button>
              </div>
            </section>

            {preview && (
              <section
                style={{
                  background: "#020617",
                  padding: 16,
                  marginTop: 12,
                  borderRadius: 12,
                  whiteSpace: "pre-wrap",
                  border: "1px solid #1f2937",
                  lineHeight: 1.7,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#22c55e",
                    marginBottom: 8,
                    letterSpacing: 0.6,
                  }}
                >
                  PREVIEW
                </div>

                {preview}
              </section>
            )}

            {posts.length > 0 && (
              <section style={{ marginTop: 24 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: "#888",
                    marginBottom: 8,
                  }}
                >
                  Recent Casts
                </div>

                {posts.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#0b1120",
                      padding: 14,
                      borderRadius: 12,
                      marginBottom: 10,
                      border: "1px solid #1f2937",
                    }}
                  >
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.7,
                      }}
                    >
                      {p.text}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: "#666",
                        marginTop: 6,
                      }}
                    >
                      {p.time}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        <footer
          style={{
            marginTop: 32,
            padding: "20px 0",
            color: "#52525b",
            fontSize: 12,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Built by afifarioss • Dad with 3 kids building in public on Base
          <br />
          Powered by Grok + Neynar
        </footer>
      </div>
    </div>
  );
}