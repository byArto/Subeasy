import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    // Security headers for all routes
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        // Enforce HTTPS for 2 years, including subdomains; preload-ready
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        {
          key: 'Content-Security-Policy',
          value: [
            // script-src: self + Telegram Mini App SDK + Vercel Analytics.
            // 'unsafe-inline' required for dangerouslySetInnerHTML init scripts
            // (theme, font-loader, splash-removal) — all are hardcoded compile-time strings.
            "script-src 'self' 'unsafe-inline' https://telegram.org https://va.vercel-scripts.com",
            // style-src: 'unsafe-inline' required for Tailwind/Framer Motion inline styles
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // font-src: Google Fonts files
            "font-src 'self' data: https://fonts.gstatic.com",
            // img-src: local + data URIs (emoji) + any HTTPS (subscription icons)
            "img-src 'self' data: blob: https:",
            // connect-src: Supabase REST + Realtime, Vercel Analytics vitals
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",
            // frame-ancestors: allow embedding inside Telegram WebView only
            "frame-ancestors 'self' https://web.telegram.org https://t.me",
            // Hardening: no plugins, no base-tag hijacking, no unknown fallback
            "object-src 'none'",
            "base-uri 'self'",
            "default-src 'none'",
          ].join('; '),
        },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=604800' },
      ],
    },
  ],
};

export default nextConfig;
