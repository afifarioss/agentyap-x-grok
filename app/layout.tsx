import type { Metadata } from "next";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://neynarxyz.github.io/siwn/raw/1.2.0/index.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  );
}