# AgentYap 🟦

> **The identity layer for Farcaster builders.**
> Generate vibe-native casts with AI. Review before you post. Publish with onchain attribution.

[![Built on Base](https://img.shields.io/badge/Built%20on-Base-0052FF?style=flat-square)](https://base.org)
[![MIT License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
[![Commits](https://img.shields.io/badge/Commits-199%2B-brightgreen?style=flat-square)](https://github.com/afifarioss/agentyap-x-grok/commits/main)
[![Live App](https://img.shields.io/badge/Live%20App-Vercel-000000?style=flat-square&logo=vercel)](https://agentyap-x-grok.vercel.app)
[![Farcaster](https://img.shields.io/badge/Farcaster-%40afifarioss-8A63D2?style=flat-square)](https://farcaster.xyz/afifarioss)
[![$AGYP Token](https://img.shields.io/badge/Token-%24AGYP%20on%20Base-0052FF?style=flat-square)](https://basescan.org/address/0xe9229265edaf8d7c1956a17e9a4acba2c8dbc879)

---

## 🟦 What is AgentYap?

**AgentYap** is a **Hybrid Identity Protocol (HIP)** — an open-source AI agent that helps Farcaster users generate contextually-aware, vibe-native casts with human approval before every publish.

Unlike black-box bots that post autonomously, AgentYap keeps **you in control**:

1. 🤖 **AI generates** a cast based on your chosen vibe
2. 👀 **You review** it before it goes anywhere
3. ✅ **You approve** and publish with a transparent 🟦 attribution marker
4. 🔗 **Onchain attribution** proves the cast came from an AI-assisted, human-approved workflow

**AgentYap is not a bot. It's an identity layer.**

---

## ✨ Features

| Feature | Status |
|---------|--------|
| 4 vibe personas (Builder, Degen, Creator, Family Man) | ✅ Live |
| AI cast generation via OpenRouter (Llama 4 Maverick) | ✅ Live |
| Human-in-the-loop approval before every post | ✅ Live |
| Farcaster Sign-In (FID-based auth via @farcaster/auth-kit) | ✅ Live |
| Neynar v2 managed signer + cast publishing | ✅ Live |
| 🟦 onchain attribution marker | ✅ Live |
| Mobile-first UI (built & tested entirely on phone) | ✅ Live |
| $AGYP token on Base | ✅ Live |
| Demo mode fallback (preview casts without Neynar credits) | ✅ Live |

---

## 🚀 Live Demo

👉 **[agentyap-x-grok.vercel.app](https://agentyap-x-grok.vercel.app)**

**Full flow:**
1. Sign in with Farcaster (FID-based, no wallet needed)
2. Pick your vibe: Builder / Degen / Creator / Family Man
3. AI generates a cast preview in <2 seconds
4. Review and edit the cast
5. Confirm → cast publishes to Farcaster with 🟦 marker

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 15.x |
| UI | React + TypeScript | 19.x |
| Styling | Tailwind CSS | v4 (mobile-first) |
| Auth | @farcaster/auth-kit | latest |
| Farcaster API | Neynar SDK | v2 |
| AI | OpenRouter → Llama 4 Maverick | free tier |
| Chain | viem | Base L2 |
| Deploy | Vercel | Edge + Serverless |
| Token | $AGYP | Base mainnet |

> **Note on version:** The project uses Next.js 15 (App Router). If you see "Next.js 16" anywhere in older docs, that was a documentation error — the actual `package.json` targets Next.js 15.

---

## ⚡ Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/afifarioss/agentyap-x-grok.git
cd agentyap-x-grok
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
# ─── Neynar (Farcaster API) ───────────────────────────────
NEYNAR_API_KEY=your_neynar_api_key
NEYNAR_CLIENT_ID=your_neynar_client_id
NEXT_PUBLIC_FARCASTER_CLIENT_ID=your_neynar_client_id

# ─── OpenRouter (AI generation — free tier works) ─────────
OPENROUTER_API_KEY=sk-or-v1-...

# ─── Privy (embedded wallet — optional) ───────────────────
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# ─── Farcaster developer account ──────────────────────────
# IMPORTANT: Use a DEDICATED Farcaster account for this app.
# NEVER use your personal Farcaster recovery phrase here.
FARCASTER_DEVELOPER_MNEMONIC=word1 word2 word3 ... word12

# ─── Misc ──────────────────────────────────────────────────
CRON_SECRET=any_random_string
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Getting API Keys

| Service | Link | Free Tier |
|---------|------|-----------|
| Neynar | [neynar.com](https://neynar.com) | Yes — limited credits |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | Yes — Llama 4 Maverick is free |
| Privy | [privy.io](https://privy.io) | Yes — up to 1000 MAU |

> **AI cost = $0.** OpenRouter's free tier covers Llama 4 Maverick fully. No credit card needed to run the core AI generation feature.

---

## 🔄 Neynar Signer Flow — Full Technical Detail

AgentYap uses Neynar's **managed signer** architecture. Here is the exact sequence a developer needs to understand to fork or extend this project:

```
1. USER SIGNS IN
   └─ @farcaster/auth-kit handles SIWF (Sign In With Farcaster)
   └─ Returns: { fid, username, pfpUrl, custody address }

2. SIGNER CREATION  →  POST /api/create-signer
   └─ Calls Neynar POST /v2/farcaster/signer
   └─ Returns: { signer_uuid, signer_approval_url, public_key }
   └─ Demo mode: if Neynar 402 error → returns { demo: true }

3. SIGNER APPROVAL
   └─ Frontend redirects user to signer_approval_url (Warpcast deeplink)
   └─ User taps "Approve" in Warpcast mobile
   └─ Signer status transitions: pending_approval → approved

4. SIGNER STATUS POLL  →  GET /api/check-signer?signer_uuid=xxx
   └─ Calls Neynar GET /v2/farcaster/signer/:signer_uuid
   └─ Frontend polls every 2s until status === "approved"
   └─ Timeout after 5 minutes

5. CAST GENERATION  →  POST /api/generate-cast
   └─ Sends { vibe, userContext } to OpenRouter
   └─ Model: meta-llama/llama-4-maverick (free tier)
   └─ Returns: { castText } in <2 seconds

6. CAST PUBLISHING  →  POST /api/post-cast
   └─ Payload: { signerUuid, castText }
   └─ Calls Neynar POST /v2/farcaster/cast
   └─ Appends 🟦 attribution marker to cast text
   └─ Returns: { cast_hash, cast_url }
```

### Key files for this flow

```
app/
├── api/
│   ├── create-signer/route.ts     ← Step 2: signer creation + demo fallback
│   ├── check-signer/route.ts      ← Step 4: signer status polling
│   ├── generate-cast/route.ts     ← Step 5: OpenRouter AI call
│   └── post-cast/route.ts         ← Step 6: Neynar cast publish
├── page.tsx                       ← Main UI, handles all state transitions
└── components/
    └── VibePicker.tsx             ← Vibe selection UI
lib/
├── neynar.ts                      ← Neynar SDK wrapper
├── openrouter.ts                  ← OpenRouter API wrapper
└── onchain.ts                     ← Basescan links for $AGYP
```

### Demo Mode Behavior

When Neynar API credits are exhausted, `/api/create-signer` returns:

```json
{ "demo": true, "message": "Neynar API credits required to publish casts." }
```

The frontend detects `demo: true` and:
- Shows a friendly banner explaining demo mode
- Still allows vibe selection and AI cast generation
- Disables the publish button with a clear message
- Does not crash or throw errors

---

## 🎭 Vibe System — How It Works

The vibe system is the core UX differentiator of AgentYap. Each vibe maps to a distinct system prompt that shapes the AI's output tone, vocabulary, and structure.

### Vibe → Prompt Architecture

```
User selects vibe
      ↓
VibePicker.tsx sets vibeId state
      ↓
POST /api/generate-cast  { vibe: "builder" | "degen" | "creator" | "family" }
      ↓
lib/openrouter.ts looks up vibePrompt[vibeId]
      ↓
OpenRouter sends system prompt + user context to Llama 4 Maverick
      ↓
Returns cast text shaped by that vibe's personality
```

### Vibe Personas

| Vibe ID | Persona | Tone | Target Audience |
|---------|---------|------|-----------------|
| `builder` | 🔨 Builder | Technical, shipping-focused, direct | Devs, hackers, founders |
| `degen` | 🎰 Degen | High-energy, alpha-seeking, CT slang | Traders, crypto-native crowd |
| `creator` | 🎨 Creator | Expressive, community-driven, narrative | Artists, writers, collectors |
| `family` | 👨‍👩‍👧 Family Man | Grounded, purpose-driven, human | Builders with families |

### Adding a New Vibe

To add a vibe persona (e.g. `"investor"`):

1. Add the vibe to the `VIBES` array in `lib/openrouter.ts`:
```typescript
{
  id: "investor",
  label: "Investor",
  emoji: "💼",
  systemPrompt: "You are a sharp crypto investor sharing high-signal takes on Base and DeFi. Keep it concise, data-driven, and alpha-forward..."
}
```

2. Add the UI card in `components/VibePicker.tsx`
3. That's it — the rest of the flow handles it automatically

---

## 📡 API Routes Reference

All routes are Next.js 15 App Router serverless functions under `app/api/`.

### `POST /api/create-signer`

Creates a Neynar managed signer for the authenticated user.

**Request body:**
```json
{ "fid": 3336130 }
```

**Success response:**
```json
{
  "signer_uuid": "abc123-...",
  "signer_approval_url": "https://warpcast.com/~/signer-approval?token=...",
  "public_key": "0x..."
}
```

**Demo mode response (Neynar 402):**
```json
{
  "demo": true,
  "message": "Neynar API credits required. You can still generate and preview casts."
}
```

---

### `GET /api/check-signer?signer_uuid=xxx`

Polls the approval status of a signer UUID.

**Response:**
```json
{
  "status": "pending_approval" | "approved" | "revoked"
}
```

---

### `POST /api/generate-cast`

Generates a vibe-native cast text via OpenRouter (Llama 4 Maverick).

**Request body:**
```json
{
  "vibe": "builder",
  "userContext": "Just shipped a new feature on Base"
}
```

**Response:**
```json
{
  "castText": "Shipped the vibe selector for AgentYap 🔨 Human-in-the-loop casting is live on Base. You generate. You approve. You publish. 🟦"
}
```

---

### `POST /api/post-cast`

Publishes a cast to Farcaster via the Neynar managed signer.

**Request body:**
```json
{
  "signerUuid": "abc123-...",
  "castText": "Your cast text here 🟦"
}
```

**Response:**
```json
{
  "cast_hash": "0x...",
  "cast_url": "https://warpcast.com/afifarioss/0x..."
}
```

---

## 🪙 $AGYP Token

| Field | Value |
|-------|-------|
| Token | $AGYP |
| Chain | Base mainnet |
| Contract | [`0xe9229265edaf8d7c1956a17e9a4acba2c8dbc879`](https://basescan.org/address/0xe9229265edaf8d7c1956a17e9a4acba2c8dbc879) |
| Platform | Virtuals Protocol |
| Agent ID | `019eb635-81f1-741c` |

$AGYP holders are early supporters of the Hybrid Identity Protocol. The token exists on Base mainnet with real trading history and existing holders via Virtuals Protocol.

---

## 📊 Project Metrics

| Metric | Value |
|--------|-------|
| GitHub commits | 199+ |
| Vibes active | 4 / 4 |
| API routes | 4 serverless functions |
| Cast generation time | <2s avg |
| AI cost | $0 (OpenRouter free tier) |
| Hosting cost | $0 (Vercel free tier) |
| Mobile compatibility | 100% (built on phone) |
| License | MIT |

---

## 🗺️ Roadmap

### Phase 1 — Foundation ✅ (Complete)
- [x] Farcaster Sign-In (SIWF)
- [x] 4 vibe personas with distinct system prompts
- [x] AI cast generation via OpenRouter (free, $0 cost)
- [x] Neynar v2 managed signer architecture
- [x] Human-in-the-loop approval flow
- [x] 🟦 onchain attribution marker
- [x] Mobile-first responsive UI
- [x] Demo mode fallback
- [x] $AGYP token on Base via Virtuals Protocol

### Phase 2 — Identity Layer 🔄 (In Progress)
- [ ] Talent Protocol integration — onchain credentials & skill attestations
- [ ] x402 paywall — premium vibe access via Base micropayments
- [ ] Base Pay / Base Account SDK integration
- [ ] White-label SDK for other Base builders
- [ ] ERC-8004 agent registration (agent wallet: `0x98BFED8Be20Db40f04bD87F63c62BdAA03Be82e7`)

### Phase 3 — Protocol 🔮 (Planned)
- [ ] AgentYap SDK — embeddable vibe-aware casting for any app
- [ ] Onchain signer registry on Base
- [ ] Multi-agent support
- [ ] Base Batches application (3-5 active users milestone)

---

## 🌍 Why This Matters

The Farcaster ecosystem is growing fast. But most AI tools for social posting are:
- **Opaque** — you don't know what they'll post or why
- **Impersonation risk** — no attribution signals
- **Web2 UX patterns** — no onchain identity layer

AgentYap solves this with one principle: **AI assists, humans approve, blockchain attributes.**

Every 🟦-marked cast is a public signal: *"This was AI-assisted, human-approved, and transparent about it."*

That's the Hybrid Identity Protocol — and it's open source for anyone to fork, extend, or build on.

---

## 👨‍💻 Built By

**Afif Azhar** — [@afifarioss](https://farcaster.xyz/afifarioss)

> *"I'm a solo builder from Ipoh, Malaysia 🇲🇾. Dad of 3 kids — Danish (7), Darissa (5), and baby Damia (7 months). I build AgentYap between parenting shifts. No laptop. No co-founder. No VC. Just a phone, a GitHub web editor, and shipped code. Building on Base for my family's future."*

| Platform | Handle |
|----------|--------|
| X / Twitter | [@afifarioss](https://x.com/afifarioss) |
| Farcaster | [@afifarioss](https://farcaster.xyz/afifarioss) |
| Base | `afifarioss.base.eth` |
| Links | [link.me/~afifarios](https://link.me/~afifarios) |

---

## 🤝 Contributing

AgentYap is MIT licensed and open for contributions. The easiest ways to contribute:

**Add a vibe persona** — edit `lib/openrouter.ts` and `components/VibePicker.tsx`

**Add an AI provider** — add a new wrapper in `lib/` following the same pattern as `openrouter.ts`

**Improve mobile UI** — all components are in `app/components/`, Tailwind CSS v4

```bash
# Fork → clone → branch
git checkout -b feature/your-feature

# Make changes, then commit
git commit -m "feat: describe your change"

# Push and open a PR against main
git push origin feature/your-feature
```

---

## 🙏 Acknowledgements

- [Base](https://base.org) — L2 home and grant ecosystem
- [Farcaster](https://farcaster.xyz) — decentralized social protocol
- [Neynar](https://neynar.com) — Farcaster API infrastructure
- [OpenRouter](https://openrouter.ai) — free AI model access
- [Vercel](https://vercel.com) — edge deployment
- [Virtuals Protocol](https://virtuals.io) — $AGYP token & agent registry

---

## 📄 License

MIT © 2026 [Afif Azhar](https://github.com/afifarioss)

---

<div align="center">

**🟦 Built in Ipoh, Malaysia. Shipping for Base. Family first.**

[Live App](https://agentyap-x-grok.vercel.app) · [GitHub](https://github.com/afifarioss/agentyap-x-grok) · [Farcaster](https://farcaster.xyz/afifarioss) · [X](https://x.com/afifarioss) · [$AGYP on Base](https://basescan.org/address/0xe9229265edaf8d7c1956a17e9a4acba2c8dbc879)

</div>
