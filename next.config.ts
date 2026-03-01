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
        // Enforce HTTPS for 2 years, including subdomains
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        // Allow embedding inside Telegram WebView, block other iframes
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://web.telegram.org t.me" },
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
