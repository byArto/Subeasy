import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SubEasy',
    short_name: 'SubEasy',
    description: 'Трекер подписок — всё под контролем',
    start_url: '/',
    scope: '/',
    lang: 'ru',
    dir: 'ltr',
    categories: ['finance', 'productivity'],
    display: 'standalone',
    // background_color drives the launch splash — kept dark (matches the
    // existing branded splash). theme_color drives the status bar — cream to
    // match the Claude light theme so the top/bottom system bars aren't green.
    background_color: '#0A0A0F',
    theme_color: '#faf9f5',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
