'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { AuthKitProvider } from '@farcaster/auth-kit';
import { base } from 'viem/chains';

const farcasterConfig = {
  rpcUrl: 'https://mainnet.optimism.io',
  domain: 'agentyap-x-grok.vercel.app',
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthKitProvider config={farcasterConfig}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          loginMethods: ['wallet', 'email', 'farcaster'],
          appearance: {
            theme: 'dark',
            accentColor: '#7c3aed',
          },
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
          },
          defaultChain: base,
          supportedChains: [base],
        }}
      >
        {children}
      </PrivyProvider>
    </AuthKitProvider>
  );
}