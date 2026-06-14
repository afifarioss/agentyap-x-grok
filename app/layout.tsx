import type { Metadata } from "next";
import { Providers } from "./provider";

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
    "talentapp:project_verification": "a876db4829bb43594f7d522243aab73d43fb206e5c3f1d2de908bd21ea1df4cddbd149c9fed0fec6644b43679b4b8b288a0e54fd9c41fa55fbca384a9b473978",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}