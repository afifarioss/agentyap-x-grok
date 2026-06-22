# AgentYap 🟦

> **The identity layer for Farcaster builders.**
> Generate vibe-native casts with AI. Review before you post. Publish with onchain attribution.

[![Built on Base](https://img.shields.io/badge/Built%20on-Base-0052FF?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMiIgZmlsbD0iIzAwNTJGRiIvPjwvc3ZnPg==)](https://base.org)
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
| AI cast generation via OpenRouter (free tier) | ✅ Live |
| Human-in-the-loop approval before every post | ✅ Live |
| Farcaster Sign-In (FID-based auth) | ✅ Live |
| Neynar managed signer + cast publishing | ✅ Live |
| 🟦 onchain attribution marker | ✅ Live |
| Mobile-first UI (built & tested on phone) | ✅ Live |
| $AGYP token on Base | ✅ Live |
| Demo mode (no credits needed to preview) | ✅ Live |

---

## 🚀 Live Demo

👉 **[agentyap-x-grok.vercel.app](https://agentyap-x-grok.vercel.app)**

> **How it works:**
> 1. Sign in with Farcaster
> 2. Pick your vibe: Builder / Degen / Creator / Family Man
> 3. AI generates a cast preview in <2 seconds
> 4. Review, edit, approve
> 5. Publish to Farcaster with 🟦 marker

---

## 🏗️ Tech Stack

```
Frontend    Next.js 16 App Router + React 19 + TypeScript
Styling     Tailwind CSS v4 (mobile-first)
Auth        @farcaster/auth-kit (FID-based login)
Casting     Neynar v2 SDK (managed signer + publishing)
AI          OpenRouter free tier — Llama 4 Maverick ($0 AI cost)
Chain       viem + Base L2
Deploy      Vercel (Edge + Serverless)
Token       $AGYP on Base
```

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
# Neynar (Farcaster API)
NEYNAR_API_KEY=your_neynar_api_key
NEYNAR_CLIENT_ID=your_neynar_client_id
NEXT_PUBLIC_FARCASTER_CLIENT_ID=your_neynar_client_id

# OpenRouter (AI — free tier works)
OPENROUTER_API_KEY=sk-or-v1-...

# Privy (optional, for embedded wallet)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Farcaster developer account mnemonic
# Use a DEDICATED account — NEVER your personal recovery phrase
FARCASTER_DEVELOPER_MNEMONIC=word1 word2 word3 ... word12

# Cron secret (any random string)
CRON_SECRET=your_random_secret
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Getting API Keys

| Service | Where | Cost |
|---------|-------|------|
| Neynar API | [neynar.com](https://neynar.com) | Free tier available |
| OpenRouter | [openrouter.ai](https://openrouter.ai) | Free (Llama 4 Maverick) |
| Privy | [privy.io](https://privy.io) | Free tier available |

> **Note:** AI generation is completely free via OpenRouter's free tier. No payment needed to run AgentYap's core feature.

---

## 🔄 Neynar Signer Flow

AgentYap uses Neynar's **managed signer** architecture:

```
User signs in with Farcaster (FID-based auth)
        ↓
POST /api/create-signer  →  Neynar creates signer UUID
        ↓
Frontend polls signer status until APPROVED
        ↓
User approves signer in Warpcast
        ↓
POST /api/post-cast  →  Neynar publishes cast on user's behalf
        ↓
Cast appears on Farcaster with 🟦 marker
```

> **Demo Mode:** If Neynar credits are exhausted, the app falls back to demo mode — AI generation still works, publishing is paused. Users see a clear message explaining this.

---

## 🎭 Vibe Personas

AgentYap ships with 4 built-in vibe personas:

| Vibe | Tone | For |
|------|------|-----|
| 🔨 **Builder** | Technical, shipping-focused | Devs, hackers, founders |
| 🎰 **Degen** | High-energy, alpha-seeking | Traders, degens, CT crowd |
| 🎨 **Creator** | Expressive, community-driven | Artists, writers, collectors |
| 👨‍👩‍👧 **Family Man** | Grounded, purpose-driven | Builders with families |

---

## 🪙 $AGYP Token

AgentYap has a live token on Base:

- **Token:** $AGYP
- **Chain:** Base
- **Contract:** [`0xe9229265edaf8d7c1956a17e9a4acba2c8dbc879`](https://basescan.org/address/0xe9229265edaf8d7c1956a17e9a4acba2c8dbc879)
- **Platform:** Virtuals Protocol
- **Agent ID:** `019eb635-81f1-741c`

$AGYP is the community token for AgentYap. Holders are early supporters of the Hybrid Identity Protocol.

---

## 📊 Project Metrics

| Metric | Value |
|--------|-------|
| GitHub commits | 199+ |
| Vibes active | 4/4 |
| Cast generation time | <2s |
| AI cost | $0 (OpenRouter free tier) |
| Hosting cost | $0 (Vercel free tier) |
| Mobile compatibility | 100% |
| License | MIT (open source) |

---

## 🗺️ Roadmap

### Phase 1 — Foundation ✅ (Complete)
- [x] Farcaster Sign-In
- [x] 4 vibe personas
- [x] AI cast generation (OpenRouter)
- [x] Neynar managed signer
- [x] Human-in-the-loop approval
- [x] 🟦 onchain attribution
- [x] Mobile-first UI
- [x] $AGYP token launch

### Phase 2 — Identity Layer 🔄 (In Progress)
- [ ] Talent Protocol integration (onchain credentials)
- [ ] x402 paywall — premium vibe access
- [ ] Base Pay / Base Account SDK
- [ ] White-label for other Base builders
- [ ] ERC-8004 agent registration

### Phase 3 — Protocol 🔮 (Planned)
- [ ] AgentYap SDK — any builder can add vibe-aware casting to their app
- [ ] Onchain signer registry
- [ ] Base Batches application
- [ ] Multi-agent support

---

## 🌍 Why This Matters

The Farcaster ecosystem is growing fast. But most AI tools for social posting are:
- **Opaque** — you don't know what they'll post
- **Impersonation risks** — no attribution
- **Web2 patterns** — no onchain identity

AgentYap solves this with a simple principle: **AI assists, humans approve, blockchain attributes.**

Every 🟦-marked cast on Farcaster is a signal: *"This was AI-assisted, human-approved, and transparent about it."*

That's the Hybrid Identity Protocol.

---

## 👨‍💻 Built By

**Afif Azhar** ([@afifarioss](https://farcaster.xyz/afifarioss))

> *"I'm a solo builder from Ipoh, Malaysia 🇲🇾. Dad of 3 kids — Danish (7), Darissa (5), and baby Damia (7 months). I build AgentYap between parenting shifts. No laptop. No co-founder. No VC. Just a phone, public commits, and shipped code. Building on Base for my family's future."*

- 🐦 X: [@afifarioss](https://x.com/afifarioss)
- 🟣 Farcaster: [@afifarioss](https://farcaster.xyz/afifarioss)
- 🔗 Base wallet: `afifarioss.base.eth`
- 🌐 Links: [link.me/~afifarios](https://link.me/~afifarios)

---

## 🤝 Contributing

AgentYap is MIT licensed and open for contributions.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feature/your-feature

# Commit your changes
git commit -m "feat: your feature"

# Push and open a PR
git push origin feature/your-feature
```

Areas where contributions are welcome:
- New vibe personas
- UI improvements
- Additional AI providers
- Onchain integrations
- Documentation

---

## 🙏 Acknowledgements

Built with:
- [Base](https://base.org) — L2 home
- [Farcaster](https://farcaster.xyz) — social protocol
- [Neynar](https://neynar.com) — Farcaster API infrastructure
- [OpenRouter](https://openrouter.ai) — free AI access
- [Vercel](https://vercel.com) — deployment
- [Virtuals Protocol](https://virtuals.io) — $AGYP token

---

## 📄 License

MIT © 2026 [Afif Azhar](https://github.com/afifarioss)

---

<div align="center">

**🟦 Built in Ipoh, Malaysia. Shipping for Base. Family first.**

[Live App](https://agentyap-x-grok.vercel.app) · [GitHub](https://github.com/afifarioss/agentyap-x-grok) · [Farcaster](https://farcaster.xyz/afifarioss) · [X](https://x.com/afifarioss) · [$AGYP](https://basescan.org/address/0xe9229265edaf8d7c1956a17e9a4acba2c8dbc879)

</div>
