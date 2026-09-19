import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Security Posture Assessment',
  description:
    'Self-scoring security posture assessments for managed service providers and the regulated organizations they serve.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Figtree, loaded the way the approved prototype loads it. The
          no-page-custom-font rule targets the Pages Router, where a <link> in a
          page reaches only that page; in the App Router this is the root layout
          and applies to every route. A stylesheet link also degrades to the
          "Century Gothic"/system-ui fallback if Google Fonts is unreachable,
          where next/font would fail the build instead.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
