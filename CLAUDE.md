# SubEasy — Project Rules

## Overview
SubEasy — PWA subscription & recurring payment tracker, also runs as a Telegram Mini App. Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion. Deployed on Vercel. Target device — iPhone, iOS 16.4+, PWA standalone.

Data is **offline-first**: localStorage is the primary store; when the user is signed in (Supabase auth), data syncs to Supabase (Postgres) and is shared across devices and Family-Plan workspaces. Server API routes handle Telegram/TON payments, the Telegram bot webhook, the daily reminder cron, and account deletion.

> **Monetization is currently DISABLED** (`NEXT_PUBLIC_MONETIZATION_ENABLED=false`) — the whole app is free, PRO is granted to everyone (`lib/monetization.ts`), and the payment UI/flows are hidden. The payment code paths (Telegram Stars + TON) remain in place behind that flag for when monetization returns. Plan pricing & expiry math live in `lib/plans.ts` (single source of truth).

## Version
Current: 1.7.1

## Design
- Dark cyberpunk: black (#0A0A0F) + neon green (#00FF41, #39FF14)
- Fonts: Outfit (display), Manrope (body)
- No generic AI aesthetics. Every element must be a deliberate design decision
- Minimal glow, precise neon accents, depth via surface color layers
- Surface colors: surface (#0A0A0F) -> surface-2 (#111118) -> surface-3 (#1A1A24) -> surface-4 (#252532)
- Mobile-first PWA, max-width 430px centered

## Architecture

### Structure
```
src/
  app/           # Next.js App Router pages
  components/    # React components (ui/, layout/, subscription/, dashboard/, analytics/, calendar/, settings/, search/, notifications/)
  hooks/         # Custom hooks (useSubscriptions, useCategories, useSettings, useLocalStorage, useNotifications, useExchangeRate, useSound, useStandaloneMode, useNotificationRead)
  lib/           # Utilities (types.ts, constants.ts, utils.ts, sounds.ts, exchange-rate.ts, notifications.ts)
  stores/        # Placeholder (state via hooks)
  public/        # Static assets (icons/, sw.js)
```

### Key Types
- Subscription: id, name, price, currency, category, cycle, nextPaymentDate, startDate, paymentMethod (encoded string), notes, color, icon, isActive
- Category: id, name, emoji, color
- AppSettings: displayCurrency, exchangeRate, useManualRate, notificationsEnabled, notifyDaysBefore

### Payment Method Encoding
Format: `type:subtype:detail` — stored as string for backward compatibility.
- Card: `card:physical:Tinkoff Black` or `card:virtual:Alfa`
- Crypto: `crypto:Bitcoin` or `crypto:USDT TRC-20`
- PayPal: `paypal:user@mail.com`
- Other: `other:Bank transfer`
- Legacy values (`Карта`, `Apple Pay`, `Google Pay`, `Крипто`, `PayPal`, `Другое`) are parsed automatically

### Notification IDs
Stable format: `${subscriptionId}-${type}-${nextPaymentDate}` (e.g., `abc123-soon-2026-02-15`).
When nextPaymentDate updates (new billing cycle), a new ID is generated = new unread notification.

### Storage
All data in localStorage with prefix `neonsub-`:
- `neonsub-subscriptions` — Subscription[]
- `neonsub-categories` — Category[]
- `neonsub-settings` — AppSettings
- `neonsub-notifications-read` — { readIds: string[], lastSeenAt: string }
- `neonsub-sound-enabled` — boolean
- `neonsub-cbr-rate` — { rate, timestamp }

## React Rules

### Components
- Functional components with hooks only
- Each component in its own file
- Props typed via `interface`, not `type`
- Destructure props in function parameters
- Named exports (not default), except page.tsx

### Performance
- `useMemo` for heavy computations (getTotalMonthly, filtered subscriptions, generateNotifications)
- `useCallback` for handler functions passed to children
- Lazy loading via `next/dynamic` for Analytics, Calendar, Settings tabs
- Never inline objects/arrays in props (creates new reference every render)
- `key` in lists must be stable `id`, NEVER array index

### Hooks
- Custom hooks start with `use`
- One hook = one responsibility
- `useEffect`: always specify deps, always use cleanup functions
- Avoid nested conditions in useEffect — prefer multiple useEffects

### Patterns
- Composition over inheritance
- Lift state only when necessary
- Error handling: try/catch in async ops, validate localStorage reads
- Strict TypeScript: no `any`, no `as` without justification

## Next.js + Vercel Rules

- App Router (not Pages Router)
- `'use client'` only where actually needed (useState, useEffect, event handlers)
- Server components by default where possible
- API Routes in `app/api/` for server logic (e.g., `/api/rate` for CBR exchange rate)
- Metadata API for SEO and PWA manifest
- Build must pass without errors before every push

## Tailwind CSS v4 Rules

- Config is in CSS `@theme inline` blocks inside `globals.css`, NOT in `tailwind.config.ts`
- PostCSS uses `@tailwindcss/postcss` plugin
- Use design tokens: `bg-surface`, `text-neon`, `border-border-subtle`, `shadow-neon`, `font-display`, `font-body`
- Custom utility classes: `.neon-text`, `.neon-border`, `.glass-bg`, `.gradient-border`, `.noise-overlay`, `.scanlines`, `.shimmer-bg`
- Animations: `animate-slide-up`, `animate-fade-in`, `animate-scale-in`, `animate-pulse-neon`, `animate-glow`

## Framer Motion Rules

- Animations must be 60fps on iPhone — don't overload
- Prefer `transform` and `opacity` (GPU-accelerated) over width/height/top/left
- `AnimatePresence` with `mode="wait"` for tab transitions
- `whileTap={{ scale: 0.93 }}` on all buttons — instant tactile feedback
- Stagger: `delay: i * 0.04-0.05` (never more than 0.1)
- Spring animations: `{ type: "spring", stiffness: 300, damping: 30 }` — fast, no bouncing
- Drag gestures: `dragConstraints`, `dragElastic: 0.1` for bottom sheets and swipe-to-dismiss
- Don't animate more than 10-15 elements simultaneously
- Exit animations shorter than enter (enter: 0.3s, exit: 0.2s)

## iOS PWA Rules

- Test in standalone mode (added to Home Screen)
- `safe-area-inset`: top for header, bottom for TabBar
- `100dvh` instead of `100vh`
- Minimum touch target: 44x44px (we use `min-h-[36px]-[48px]`)
- `overscroll-behavior: contain` to prevent bounce
- No hover-only styles — everything via active/tap
- AudioContext requires user interaction for first play

## Testing Rules

- Tests for all custom hooks (useSubscriptions, useCategories, useSettings)
- Tests for utility functions (currency conversion, sum calculations, date formatting)
- Tests for critical UI flows (add subscription, delete, edit)
- Test edge cases: empty localStorage, invalid data, zero values

## Security Rules

- No sensitive data in code (API keys, tokens)
- XSS protection: sanitize user input in form fields
- localStorage: validate data on read (try/catch + type check)
- HTTPS only (Vercel provides by default)
- No `eval()`, `innerHTML`, `dangerouslySetInnerHTML` without sanitization
- Dependencies: regularly `npm audit`, update critical packages

## Supabase (in use)

- Used for auth + cross-device/workspace sync (`lib/sync.ts`, `lib/supabase.ts`, `lib/supabase-server.ts`).
- Offline-first: localStorage is primary, Supabase is the sync layer (optimistic UI: update localStorage first, then sync).
- Server routes use the **service-role** client only in trusted contexts (`createServiceClient`) and ALWAYS verify the caller first (`verifyAuth` for user routes; Telegram `initData` HMAC for `/api/telegram/connect`; webhook secrets / `CRON_SECRET` for webhooks & cron). Never trust a client-supplied user/chat id.
- DB↔app row mapping: `lib/dbMappers.ts` (`dbToSubscription`/`dbToCategory`). Keep RLS enabled on all tables.
- There is no Next.js middleware; every API route enforces its own auth (do not rely on a global guard).

## Git

- Commit format: `vX.Y.Z: brief description of changes`
- Every push = working version (build passes)
- Never commit node_modules, .next, .env.local

## Forbidden

- `console.log` in production code (only `console.error` for error handling)
- `any` type in TypeScript
- Inline styles (use Tailwind classes)
- `!important` in CSS (except iOS safe-area hacks)
- Dependencies >500KB without justification
- Direct state mutations (always immutable updates)
