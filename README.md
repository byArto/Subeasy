# SubEasy — Subscription Tracker

> Track all your subscriptions in one place. Never miss a payment.

SubEasy is a Telegram Mini App + PWA for managing recurring subscriptions and payments. It runs directly inside Telegram and works as a standalone PWA on iOS/Android.

---

## Screenshots

<!-- Add screenshots here -->
<!-- Example: ![Main screen](docs/screenshots/main.png) -->

---

## Features

- **Subscription tracking** — add any subscription with price, currency, billing cycle, and next payment date
- **Multi-currency support** — display everything in your preferred currency with live exchange rates
- **Categories & icons** — organize subscriptions with custom categories
- **Shared workspaces** — track subscriptions together with family or teammates
- **PRO via TON / Telegram Stars** — in-app payments with no external checkout
- **Telegram Bot** — get notified about upcoming payments directly in Telegram
- **Daily reminders** — cron-based push notifications at 6 AM UTC
- **PWA** — installable on iOS 16.4+ and Android, works offline
- **Dark cyberpunk UI** — neon green on black, optimized for mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 + Framer Motion |
| Database | Supabase (PostgreSQL + Auth) |
| Bot | Telegram Bot API |
| Payments | TON Connect + Telegram Stars |
| Rate limiting | Upstash Redis |
| Hosting | Vercel |
| Platform | Telegram Mini App + PWA |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A Telegram Bot (via [@BotFather](https://t.me/BotFather))
- An [Upstash Redis](https://upstash.com) database (free tier works)

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/byArto/NeonSub.git
cd NeonSub
npm install
```

2. Copy the environment template and fill in your values:

```bash
cp .env.example .env.local
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

See [.env.example](.env.example) for the full list with descriptions.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Yes | Random secret for webhook verification |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |
| `TON_WALLET_ADDRESS` | Yes | TON wallet for receiving payments |
| `TONCONSOLE_WEBHOOK_SECRET` | Yes | TonConsole webhook secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app's public URL |
| `CRON_SECRET` | Auto | Injected by Vercel for cron jobs |

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/telegram/webhook` | POST | Telegram Bot webhook handler |
| `/api/cron/notify` | GET | Daily notification cron job |
| `/api/ton/webhook` | POST | TON payment webhook |
| `/api/ton/create-payment` | POST | Create a TON payment session |
| `/api/workspace/*` | Various | Workspace management |

---

## Deployment

The app is designed to deploy on Vercel with zero config:

```bash
vercel deploy
```

Set all environment variables in the Vercel dashboard. The cron job (`/api/cron/notify` at 6 AM UTC) is configured in [vercel.json](vercel.json).

After deploying, register your Telegram Bot webhook:

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

---

## License

MIT
