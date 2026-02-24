# Smart Reminder — Project Overview (for AI context)

This document provides a concise but complete overview of the Smart Reminder codebase:
stack, architecture, key features, and where to find the relevant code paths.

---

## 0) Latest Features (current)

- Native Android Google auth now uses **server-authoritative `signInWithIdToken`** (`/api/auth/native-idtoken`).
- Capacitor Android shell includes **native chrome + safe-area layout + bottom tabs**.
- Native Android uses **local notification sync** (`/api/mobile/upcoming-notifications`) plus **device heartbeat** (`/api/mobile/heartbeat`) to track active installs.
- Push delivery supports both **Web Push (VAPID)** and **FCM tokens** (`fcm_tokens`) with invalid-token cleanup.
- Added **Tasks & Lists** module with household sharing (`task_lists`, `task_items` + RLS policies).
- Added **billing endpoints/pages** (Stripe checkout, portal, webhook).
- Added **semantic search API** for reminders (`/api/ai/semantic-search`) and embedding backfill function.
- Mobile dashboard/perf updates: client-side tab switching, reduced heavy blur/shadow on mobile, stronger design tokens for readability.

---

## 1) Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS + custom utility classes in `app/globals.css`
- **Backend:** Supabase (Postgres + RLS)
- **Notifications:** Web Push (VAPID), Email (Resend), FCM (Firebase Admin), Android local notifications (Capacitor)
- **Voice:** Web Speech API via hooks (`useSpeechToText.ts`, `useSpeechToReminder.ts`)
- **AI:** OpenAI for reminder parsing + embeddings/semantic search
- **Mobile:** Capacitor Android wrapper (Live WebView) + native shell glue (`components/NativeAppChrome.tsx`, `components/NativeNotificationSync.tsx`)
- **Integrations:** Google Calendar (OAuth + free/busy deferral + event sync), Stripe billing

---

## 2) App Routes (App Router)

Primary routes (keep functional, do not rename):

- `/` — landing
- `/auth` — auth screen
- `/app` — dashboard (tabs via query: `?tab=today` / `?tab=inbox`)
- `/app/calendar`
- `/app/history`
- `/app/household`
- `/app/settings`
- `/app/billing`
- `/app/reminders/new`
- `/app/reminders/[id]`
- `/app/reminders/[id]/edit`
- `/app/medications`
- `/app/medications/new`
- `/app/medications/[id]`
- `/app/medications/caregiver`
- `/app/tasks`
- `/app/lists`
- `/app/lists/[id]`
- `/app/you` — user hub (if present)
- `/native` — native shell debug/status page

Supporting auth/integration routes:
- `/auth/native-start`, `/auth/native-callback`, `/auth/native-session`
- `/api/auth/native-idtoken`
- `/api/integrations/google/calendar/*`
- `/api/billing/checkout`, `/api/billing/portal`, `/api/stripe/webhook`
- `/api/ai/parse-reminder`, `/api/ai/semantic-search`

---

## 3) Data Model (Supabase)

### Core tables
- `profiles` — user profile + preferences (timezone, notify_by_email, notify_by_push)
- `reminders` — reminder records (title, due_at, recurrence, kind, assigned_member_id, tz, context_settings, medication_details)
- `reminder_occurrences` — scheduled occurrences (occur_at, status, snoozed_until)
- `notification_jobs` — notification queue (notify_at, occurrence_at_utc, entity_type/entity_id, channel, status, retry_count, claim_token, etc.)
- `notification_log` — idempotency log for reminder notifications
- `push_subscriptions` — web push subscriptions (endpoint, keys, is_disabled)
- `fcm_tokens` — Android/device FCM tokens (token, platform, is_disabled, last_seen_at)
- `device_installations` — native device heartbeat records (platform, device_id, last_seen_at)
- `households`, `household_members` — collaboration
- `reminder_assignments` — assigned recipients per reminder (user_id)
- `google_calendar_connections`, `google_freebusy_cache` — calendar integration/cache
- `task_lists`, `task_items` — household-shareable tasks/lists

### Medications (extended module)
- `medications`, `medication_schedules`, `medication_stock`
- `medication_doses` — dose instances
- `medication_notification_log` — idempotency for medication notifications
- `medication_caregivers`, `medication_events`

---

## 4) Notification Dispatch (Cron + Worker)

### Job queue
**`notification_jobs`** is the canonical job queue:
- `notify_at` (UTC), `occurrence_at_utc`
- `entity_type` = `reminder` | `medication_dose`
- `channel` = `email` | `push`
- `status` = `pending|processing|sent|failed|skipped`
- `retry_count`, `next_retry_at`, `claimed_at`, `claim_token`

Unique key:  
**`(entity_type, entity_id, occurrence_at_utc, channel, user_id)`**

### Dispatchers
- **Cron (Vercel):** `app/api/cron/dispatch-notifications/route.ts`  
  Seeds jobs + sends **email + push (web + FCM)**
- **Worker (always‑on):** `worker/index.js`  
  Claims **push** jobs only, sends Web Push + FCM

### Idempotency
- Before sending: insert into `notification_log` / `medication_notification_log`
- On conflict: skip send (no duplicate user notifications)

