import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMedicationDoseInstances, type MedicationRecord, type MedicationScheduleInput } from '../lib/reminders/medication';
import { parseLocalTimeToUtc } from '../lib/time/schedule';

const baseMedication: MedicationRecord = {
  id: 'med-1',
  reminder_id: 'rem-1',
  household_id: 'house-1',
  created_by: 'user-1',
  patient_member_id: null,
  name: 'Test',
  timezone: 'Europe/Bucharest',
  is_active: true
};

test('parseLocalTimeToUtc keeps local intent (Bucharest winter)', () => {
  const utc = parseLocalTimeToUtc('2026-01-10', '10:00', 'Europe/Bucharest');
  assert.equal(utc.toISOString(), '2026-01-10T08:00:00.000Z');
});

test('parseLocalTimeToUtc handles DST shift (Bucharest summer)', () => {
  const utc = parseLocalTimeToUtc('2026-07-10', '10:00', 'Europe/Bucharest');
  assert.equal(utc.toISOString(), '2026-07-10T07:00:00.000Z');
});

test('buildMedicationDoseInstances uses local times for daily schedules', () => {
  const schedule: MedicationScheduleInput = {
    schedule_type: 'daily',
    times_local: ['10:00'],
    start_date: '2026-01-10',
    end_date: '2026-01-10',
    reminder_window_minutes: 60,
    allow_snooze: true
  };

  const doses = buildMedicationDoseInstances({
    medication: baseMedication,
    schedule,
    horizonDays: 1,
    timeZone: 'Europe/Bucharest'
  });

  assert.equal(doses.length, 1);
  assert.equal(doses[0].scheduled_at, '2026-01-10T08:00:00.000Z');
  assert.equal(doses[0].scheduled_local_date, '2026-01-10');
  assert.equal(doses[0].scheduled_local_time, '10:00');
});
