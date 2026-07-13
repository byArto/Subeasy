import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { TelegramProvider } from '@/components/providers/TelegramProvider';
import { ProProvider } from '@/components/providers/ProProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';
import { Inter, Lora, Montserrat, Exo_2, Golos_Text } from 'next/font/google';
import './globals.css';

// Self-hosted at build time (was loaded from Google Fonts CDN — slow/throttled
// in RU and, together with a blocking script, made the first open crawl). Each
// theme uses one family; claude (the default theme) = Inter body + Lora display.
const inter = Inter({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700', '800'], variable: '--font-inter', display: 'swap' });
const lora = Lora({ subsets: ['latin', 'cyrillic'], weight: ['400', '500'], variable: '--font-lora', display: 'swap', preload: false });
const montserrat = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700', '800'], variable: '--font-montserrat', display: 'swap', preload: false });
const exo2 = Exo_2({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700', '800'], variable: '--font-exo2', display: 'swap', preload: false });
const golos = Golos_Text({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700'], variable: '--font-golos', display: 'swap', preload: false });

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
    <html lang="en" translate="no" className={`${inter.variable} ${lora.variable} ${montserrat.variable} ${exo2.variable} ${golos.variable}`}>
      <head>
        {/* Telegram SDK — loaded ONLY when the app is actually opened from
            Telegram (launch params in the URL, or the injected webview proxy).
            In the Google Play TWA, the PWA and a normal browser it's never
            fetched, so telegram.org (slow/throttled in RU) can't block the first
            paint. TMA analytics init after it loads, still only inside Telegram. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var inTG=/tgWebApp/.test(location.hash)||/tgWebApp/.test(location.search)||!!window.TelegramWebviewProxy||!!(window.Telegram&&window.Telegram.WebApp);if(inTG){var s=document.createElement('script');s.src='https://telegram.org/js/telegram-web-app.js';s.onload=function(){try{var token='${process.env.NEXT_PUBLIC_TMA_ANALYTICS_TOKEN ?? ''}';var webApp=window.Telegram&&window.Telegram.WebApp;var inTelegram=!!(webApp&&webApp.initData);if(token&&inTelegram){var a=document.createElement('script');a.src='https://tganalytics.xyz/index.js';a.async=true;a.onload=function(){try{window.telegramAnalytics&&window.telegramAnalytics.init({token:token,appName:'subeasy1'})}catch(e){}};document.head.appendChild(a)}}catch(e){}};document.head.appendChild(s)}}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://xmmseorpelrppnrlcxai.supabase.co" />
        {/* Theme init — reads localStorage before paint to avoid flash.
            Default theme is 'claude' (light) for anyone who hasn't chosen one.
            dangerouslySetInnerHTML is safe here: __html is a hardcoded
            compile-time string with no user input. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('subeasy-theme')||localStorage.getItem('neonsub-theme');if(t!=='green'&&t!=='purple'&&t!=='blue'&&t!=='claude')t='claude';if(t!=='green')document.documentElement.dataset.theme=t;var tc={green:'#00FF41',purple:'#A855F7',blue:'#06B6D4',claude:'#faf9f5'};var m=document.querySelector('meta[name="theme-color"]');if(m&&tc[t])m.setAttribute('content',tc[t]);}catch(e){}`,
          }}
        />
        {/* Fonts are now self-hosted via next/font (see the imports up top) —
            no external Google Fonts request. */}
        <link rel="icon" href="/icons/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SubEasy" />
        <meta name="theme-color" content="#faf9f5" />
        <meta name="format-detection" content="telephone=no" />
        {/* App provides its own i18n (8 languages). Disable browser auto-translate,
            which mangles the page ("Telegram" → "Телеграмма", garbled labels). */}
        <meta name="google" content="notranslate" />
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