### Claiming
- `public.claim_notification_jobs(...)`  
  Uses `FOR UPDATE SKIP LOCKED`, sets `status=processing` with `claim_token`

### Native Android local notification sync
- Client sync source: `/api/mobile/upcoming-notifications`
- Heartbeat endpoint: `/api/mobile/heartbeat` (updates `device_installations`)
- Capability check endpoint: `/api/me/notification-capabilities`
- Native scheduler: `lib/native/localNotifications.ts`

---

## 5) Reminder Assignment (Assignees)

Assignments are stored in:
- `reminder_assignments (reminder_id, user_id)`

Seeding reminders for notifications should target:
- assignee users **if assignments exist**
- else creator as fallback

Helper: `lib/reminderAssignments.ts`

---

## 6) Authentication & OAuth (Capacitor)

- Google OAuth uses Supabase `signInWithOAuth`.
- Native Android Google login now uses:
  - native Google plugin flow in `lib/auth/nativeGoogleSupabase.ts`
  - server route `app/api/auth/native-idtoken/route.ts`
  - Supabase `signInWithIdToken` (provider `google`) on server
- Native callback listener remains in `components/NativeOAuthListener.tsx`, but Google native auth is ID-token based.

Android intent filter in:
`android/app/src/main/AndroidManifest.xml`

---

## 7) Voice / AI Parsing

### Voice
- Hooks:
  - `useSpeechToText.ts`
  - `useSpeechToReminder.ts`
- Web Speech API, with interim/final handling

### AI Parse
- API: `app/api/ai/parse-reminder/route.ts`
- Client: `ReminderForm` + Quick Add flows

### Semantic Search
- API: `app/api/ai/semantic-search/route.ts`
- Embedding/backfill support: `supabase/functions/backfill-reminder-embeddings/index.ts`

---

## 8) UI Structure

Mobile shell:
- `components/shell/MobileShell.tsx`
- `components/shell/TopBar.tsx`
- `components/shell/BottomNav.tsx`
- `components/shell/Fab.tsx`
- `components/ui/BottomSheet.tsx`
- `components/AppNavigation.tsx` (web vs native nav split)
- `components/NativeAppChrome.tsx` (status bar/splash/keyboard)
- `components/NativeNotificationSync.tsx` (native local notification lifecycle)

Dashboard:
- `app/reminders/ReminderDashboardSection.tsx`
- `components/home/*`

Reminder cards:
- `components/dashboard/ReminderCard.tsx`
- `components/mobile/ReminderRowMobile.tsx`

---

## 9) Styling / Theme Tokens

- Global tokens in `app/globals.css`
- Utility classes: `.card`, `.card-soft`, `.surface-a1`, `.surface-a2`, `.sheet`, `.navbar`, `.icon-btn`, etc.
- Page container: `.page-wrap`
- Mobile perf/theme notes: `docs/PERF_NOTES.md`, `docs/DESIGN_TOKENS.md`

---

## 10) Where to change what

- **Notifications logic:** `app/api/cron/dispatch-notifications/route.ts`, `worker/index.js`
- **Push (web):** `lib/push.ts`, `app/api/push/*`
- **FCM (Android):** `lib/push/fcm.ts`, `app/api/push/fcm/*`
- **Native local notifications:** `lib/native/localNotifications.ts`, `components/NativeNotificationSync.tsx`
- **Native heartbeat/capabilities:** `app/api/mobile/heartbeat/route.ts`, `app/api/me/notification-capabilities/route.ts`
- **Reminder creation:** `app/app/reminders/new/ReminderForm.tsx` + `app/app/reminders/new/actions.ts`
- **Assignment:** `lib/reminderAssignments.ts`
- **Tasks/Lists:** `app/app/tasks/*`, `app/app/lists/*`
- **Billing:** `app/api/billing/*`, `app/api/stripe/webhook/route.ts`, `app/app/billing/page.tsx`
- **Google Calendar:** `lib/google/calendar.ts`, `app/api/integrations/google/calendar/*`
- **Native Google auth:** `components/GoogleOAuthButton.tsx`, `lib/auth/nativeGoogleSupabase.ts`, `app/api/auth/native-idtoken/route.ts`

---

## 11) Key environment variables

Supabase:
- `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

VAPID (Web Push):
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Email (Resend):
- `RESEND_API_KEY`

FCM (Android push):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Google Calendar:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALENDAR_REDIRECT_URL`

Billing:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRICE_ID` (if used in checkout flow)

---

## 12) Reliability Notes

- Jobs use UTC timestamps and are claimed atomically.
- Idempotency enforced in log tables.
- Retry/backoff per job status.
- Caregiver escalation jobs are seeded separately.
- Android local notifications are periodically re-synced from server jobs (with schedule caps).
- FCM/Web Push invalid tokens are pruned during send attempts.

---

## 13) Common debug points

- `[cron] dispatch notifications` logs in `route.ts`
- `[worker]` logs in `worker/index.js`
- Native auth logs: `[native-idtoken]` in `app/api/auth/native-idtoken/route.ts`
- Native sync logs: `[native]` in `components/NativeNotificationSync.tsx` + `lib/native/localNotifications.ts`
- AI parse in `app/api/ai/parse-reminder/route.ts`
