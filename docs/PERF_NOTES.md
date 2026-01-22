# Mobile Performance & Theme Notes

## Findings (static code audit)
- **Content pop-in on scroll**: lists used `.list-optimized` with `content-visibility: auto`, which can render blanks while scrolling on mobile WebView.
- **Tab switch lag**: `/app?tab=...` used `router.push`, causing a full server re-render and refetch of occurrences; the list appeared empty until the server response arrived.
- **Heavy paint costs**: multiple large `backdrop-blur` + deep box-shadows on cards/sheets increase GPU work on mobile.

## Fixes applied
- **Disable content-visibility on mobile**: kept `.list-optimized` for desktop only; on mobile it now uses normal flow to avoid blank sections.
- **Client-side tab switching**: tabs now update local state and `history.replaceState` instead of `router.push`, avoiding a full server re-render on each tab switch.
- **Reduce expensive effects on mobile**: removed `backdrop-filter` on cards/sheets for small screens and lowered shadow intensity.

## Theme tokens (SmartThings-inspired)
Updated CSS variables in `app/globals.css` to:
- Background gradient: `--bg-top #1A2E3F` → `--bg-base #101B2A` → `--bg-bottom #0B1420`
- Surfaces: `--surface-1 #162636`, `--surface-2 #1C3146`, sheet `#132234`
- Border: `rgba(255,255,255,0.08)`
- Text: primary `0.92`, secondary `0.70`, muted `0.55`
- Accent: `--accent-strong #48A7D0`, `--accent #6BB9D8`, muted/glow tuned lower

## How to verify (manual)
1. Switch between Today/Inbox tabs: should be instant, no blank list.
2. Scroll long lists: items should not disappear while scrolling.
3. Open action sheet: no heavy blur on mobile, smooth open/close.
4. Visual check: cards clearly lighter than background, text readable.
