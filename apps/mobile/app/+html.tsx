import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Root HTML for the web build: mobile viewport, installable-app (PWA) tags and iOS home-screen support. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover lets the app use the full iPhone screen; safe-area insets keep content clear of the notch */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Rent Manager</title>
        <meta name="description" content="Manage rooms, tenants, rent, bills and payments." />
        <meta name="theme-color" content="#0F766E" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Rent Manager" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: webCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const webCss = `
html, body { background: #F6F7F9; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
body { overscroll-behavior: none; }
/* keep keyboard focus visible for laptop users */
[tabindex]:focus-visible, a:focus-visible, button:focus-visible { outline: 2px solid #0F766E; outline-offset: 2px; }
@media print { body { background: #fff; } }
`;
