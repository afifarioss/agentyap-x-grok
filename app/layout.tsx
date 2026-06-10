import type { Metadata } from "next";
import "./globals.css";
import { AuthKitProvider } from "@farcaster/auth-kit";

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
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:miniapp" content="true" />
      </head>
      <body>
        <AuthKitProvider
          config={{
            domain: "agentyap-x-grok.vercel.app", // tukar kepada domain kau
            siweUri: "https://agentyap-x-grok.vercel.app",
          }}
        >
          {children}
        </AuthKitProvider>
      </body>
    </html>
  );
}