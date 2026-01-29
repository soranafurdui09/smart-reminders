# Android Wrapper Audit (Phase 0)

## What exists today
- `android-webview/` folder: a minimal custom Android WebView wrapper (Gradle + app module).
- PWA assets:
  - `public/manifest.json`
  - `public/sw.js` (push handler + notification click actions)
- Web Push subscription flow:
  - `components/PushSettings.tsx` + `/api/push/subscribe` + `/api/push/unsubscribe`
- Notification dispatch pipeline:
  - `/api/cron/dispatch-notifications` uses `notification_jobs` + `notification_log`

## What we will keep
- Keep the PWA service worker and web push for web-only users.
- Keep `android-webview/` as deprecated (no deletion), but we will not extend it.
- Keep all existing Next.js + Supabase auth flows and URLs.

## What we will add/replace
- Add Capacitor Android wrapper (Live Web) and Android local notifications.
- Add device heartbeat + capability gating so that:
  - Android app users do NOT receive web push.
  - Web users keep web push.

## Risks & notes
- WebView auth cookies: use production URL in Capacitor Live Web to preserve auth cookies and Supabase session.
- Duplicate notifications: must disable web push when Android app is active (device heartbeat).
- Push vs local: local notifications must only run in Capacitor Android environment.
- Service worker remains for web; do NOT register SW in Android WebView/Capacitor.

## Capacitor plugin setup checklist (native build)
- After `npm install`, run `npx cap sync android` to register native plugins.
- Android permissions (already in `android/app/src/main/AndroidManifest.xml`):
  - `android.permission.POST_NOTIFICATIONS` (Android 13+ local notifications)
  - `android.permission.RECORD_AUDIO` (speech dictation)
- Plugins used by the native shell:
  - `@capacitor/local-notifications`
  - `@capacitor-community/speech-recognition`
  - `@capgo/capacitor-social-login`
