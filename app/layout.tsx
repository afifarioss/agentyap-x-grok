import type { Metadata } from "next";
import { Providers } from "./providers";

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}