import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { TelegramProvider } from '@/components/providers/TelegramProvider';
import { ProProvider } from '@/components/providers/ProProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // Default theme is Claude (light); the inline theme-init script overrides this
  // per-user before paint for anyone who picked a dark theme.
  themeColor: '#faf9f5',
};

export const metadata: Metadata = {
  title: 'SubEasy',
  description: 'Subscription tracker — everything under control',
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
    <html lang="en">
      <head>
        {/* Telegram Mini App SDK — must load before any other scripts */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        {/* TMA Analytics — CDN approach as recommended by docs.tganalytics.xyz.
            Loads async, initializes via onload before React renders. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var token='${process.env.NEXT_PUBLIC_TMA_ANALYTICS_TOKEN ?? ''}';var webApp=window.Telegram&&window.Telegram.WebApp;var inTelegram=!!(webApp&&webApp.initData);if(token&&inTelegram){var s=document.createElement('script');s.src='https://tganalytics.xyz/index.js';s.async=true;s.onload=function(){try{window.telegramAnalytics&&window.telegramAnalytics.init({token:token,appName:'subeasy1'})}catch(e){}};document.head.appendChild(s)}}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://xmmseorpelrppnrlcxai.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Theme init — reads localStorage before paint to avoid flash.
            Default theme is 'claude' (light) for anyone who hasn't chosen one.
            dangerouslySetInnerHTML is safe here: __html is a hardcoded
            compile-time string with no user input. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('subeasy-theme')||localStorage.getItem('neonsub-theme');if(t!=='green'&&t!=='purple'&&t!=='blue'&&t!=='claude')t='claude';if(t!=='green')document.documentElement.dataset.theme=t;var tc={green:'#00FF41',purple:'#A855F7',blue:'#06B6D4',claude:'#faf9f5'};var m=document.querySelector('meta[name="theme-color"]');if(m&&tc[t])m.setAttribute('content',tc[t]);}catch(e){}`,
          }}
        />
        {/* Non-blocking font load via preload.
            dangerouslySetInnerHTML is safe here: __html is a hardcoded
            compile-time string with no user input. */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:wght@400;500&family=Montserrat:wght@400;500;600;700;800&family=Exo+2:wght@400;500;600;700;800&family=Golos+Text:wght@400;500;600;700&display=swap"
          as="style"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:wght@400;500&family=Montserrat:wght@400;500;600;700;800&family=Exo+2:wght@400;500;600;700;800&family=Golos+Text:wght@400;500;600;700&display=swap';document.head.appendChild(l)`,
          }}
        />
        <link rel="icon" href="/icons/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SubEasy" />
        <meta name="theme-color" content="#faf9f5" />
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
            background: 'linear-gradient(to bottom, var(--color-surface), var(--color-surface-bottom))',
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
              filter: 'var(--app-logo-filter-compact)',
              animation: 'pulse-glow 1.5s ease-in-out infinite',
            }}
          />
          {/* pulse-glow keyframe is defined in globals.css */}
        </div>
        {/* Splash removal helper — must be inline so it runs before React hydration.
            dangerouslySetInnerHTML is safe here: __html is a hardcoded
            compile-time string with no user input. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__removeSplash=function(){var s=document.getElementById('pre-splash');if(s){s.style.opacity='0';setTimeout(function(){s.remove()},300)}}`,
          }}
        />
        <TelegramProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AuthProvider>
                <ProProvider>
                  <WorkspaceProvider>
                    <div className="app-shell w-full max-w-[430px] mx-auto flex-1">
                      {children}
                    </div>
                  </WorkspaceProvider>
                </ProProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </TelegramProvider>
        <Analytics />
      </body>
    </html>
  );
}
