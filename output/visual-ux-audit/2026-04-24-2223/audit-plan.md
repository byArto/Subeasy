# UX Auditor Plan

- Target URL: http://localhost:3000
- Side-panel URL: http://localhost:3000/ux-auditor.html?target=%2F&endpoint=http%3A%2F%2F127.0.0.1%3A4174%2Freport&autorun=1&maxClicks=80
- Installed wrapper: /Users/byarto/Desktop/vibe/SubEasy/neonsub/public/ux-auditor.html
- Report endpoint: http://127.0.0.1:4174/report
- Artifact directory: /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223

## Required pass

- Start the report server before opening the side-panel URL.
- Open the side-panel URL only in the Codex right-side browser.
- Do not open external Chrome for this skill.
- The in-page autopilot will visually move a cursor and safely click controls.
- Do not click destructive or real-world final actions.
- Finish with a UX/UI audit report sorted by priority.

## Commands

```bash
python3 /Users/byarto/.codex/skills/ux-auditor/scripts/report_server.py --out /Users/byarto/Desktop/vibe/SubEasy/neonsub/output/visual-ux-audit/2026-04-24-2223 --port 4174
```
