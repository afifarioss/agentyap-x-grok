# AgentYap

**Autonomous AI Agent for Farcaster — Built on Base**

> Programmable identity. Vibe-native content. Onchain reputation.

**Live:** https://agentyap-x-grok.vercel.app  
**Builder:** [@afifarioss](https://warpcast.com/afifarioss) · Ipoh, Malaysia

---

## Abstract

AgentYap is a **Hybrid Identity Protocol (HIP)** that enables Farcaster users to deploy autonomous AI agents with programmable voice, transparent attribution, and onchain reputation. Built on Base L2, it demonstrates a new primitive for the agentic economy: **one account, two voices, shared value**.

Unlike black-box AI bots, AgentYap uses explicit markers (🟦) to distinguish agent-generated content, preserving human trust while scaling output. The architecture is designed for **Base Talent Protocol** integration — agents earn onchain reputation through consistent, high-signal casts.

---

## Problem Statement

- Builders struggle with **consistent content creation** while shipping product
- AI agents on social platforms are **opaque and trust-eroding**
- No standard exists for **attributable, reputation-bearing agent identities**
- Farcaster lacks **vibe-native tooling** for Base ecosystem participants

---

## Solution: Hybrid Identity Protocol (HIP)

| Layer | Implementation |
|-------|---------------|
| **Identity** | Farcaster FID + Neynar managed signers |
| **Voice** | Vibe-templated generation (Builder/Degen/Creator/Family) |
| **Attribution** | Explicit 🟦 marker on all agent casts |
| **Reputation** | Onchain posting history via Farcaster hubs |
| **Control** | Human approves/revokes signer anytime |

---

## Architecture


┌─────────────────────────────────────────┐ │ Client Layer │ │ Next.js 16 App Router · React 19 · TS │ │ Tailwind CSS v4 · Mobile-first │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Auth Layer │ │ @farcaster/auth-kit · FID-based login │ │ Neynar v2 signer creation & management │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Generation Layer │ │ Vibe templates → Cast generation │ │ (Grok API integration ready) │ │ Rate limiting · Input sanitization │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Publishing Layer │ │ Neynar API · Cast publication │ │ Farcaster Hub verification │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Base L2 Settlement │ │ viem · Onchain identity anchoring │ │ (Talent Protocol integration target) │ └─────────────────────────────────────────┘




---

## Technical Specifications

| Component | Tech | Version |
|-----------|------|---------|
| Framework | Next.js | 16.2.4 |
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5.x |
| Auth | @farcaster/auth-kit | 0.8.2 |
| Farcaster SDK | @neynar/nodejs-sdk | 2.x |
| EVM | viem | 2.21.x |
| Styling | Tailwind CSS | 4.x |
| Deployment | Vercel | Edge + Serverless |

---

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/create-signer` | POST | Initialize Neynar signer for FID |
| `/api/check-signer` | GET | Poll signer approval status |
| `/api/generate-post` | POST | Generate cast from vibe + context |
| `/api/sample-post` | POST | Generate sample cast (rate-limited) |
| `/api/post-cast` | POST | Publish approved cast to Farcaster |
| `/api/heartbeat` | GET | Health check + uptime monitoring |

---

## Vibe System

Each vibe is a **persona primitive** — a structured prompt template that shapes output style without losing the user's voice.

```typescript
type Vibe = 'builder' | 'degen' | 'creator' | 'family';

interface VibeConfig {
  id: Vibe;
  tone: string;
  vocabulary: string[];
  hashtagStrategy: 'minimal' | 'organic' | 'none';
  emojiDensity: 'low' | 'medium' | 'high';
}


Security Model
 
No key custody: AgentYap never holds private keys
 
Signer revocation: User can revoke Neynar signer anytime via Warpcast
 
Rate limiting: 10 samples per IP per 10-minute window
 
Input sanitization: All user inputs validated server-side
 
No persistent storage: Zero database attack surface





Base Talent Protocol Integration Roadmap
Phase 1: Reputation Anchoring (Current)
 
✅ Farcaster-native posting history
 
✅ Transparent agent attribution (🟦 marker)
 
✅ Human-verified signer approval
Phase 2: Onchain Credentials (Q3 2026)
 
Talent Protocol Passport: Link FID to onchain builder credentials
 
Skill attestations: Vibe-specific reputation (e.g., "Verified Builder")
 
Contribution scores: Engagement-weighted posting quality
Phase 3: Agent Economy (Q4 2026)
 
Agent NFTs: Ownable, transferable agent configurations
 
Revenue sharing: Split cast monetization between human + agent
 
Cross-protocol reputation: Export AgentYap score to other Base dApps





Grant Alignment


Program	Fit	Use of Funds	
Base Builder Grants	High	Grok API integration, gas subsidies	
Talent Protocol Grants	High	Reputation layer development, attestations	
Neynar Developer Fund	Medium	Advanced signer features, analytics	
xAI Developer Access	Medium	Production API credits for agent generation	




Metrics (Since Launch)

Metric	Value	
Deployments	50+ test casts	
Vibes tested	4/4 active	
Avg. generation time	<2s	
Mobile compatibility	100%	





Local Development

# Clone
git clone https://github.com/afifarioss/agentyap-x-grok.git
cd agentyap-x-grok

# Install
npm install

# Environment
cp .env.example .env.local
# Edit: NEYNAR_API_KEY, NEYNAR_CLIENT_ID, NEXT_PUBLIC_FARCASTER_CLIENT_ID

# Dev server
npm run dev

# Type check
npm run typecheck

# Build
npm run build




Environment Variables

# Required
NEYNAR_API_KEY=              # Neynar API key
NEYNAR_CLIENT_ID=            # Neynar app client ID
NEXT_PUBLIC_FARCASTER_CLIENT_ID=  # Same as above (public)

# Optional — Real AI generation
GROK_API_KEY=                # xAI Grok API key
XAI_API_KEY=                 # Fallback

# Optional — Cron security
CRON_SECRET=                 # Random string for heartbeat auth





Team

Role	Handle	Contribution	
Builder	[@afifarioss](https://warpcast.com/afifarioss)	Architecture, product, Base integration	
Family CFO	Danish (7), Darissa (5), Damia (7m)	Motivation, user testing, bedtime stories	

Built in Ipoh, Malaysia · Shipping for Base





License
MIT — Open for forks, integrations, and protocol extensions.



AgentYap is a submission for Base Builder Grants and Talent Protocol ecosystem funding. All code is open source. All casts are human-approved. 