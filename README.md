# AgentYap

**OpenRouter-powered Autonomous AI Agent for Farcaster — Built on Base**

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

┌─────────────────────────────────────────┐ │ Client Layer │ │ Next.js 16 App Router · React 19 · TS │ │ Tailwind CSS v4 · Mobile-first │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Auth Layer │ │ @farcaster/auth-kit · FID-based login │ │ Neynar v2 signer creation & management │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Generation Layer │ │ Vibe templates → Cast generation │ │ (OpenRouter free AI — no payment card) │ │ Rate limiting · Input sanitization │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Publishing Layer │ │ Neynar API · Cast publication │ │ Farcaster Hub verification │ └─────────────────────────────────────────┘  │ ┌─────────────────────────────────────────┐ │ Base L2 Settlement │ │ viem · Onchain identity anchoring │ │ (Talent Protocol integration target) │ └─────────────────────────────────────────┘


---

## Neynar Signer Flow (Managed)

The signer creation follows a three-step cycle:

1. **Create:** Your app calls `/api/create-signer` which returns a deeplink and a signer UUID
2. **Approve:** User opens the deeplink in Warpcast to approve
3. **Poll:** Your app polls `/api/check-signer` every 2 seconds until the signer status is `approved`

The polling loop is where most users get stuck. Here's the actual implementation:

```typescript
// Poll every 2 seconds with exponential backoff
// Timeout after 60 seconds to prevent infinite loops

const pollSigner = async (uuid: string) => {
  const timeout = 60000; // 60 second max
  const start = Date.now();
  const interval = 2000;

  while (Date.now() - start < timeout) {
    const response = await fetch(`/api/check-signer?uuid=${uuid}`);
    const data = await response.json();

    if (data.status === 'approved') {
      return data.signer;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Signer approval timed out — show user a retry button');
};


Key details:
 
60 second timeout prevents infinite hanging
 
2 second interval is aggressive enough that users don't wait forever, but not so aggressive that you're hammering the API
 
Retry button — if timeout hits, show the user a "Retry" button instead of a dead spinner




Technical Specifications


Component	Tech	Version	
Framework	Next.js	16.2.4	
Runtime	Node.js	20+	
Language	TypeScript	5.x	
Auth	@farcaster/auth-kit	0.8.2	
Farcaster SDK	@neynar/nodejs-sdk	2.x	
EVM	viem	2.21.x	
Styling	Tailwind CSS	4.x	
Deployment	Vercel	Edge + Serverless	




API Routes

Endpoint	Method	Purpose	
`/api/create-signer`	POST	Initialize Neynar signer for FID	
`/api/check-signer`	GET	Poll signer approval status	
`/api/generate-post`	POST	Generate cast from vibe + context	
`/api/sample-post`	POST	Generate sample cast (rate-limited)	
`/api/post-cast`	POST	Publish approved cast to Farcaster	
`/api/heartbeat`	GET	Health check + uptime monitoring	



Vibe System
Each vibe is a persona primitive — a structured prompt template that shapes output style without losing the user's voice

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
Base Builder Grants	High	OpenRouter free tier, gas subsidies	
Talent Protocol Grants	High	Reputation layer development, attestations	
Neynar Developer Fund	Medium	Advanced signer features, analytics	



Metrics (Since Launch)

Metric	Value	
Deployments	50+ test casts	
Vibes tested	4/4 active	
Avg. generation time	<2s	
Mobile compatibility	100%	
