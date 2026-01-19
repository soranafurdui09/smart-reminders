# Mobile App Shell (Capacitor Android)

## What changed
- Added native chrome initialization via `components/NativeAppChrome.tsx` (status bar + splash + keyboard resize).
- Added safe-area utilities and native-only padding for bottom tab bar.
- Introduced a native-only bottom tab bar in `components/AppNavigation.tsx` (Home, Calendar, Add, History, Settings).
- Kept web navigation unchanged; the native tab bar only renders on Android (Capacitor).

## Key files
- `components/NativeAppChrome.tsx`: sets StatusBar style/color, hides SplashScreen, enables keyboard resize.
- `components/AppNavigation.tsx`: conditionally renders top nav (web) or bottom tabs (native).
- `app/globals.css`: safe-area helpers, overscroll disable for native, extra bottom padding.
- `app/layout.tsx`: `viewport-fit=cover` for safe areas.
- `capacitor.config.ts`: splash screen defaults.

## Design notes
- Bottom tabs are fixed with safe-area padding and do not overlap content.
- Header remains in place for native but without the web pill navigation.
- Safe area padding is applied via `.safe-top` and `.safe-bottom` classes.

## Checklist
- [ ] Android app shows bottom tabs instead of web pill nav.
- [ ] Status bar uses app background color and doesn’t overlay content.
- [ ] Splash screen closes cleanly without white flash.
- [ ] Content is not hidden behind bottom tabs (scroll to bottom).
- [ ] Safe areas respected on devices with cutouts/gesture bars.
