# UX/UI Audit Report

- Target: http://127.0.0.1:3000
- Side panel URL: http://127.0.0.1:3000/ux-auditor.html?target=/&endpoint=http%3A%2F%2F127.0.0.1%3A4174%2Freport&autorun=1
- Scope: Codex right-panel Browser plugin, iPhone-style same-origin wrapper.
- Finished: 2026-04-24T19:49:32Z
- Screenshots: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2247/screenshots
- Console logs: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2247/console-logs.json

## What Works

- The Next.js dev server starts at `http://127.0.0.1:3000`.
- The same-origin UX audit wrapper opens in the Codex right-panel browser.
- The iPhone frame and wrapper chrome render correctly.

## Issues

1. [Critical] App does not boot inside the required iPhone audit frame
   - Screen: Initial framed app load.
   - Action: Open same-origin wrapper with `target=/`.
   - Expected: SubEasy should render inside the iPhone frame so the safe visual autopilot can click through the mobile UI.
   - Actual: The iPhone screen stayed white. The wrapper DOM contained only the iframe, and the iframe body/html were not accessible to the browser runtime.
   - Evidence: `/Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2247/screenshots/01-blank-iphone-wrapper.png`, `/Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2247/dom-snapshot.txt`, `/Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2247/headers-ux-auditor.txt`.
   - Recommendation: Allow the audit wrapper to embed same-origin pages by adding an explicit `frame-src 'self'` directive for local/dev audit pages, or exempt `/ux-auditor.html` from the global CSP. Keep production `frame-ancestors` protections separate from local audit tooling.

## Notes

- No safe click-through was performed because the framed app boot failed.
- No browser console errors were exposed through `tab.dev.logs`; the response headers show `default-src 'none'` and no explicit `frame-src`, which is consistent with iframe loading being blocked by CSP fallback.
- No code changes were made.
