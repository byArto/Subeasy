import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#00FF41',
};

export const metadata: Metadata = {
  title: 'SubEasy',
  description: 'Трекер подписок — всё под контролем',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SubEasy',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/icons/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SubEasy" />
        <meta name="theme-color" content="#00FF41" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="bg-surface text-text-primary font-body antialiased">
        {/* Inline splash — shows instantly before JS loads */}
        <div
          id="pre-splash"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom, #0A0A12, #07070C)',
            zIndex: 9999,
            transition: 'opacity 0.3s',
          }}
        >
          <img
            src="/icons/splash-logo.png"
            alt=""
            width={72}
            height={72}
            style={{
              borderRadius: 16,
              filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.3))',
              animation: 'pulse-glow 1.5s ease-in-out infinite',
            }}
          />
          <style
            dangerouslySetInnerHTML={{
              __html: `@keyframes pulse-glow{0%,100%{opacity:.8;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}`,
            }}
          />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__removeSplash=function(){var s=document.getElementById('pre-splash');if(s){s.style.opacity='0';setTimeout(function(){s.remove()},300)}}`,
          }}
        />
        <AuthProvider>
          <div className="app-shell w-full max-w-[430px] mx-auto flex-1">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
