import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { EventProvider } from '@/contexts/EventContext';
import '@/styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <EventProvider>
        <Component {...pageProps} />
      </EventProvider>
    </SessionProvider>
  );
}

