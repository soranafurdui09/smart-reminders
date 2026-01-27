# Smart Reminder — Project Overview (for AI context)

This document provides a concise but complete overview of the Smart Reminder codebase:
stack, architecture, key features, and where to find the relevant code paths.

---

## 1) Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS + custom utility classes in `app/globals.css`
- **Backend:** Supabase (Postgres + RLS)
- **Notifications:** Web Push (VAPID), Email (Resend), optional Android (Capacitor) local notifications
- **Voice:** Web Speech API via hooks (`useSpeechToText.ts`, `useSpeechToReminder.ts`)
- **AI:** OpenAI (via server route) for natural language reminder parsing
- **Mobile:** Capacitor Android wrapper (WebView); native shell config in `components/NativeAppChrome.tsx`

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
- `/app/reminders/new`
- `/app/reminders/[id]`
- `/app/reminders/[id]/edit`
- `/app/medications`
- `/app/medications/new`
- `/app/medications/[id]`
- `/app/medications/caregiver`
- `/app/you` — user hub (if present)

---

## 3) Data Model (Supabase)

### Core tables
- `profiles` — user profile + preferences (timezone, notify_by_email, notify_by_push)
- `reminders` — reminder records (title, due_at, recurrence, kind, assigned_member_id, tz, context_settings, medication_details)
- `reminder_occurrences` — scheduled occurrences (occur_at, status, snoozed_until)
- `notification_jobs` — notification queue (notify_at, occurrence_at_utc, entity_type/entity_id, channel, status, retry_count, claim_token, etc.)
- `notification_log` — idempotency log for reminder notifications
- `push_subscriptions` — web push subscriptions (endpoint, keys, is_disabled)
- `households`, `household_members` — collaboration
- `reminder_assignments` — assigned recipients per reminder (user_id)

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
  Seeds jobs + sends **email + push**
- **Worker (always‑on):** `worker/index.js`  
  Claims **push** jobs only, sends Web Push (and FCM when enabled)

### Idempotency
- Before sending: insert into `notification_log` / `medication_notification_log`
- On conflict: skip send (no duplicate user notifications)

### Claiming
- `public.claim_notification_jobs(...)`  
  Uses `FOR UPDATE SKIP LOCKED`, sets `status=processing` with `claim_token`

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
- Native Android uses custom scheme:
  - `com.smartreminder.app://auth/callback`
  - handled via `App.addListener('appUrlOpen')` in `components/NativeAppChrome.tsx`
  - browser closed via `Browser.close()` after code exchange
  - IMPORTANT: add `com.smartreminder.app://auth/callback` to Supabase Auth → Redirect URLs allowlist

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

---

## 8) UI Structure

Mobile shell:
- `components/shell/MobileShell.tsx`
- `components/shell/TopBar.tsx`
- `components/shell/BottomNav.tsx`
- `components/shell/Fab.tsx`
- `components/ui/BottomSheet.tsx`

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

---

## 10) Where to change what

- **Notifications logic:** `app/api/cron/dispatch-notifications/route.ts`, `worker/index.js`
- **Push (web):** `lib/push.ts`, `app/api/push/*`
- **FCM (Android):** `lib/push/fcm.ts`, `app/api/push/fcm/*`
- **Reminder creation:** `app/app/reminders/new/ReminderForm.tsx` + `app/app/reminders/new/actions.ts`
- **Assignment:** `lib/reminderAssignments.ts`

---

## 11) Key environment variables

Supabase:
- `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`
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

---

## 12) Reliability Notes

- Jobs use UTC timestamps and are claimed atomically.
- Idempotency enforced in log tables.
- Retry/backoff per job status.
- Caregiver escalation jobs are seeded separately.

---

## 13) Common debug points

- `[cron] dispatch notifications` logs in `route.ts`
- `[worker]` logs in `worker/index.js`
- OAuth callback in `NativeAppChrome.tsx`
- AI parse in `app/api/ai/parse-reminder/route.ts`
