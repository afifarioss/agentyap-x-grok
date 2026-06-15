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
  const [bio, setBio] = useState("Dad from Ipoh building on Base for Danish, Darissa & Damia 💰");
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
        body: JSON.stringify({
          fid: profile?.fid || 3336130,
          username: profile?.username || handle
        }),
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
    if (!vibe) return alert("Please select a vibe first");
    const res = await fetch("/api/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vibe, handle: profile?.username || handle, bio }),
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
          body: JSON.stringify({ vibe, handle: profile?.username || handle, bio }),
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
      alert("Posted successfully! Family First 💰");
    } catch (e: any) {
      alert(e.message);
    }
    setIsPosting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950 text-white font-mono pb-20">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pt-4">
          <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg">🧠</div>
          <div>
            <h1 className="text-4xl font-bold tracking-tighter text-green-400">AGENTYAP</h1>
            <p className="text-xs text-green-500/70">v1.0 • GROK + NEYNAR • BASE</p>
            <p className="text-xs text-emerald-400">Ipoh Dad Mode 👨‍👩‍👧</p>
          </div>
        </div>

        {step === "setup" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 border border-green-500/30 rounded-3xl p-6">
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">FARCASTER HANDLE</label>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value.replace("@", ""))}
                className="w-full bg-black border border-green-500/50 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:border-green-400"
              />
            </div>

            <div className="bg-zinc-900/80 border border-green-500/30 rounded-3xl p-6">
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-4 block">SELECT VIBE</label>
              <div className="space-y-3">
                {VIBES.map(v => (
                  <div
                    key={v.id}
                    onClick={() => setVibe(v.id)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                      vibe === v.id 
                        ? 'border-green-400 bg-green-900/30' 
                        : 'border-green-500/30 hover:border-green-500/50 bg-zinc-950'
                    }`}
                  >
                    <div className="font-medium">{v.label}</div>
                    <div className="text-sm text-gray-400">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-green-500/30 rounded-3xl p-6">
              <label className="text-xs uppercase tracking-widest text-gray-400 mb-2 block">BIO (optional)</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Dad from Ipoh building on Base..."
                className="w-full bg-black border border-green-500/50 rounded-2xl px-5 py-4 h-28 resize-y focus:outline-none focus:border-green-400"
              />
            </div>

            <div className="pt-4">
              {!isAuthenticated ? (
                <SignInButton />
              ) : (
                <>
                  <div className="text-emerald-400 text-center mb-4 text-sm">
                    ✅ Signed in as @{profile?.username} (FID: {profile?.fid})
                  </div>
                  <button
                    onClick={connectFarcaster}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-3xl font-bold text-lg active:scale-95 transition"
                  >
                    🔗 Connect & Continue →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === "signer" && (
          <div className="text-center py-12">
            <div className="text-2xl mb-3">One more step!</div>
            <p className="text-gray-400 mb-8">Approve AgentYap to post on your behalf</p>
            
            <a
              href={signerApprovalUrl}
              target="_blank"
              className="block bg-indigo-600 hover:bg-indigo-500 py-5 rounded-3xl font-bold mb-4 text-lg"
            >
              APPROVE IN WARPCAST →
            </a>
            
            <button
              onClick={() => setStep("dashboard")}
              className="w-full bg-emerald-600 py-4 rounded-3xl font-bold"
            >
              ✅ I Approved — Go to Dashboard
            </button>
          </div>
        )}

        {step === "dashboard" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 border border-green-500/30 rounded-3xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-xl">@{profile?.username || handle}</div>
                  <div className="text-xs text-gray-400">FID: {profile?.fid}</div>
                </div>
                <div className="text-emerald-400 text-sm">● Connected</div>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-green-500/30 rounded-3xl p-6">
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">ACTIVE VIBE</div>
              <div className="grid grid-cols-2 gap-3">
                {VIBES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVibe(v.id)}
                    className={`p-4 rounded-2xl border text-left text-sm transition-all ${
                      vibe === v.id ? 'border-green-400 bg-green-900/30' : 'border-green-500/30'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePost}
                disabled={isPosting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 py-5 rounded-3xl font-bold text-lg active:scale-95 transition"
              >
                {isPosting ? "Posting..." : "📤 POST NOW"}
              </button>
              <button
                onClick={handlePreview}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-5 rounded-3xl font-bold text-lg active:scale-95 transition"
              >
                👁 Preview
              </button>
            </div>

            {preview && (
              <div className="bg-zinc-900/80 border border-green-500/30 rounded-3xl p-6 text-sm leading-relaxed">
                <div className="text-green-400 text-xs mb-3">PREVIEW POST</div>
                {preview}
              </div>
            )}

            <div className="bg-zinc-900/80 border border-green-500/30 rounded-3xl p-6">
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">RECENT POSTS</div>
              {posts.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No posts yet — tap POST NOW!</div>
              ) : (
                posts.map((p, i) => (
                  <div key={i} className="py-4 border-b border-zinc-800 last:border-none">
                    <div>{p.text}</div>
                    <div className="text-xs text-gray-500 mt-2">{p.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}