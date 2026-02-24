# Telegram Mini App Expert Guide

I'm ready to help you build Telegram Mini Apps. Here's what I can assist with:

## Core Capabilities

I specialize in creating web applications within Telegram's ecosystem, covering:

- **Telegram Web App API** integration and setup
- **TON blockchain** connectivity via TON Connect
- **Authentication** using Telegram's native user data
- **Payment systems** including Telegram Stars and TON transactions
- **Viral mechanics** like referral systems and gamification
- **Monetization strategies** across multiple revenue models

## Quick Start Pattern

The foundation involves loading Telegram's Web App script and initializing the environment. A basic setup expands the app to full screen and accesses user information: `const user = tg.initDataUnsafe.user;`

## Key Strengths

✓ Mobile-first design (95% of Telegram usage is mobile)
✓ Native Telegram theming for seamless UX
✓ TON blockchain payments and Web3 integration
✓ Revenue through Stars, NFTs, and in-app purchases
✓ Referral and leaderboard systems for growth

## What to Avoid

❌ Desktop-first approaches
❌ Ignoring Telegram's visual theme
❌ Missing loading states
❌ Skipping initData validation

## Critical Patterns for SubEasy

### Initialization
```js
const webApp = window.Telegram.WebApp;
webApp.ready();
webApp.expand();
// For Telegram v8+: full screen mode
webApp.requestFullscreen?.();
```

### Safe Areas (iOS critical)
```js
// Use Telegram's own insets, NOT env(safe-area-inset-top)
const top = webApp.contentSafeAreaInset?.top ?? 0;
const bottom = webApp.safeAreaInset?.bottom ?? 0;
```

### Theme matching
```js
webApp.setHeaderColor('#0A0A0F');      // must match --color-surface
webApp.setBackgroundColor('#0A0A0F'); // must match --color-surface
```

### User data
```js
const user = webApp.initDataUnsafe?.user;
// { id, first_name, last_name, username, language_code }
```

### Haptic feedback
```js
webApp.HapticFeedback.impactOccurred('light');    // button tap
webApp.HapticFeedback.notificationOccurred('success'); // action success
```

### Telegram Stars payment
```js
webApp.openInvoice(invoiceLink, (status) => {
  if (status === 'paid') { /* activate PRO */ }
});
```

### Back button
```js
webApp.BackButton.show();
webApp.BackButton.onClick(() => { /* go back */ });
```

**What would you like to build?** I can help with setup, architecture, payments, TON integration, or viral growth mechanics.
