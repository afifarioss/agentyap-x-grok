import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentYap",
  description: "AI-powered Autonomous Farcaster Agent on Base",
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "talentapp:project_verification": "a876db4829bb43594f7d522243aab73d43fb206e5c3f1d2de908bd21ea1df4cddbd149c9fed0fec6644b43679b4b8b288a0e54fd9c41fa55fbca384a9b473978",
    "base:app_id": "6a227586ab28df7fd2fc1616",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
