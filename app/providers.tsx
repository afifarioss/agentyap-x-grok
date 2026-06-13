'use client';

import { AuthKitProvider } from '@farcaster/auth-kit';
import '@farcaster/auth-kit/styles.css';

const config = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: 'agentyap-x-grok.vercel.app',
};

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthKitProvider config={config}>{children}</AuthKitProvider>;
}