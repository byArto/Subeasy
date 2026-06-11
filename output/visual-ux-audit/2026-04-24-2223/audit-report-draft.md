# UX/UI Audit Report

- Target: http://localhost:3000
- Scope: Codex right-panel Browser plugin, mobile/iPhone-style visual pass. Guest mode was already active; the Continue without signing in screen did not appear in this browser state.
- Finished: 2026-04-24T19:30:00.562Z
- Screenshots: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots
- Console logs: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/console-logs.json

## What works

- Splash resolves into the main app shell.
- Guest app state is usable without login in the current browser profile.
- Home empty state, service chips, Add subscription modal, Search, Notifications, Analytics, Calendar, Settings, and PRO modal are reachable.
- Search and notification empty states are understandable.

## Findings

1. [High] PRO modal lacks an obvious close control
   - Actual: The paywall sheet has payment CTAs and a drag handle, but no visible close button; tapping the expected top-right close area did not dismiss it. Backdrop tap worked, but that affordance is hidden.
   - Evidence: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/15-pro-modal.png, /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/16-home-after-pro-close-attempt.png
   - Recommendation: Add a visible, labeled close button in the PRO modal header and keep it above payment CTAs.

2. [High] Header icon buttons and FAB are unlabeled
   - Actual: The accessibility snapshot exposes search, notifications, FAB, and some modal close controls as unnamed buttons. This hurts screen-reader use and makes automated QA brittle.
   - Evidence: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/01-home-subscriptions-empty.png, /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/04-add-subscription-modal-top-after-wait.png
   - Recommendation: Add aria-labels such as Search, Notifications, Add subscription, and Close to icon-only buttons.

3. [Medium] Next.js dev issue badge blocks mobile navigation during local QA
   - Actual: The red Next.js issue badge overlaps the lower-left tab area and initially prevented the Analytics tab from activating until the badge was minimized.
   - Evidence: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/01-home-subscriptions-empty.png, /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/06-home-after-dev-badge-collapse.png
   - Recommendation: Fix the underlying dev warning and, for mobile QA, account for the dev overlay or run production preview.

4. [Medium] Console shows hydration mismatch and Telegram launch-params errors outside Telegram
   - Actual: The app logs a React hydration mismatch on html style attributes and an unhandled Telegram analytics launch-params error when opened in a normal browser.
   - Evidence: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/console-logs.json
   - Recommendation: Move Telegram-only analytics behind an environment check and make server/client HTML attributes deterministic.

5. [Medium] Empty Analytics and Calendar states do not provide an inline recovery action
   - Actual: Both screens explain that subscriptions are needed, but the empty-state area itself has no Add subscription CTA; users must infer the bottom FAB.
   - Evidence: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/07-analytics-screen.png, /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/08-calendar-screen.png
   - Recommendation: Add a small inline Add subscription button or link in empty states.

6. [Low] Add subscription form has a long scroll to the primary submit action
   - Actual: The required fields are clear after animation settles, but the submit button is far below the first viewport and not sticky.
   - Evidence: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/04-add-subscription-modal-top-after-wait.png, /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/03-add-subscription-modal-scrolled.png
   - Recommendation: Consider a sticky footer submit action or a shorter first-pass form with advanced fields collapsed by default.

7. [Low] Notification enabled state lacks permission/status clarity
   - Actual: Settings showed Enable notifications as active, but the browser context also logged Telegram/haptic environment warnings and no clear permission status was visible.
   - Evidence: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223/screenshots/09-settings-top.png
   - Recommendation: Show browser/Telegram permission status near the toggle, especially outside Telegram.

## Suggested fix order

1. Add visible/labeled close control to the PRO modal.
2. Add aria-labels to icon-only controls.
3. Fix hydration and Telegram analytics console errors.
4. Improve empty-state CTAs and add-form submit ergonomics.

No code changes were made.
