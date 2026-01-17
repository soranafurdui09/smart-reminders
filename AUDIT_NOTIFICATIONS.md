# Audit – Notification Dispatch & Time Handling

This audit traces time handling from reminder creation → storage → job seeding → dispatch → send, and identifies timezone risks and the likely cause of the 10:00 → 11:30 medication bug.

## 1) DB Date/Time Fields & Types

**Primary scheduling tables**
- `reminders.due_at` — `timestamptz`
- `reminders.tz` — `text` (per-reminder timezone intent)
- `reminder_occurrences.occur_at` — `timestamptz`
- `reminder_occurrences.snoozed_until` — `timestamptz`
- `notification_jobs.notify_at` — `timestamptz` (actual send time, UTC)
- `notification_jobs.occurrence_at_utc` — `timestamptz` (original occurrence, UTC)
- `notification_jobs.entity_type` — `text` (`reminder` | `medication_dose`)
- `notification_jobs.entity_id` — `uuid`
- `notification_jobs.status` — `text` (`pending` | `processing` | `sent` | `failed` | `skipped`)
- `notification_jobs.claimed_at` — `timestamptz`
- `notification_jobs.claim_token` — `text`
- `notification_jobs.retry_count` — `int`
- `notification_jobs.next_retry_at` — `timestamptz`
- `notification_log.sent_at` — `timestamptz`
- `medication_doses.scheduled_at` — `timestamptz`
- `medication_notification_log.sent_at` — `timestamptz`
- `profiles.time_zone` — `text` (user timezone)

All “fire times” are currently stored as `timestamptz` (UTC intended).

## 2) Where Times Are **Written**

### Manual reminder create
**File:** `app/app/reminders/new/actions.ts`
- Inputs from form:
  - `due_at` (local input string, `YYYY-MM-DDTHH:mm`)
  - `due_at_iso` (ISO with offset, produced client-side)
  - `tz` (client IANA timezone)
- Conversion:
  - `resolveDueAtFromForm()` uses `interpretAsTimeZone(due_at, tz)` to convert local → UTC
  - Stored as `due_at = dueAt.toISOString()`
- Occurrences:
  - `reminder_occurrences.occur_at = dueAt.toISOString()`
- Notification jobs:
  - `scheduleNotificationJobsForReminder()` uses `dueAt.toISOString()`

### AI parsing
**File:** `app/api/ai/parse-reminder/route.ts`
- AI returns `dueAt` in ISO 8601 with offset (prompt enforces it).
**File:** `app/app/reminders/new/ReminderForm.tsx`
- AI `dueAt` converted to local input display; on submit goes through **same** server path as manual.

### Voice dictation
**File:** `app/app/reminders/new/ReminderForm.tsx`
- Voice uses same AI parse + submit path; should follow manual pipeline.

### Medication scheduling
**File:** `lib/reminders/medication.ts`
- Generates dose timestamps → inserts into `medication_doses.scheduled_at`.
- **Prior to fixes**: used `new Date(dateStr + 'T00:00:00Z')` + `setUTCHours()`, effectively interpreting local times as UTC.
- **Impact**: 10:00 local stored as 10:00 UTC (12:00 local in UTC+2).

## 3) Where Times Are **Read/Compared**

### Job seeding
**File:** `app/api/cron/dispatch-notifications/route.ts`
- Seeds from:
  - `reminder_occurrences` where `occur_at` or `snoozed_until` is in window
  - `medication_doses` where `scheduled_at` in window
- Jobs are created **per channel** (`email`, `push`) with:
  - `notify_at` = scheduled send time
  - `occurrence_at_utc` = original occurrence time
  - `entity_type` / `entity_id` for idempotency.

### Dispatch window selection
**File:** `app/api/cron/dispatch-notifications/route.ts`
- Uses **DB time** via `get_utc_now()` to compute window (no server‑timezone drift).
- Claims jobs atomically via SQL function `claim_notification_jobs(...)`.
- Filters due jobs with `notify_at <= now_utc` and honors retry windows.

