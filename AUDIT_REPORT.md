# Notification & Timezone Audit Report

Scope: Reminder creation (manual + AI), medication scheduling, notification jobs, cron dispatch, UI grouping.

## 1) DB Schema: Date/Time Columns
- `reminders.due_at`: `timestamptz`
- `reminder_occurrences.occur_at`: `timestamptz`
- `reminder_occurrences.snoozed_until`: `timestamptz`
- `notification_log.sent_at`: `timestamptz`
- `medication_doses.scheduled_at`: `timestamptz`
- `medication_notification_log.sent_at`: `timestamptz`
- `notification_jobs.notify_at`: `timestamptz`
- `profiles.time_zone`: `text` (default `'UTC'`)
- `reminders.tz`: `text` (per-reminder timezone)

All core scheduling fields are `timestamptz` (UTC storage is expected).

## 2) Create / Update Flows (Manual + AI)
### Manual form
- `ReminderForm.tsx` posts:
  - `due_at` = local input string `YYYY-MM-DDTHH:mm`
  - `due_at_iso` = local ISO with offset via `toIsoFromLocalInput()`
  - `tz` = `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Server actions `app/app/reminders/new/actions.ts` and `/reminders/[id]/actions.ts` call:
  - `resolveDueAtFromForm(dueAtIso, dueAtRaw, tz)`
  - if `dueAtRaw` + `tz`, uses `interpretAsTimeZone()` to convert local → UTC.
  - stored as `due_at = dueAt.toISOString()`.

### AI parsing
- `/api/ai/parse-reminder` instructs model to return ISO 8601 with timezone offset.
- UI converts AI `dueAt` to local input value using `toLocalInputValueFromAi()`.
- Submit path is identical to manual (same `due_at` + `tz` fields).

## 3) Medication Scheduling
- `lib/reminders/medication.ts` currently:
  - Builds dates using `new Date(\`\${dateStr}T00:00:00Z\`)` and `setUTCHours(...)`.
  - This treats the provided time as UTC, not the user’s local timezone.
  - `getTodayMedicationDoses()` uses UTC day boundaries (`setUTCHours(0/23)`).

### Risk
Medication dose generation and “today” queries are anchored to UTC rather than user timezone → can produce shifted notification times and wrong “today” buckets (e.g., 10:00 local becomes 12:00 local in UTC+2).

## 4) Notification Pipeline
### Outbox
- `notification_jobs` entries are created by:
  - `scheduleNotificationJobsForReminder` (uses `dueAt.toISOString()`).
  - `scheduleNotificationJobsForMedication` (uses `scheduled_at` from medication_doses).
  - Cron seeding uses reminder_occurrences + medication_doses in a moving time window.

### Cron
- `/api/cron/dispatch-notifications`:
  - Uses `now.toISOString()` and a 15-minute window, plus a +/- 14h fetch range.
  - Reads jobs in `[fetchStart, fetchEnd]`, then filters in-memory for `[windowStart, now]`.
  - Uses user/profile timezone for display and context checks.
  - Logs sent in `notification_log` / `medication_notification_log` with unique constraint on occurrence/dose + channel.

### Risks
- Idempotency currently relies on `notification_jobs.status` + unique on `notification_log(reminder_occurrence_id, channel)`.
- For snoozed occurrences or recurring reminders, the same occurrence ID may be reused with new notify times.
  - This can block re-sends if a new send should be logged but the unique constraint is still on `reminder_occurrence_id`.
- Medication uses `medication_notification_log` unique per dose, which is OK if doses are correct.

## 5) Timezone Utility Functions
- `lib/dates.ts`:
  - Uses `Intl.DateTimeFormat(... timeZoneName: 'shortOffset')` to get offsets.
  - `interpretAsTimeZone()` computes UTC by subtracting the offset of a “guessed” UTC time.
  - Risks:
    - DST edge cases (ambiguous/non-existent local times).
    - Offset parsing fallback returns `0` if unsupported, potentially miscomputing UTC.
- UI grouping (`ReminderDashboardSection`) uses `diffDaysInTimeZone()` and `coerceDateForTimeZone()`; correctness depends on `time_zone` being set.

## 6) Missing / Inconsistent Profile Timezone
- `profiles.time_zone` exists but there is no visible update on login or via settings.
- If left as `'UTC'`, UI “today / overdue” grouping and next reminder logic can be off.

## 7) Likely Root Cause for 10:00 → 11:30 Medication Bug
1) Medication dose generation treats local times as UTC (`setUTCHours`).
2) Cron + UI display uses user timezone, leading to a visible shift (e.g., +2h).
3) Additional snooze/context logic can add extra minutes (15–30), producing 10:00 → 11:30 symptom.

## 8) Recommendations (to be implemented)
1) **Canonical timezone conversion helper** (use `date-fns-tz` or Luxon).
2) **Medication scheduling** should interpret local `timesOfDay` in user timezone and store UTC.
3) **Today / grouping** should use user timezone in medication queries and UI grouping.
4) **Idempotent logging** should key on `(reminder_id, occurrence_at_utc, channel)` to avoid double-sends and allow new sends after snooze.
5) **Profile timezone update** should be set on login/app load to keep UI & cron aligned with user time.

## 9) Staging Verification Checklist
1) Manual reminder at 19:20 local → verify DB `due_at` equals 17:20Z (UTC+2) and UI shows 19:20.
2) AI reminder “mâine la 19:20” → same stored `due_at` as manual (no -2h drift).
3) Medication schedule at 10:00 local → first `medication_doses.scheduled_at` equals 08:00Z (UTC+2).
4) Dashboard “Pentru azi” and “Medicamente azi” use local day boundaries (items appear correctly).
5) Run cron twice in a row → ensure only one `notification_log` per reminder_id + occurrence_at_utc + channel.
6) Snooze a reminder → next notification logs a new entry with a new occurrence_at_utc.
7) Change timezone in OS/browser → app updates `profiles.time_zone` on next load.
