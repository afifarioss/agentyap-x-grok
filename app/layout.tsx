import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AgentYap",
  description: "AI Agent untuk auto generate & post dekat Farcaster guna Grok",
  icons: {
    icon: "/icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "AgentYap",
    description: "AI Agent untuk auto generate & post dekat Farcaster guna Grok",
    url: "https://agentyap-x-grok.vercel.app",
    images: [
      {
        url: "https://agentyap-x-grok.vercel.app/agent-yap-character.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentYap",
    description: "AI Agent untuk auto generate & post dekat Farcaster guna Grok",
    images: ["https://agentyap-x-grok.vercel.app/agent-yap-character.png"],
  },
  other: {
    "talentapp:project_verification": "57626696a3eb8166b953bf1f74c29b942f3eeb5b555d945f680776d586be2fef49cb02208046e51ff362c62362834de27fd1c02b06c8d39d412132c84d09dcfb",
  },
};

export default