### UI grouping (today/overdue/upcoming)
**File:** `app/reminders/ReminderDashboardSection.tsx`
- Uses `resolveReminderTimeZone(...)` and `diffDaysInTimeZone(...)` for local grouping.
- If `profiles.time_zone` is not set or is UTC, “today” grouping can be off.

### Medication “today” view
**File:** `lib/reminders/medication.ts`
- `getTodayMedicationDoses()` used UTC day boundaries (`setUTCHours(0/23)`).
- **Risk**: “today” list shifts for non‑UTC users.

## 4) Timezone Conversion Utilities in Use

**File:** `lib/dates.ts`
- `interpretAsTimeZone()` converts local wall time + IANA zone to UTC.
- `formatDateTimeWithTimeZone()`, `diffDaysInTimeZone()`, `coerceDateForTimeZone()`.
- **Risk**: earlier implementation relied on parsing `shortOffset` and manual offsets which can be brittle during DST.

## 5) Likely Root Cause of 10:00 → 11:30 Medication Bug

**Primary cause**
- Medication dose generation treated local times as **UTC** (`setUTCHours`), so:
  - 10:00 local → stored 10:00 UTC → **12:00 local** for UTC+2.

**Why 11:30 instead of 12:00?**
- The app also applies:
  - calendar busy deferral (default 15 min), or
  - pre‑reminder offsets / snooze logic.
- Combined with timezone mismatch, this can land at ~11:30.

Evidence:
- `lib/reminders/medication.ts` used UTC composition for `scheduled_at`.
- Cron uses server `now` without DB time; deferrals can add minutes on top.

## 6) Risks & Gaps

- **Resolved:** cron selection anchored to DB time (`get_utc_now()`).
- **Idempotency**:
  - `notification_log` unique on `(reminder_id, occurrence_at_utc, channel)`.
  - `notification_jobs` unique on `(entity_type, entity_id, occurrence_at_utc, channel)`.
- **Timezone drift**:
  - `profiles.time_zone` exists but is not updated on login.
  - UI grouping & medication “today” queries are UTC‑based.

## 7) Actionable Fixes (to implement)

1) Central timezone conversion (use `date-fns-tz`):
   - All local → UTC conversions go through one shared helper.
2) Medication scheduling in user timezone.
3) “Today” queries using user timezone boundaries.
4) Idempotent log key per occurrence time:
  - `notification_log(reminder_id, occurrence_at_utc, channel)` unique.
5) DB time window for cron (avoid server clock drift).
6) Atomic job claims + retries.
7) Per‑channel jobs (no `channel='both'` rows).

## 8) Files/Modules Involved

**Create/Update**
- `app/app/reminders/new/actions.ts`
- `app/app/reminders/[id]/actions.ts`
- `app/app/reminders/new/ReminderForm.tsx` (client input)

**Medication scheduling**
- `lib/reminders/medication.ts`

**Notification jobs + cron**
- `lib/notifications/jobs.ts`
- `app/api/cron/dispatch-notifications/route.ts`
- `app/api/notifications/action/route.ts`

**Time helpers**
- `lib/dates.ts`
- `lib/time/schedule.ts`

## 9) Staging Verification Checklist

1) Create a manual reminder for 10:00 local and verify stored `due_at` matches expected UTC.
2) Create the same reminder via AI/voice and verify stored `due_at` matches manual.
3) Create a medication schedule (10:00 local), confirm `medication_doses.scheduled_at` aligns with local time.
4) Trigger cron:
   - Confirm jobs are claimed (status `processing`) and then `sent`/`skipped`/`failed`.
   - Confirm `notification_log` row exists with `occurrence_at_utc`.
5) Trigger cron twice:
   - Confirm no duplicate notifications (unique log constraint holds).
6) Force a send failure (remove Resend/VAPID):
   - Confirm job moves to `pending` with `next_retry_at` and increments `retry_count`.
7) Verify calendar busy deferral:
   - Reminder with “avoid meetings” should reschedule `notify_at` without changing `occurrence_at_utc`.
