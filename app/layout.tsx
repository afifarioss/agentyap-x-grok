import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentYap",
  description: "AI Agent untuk auto generate & post dekat Farcaster guna Grok",
  icons: {
    icon: "/icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Farcaster Mini App Meta Tags */}
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:miniapp" content="true" />
        <meta name="fc:frame:image" content="https://agentyap-x-grok.vercel.app/og-image.png" />
        <meta name="fc:frame:button:1" content="Open AgentYap" />
        <meta name="fc:frame:button:1:action" content="link" />
        <meta name="fc:frame:button:1:target" content="https://agentyap-x-grok.vercel.app/" />
      </head>
      <body>{children}</body>
    </html>
  );
}