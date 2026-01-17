import test from 'node:test';
import assert from 'node:assert/strict';
import { getMedicationDoseTimes, type MedicationDetails } from '../lib/reminders/medication';

test('medication doses respect user timezone', () => {
  const details: MedicationDetails = {
    name: 'Test',
    dose: null,
    personId: null,
    frequencyType: 'once_per_day',
    timesOfDay: ['10:00'],
    startDate: '2026-01-10',
    endDate: '2026-01-10'
  };

  const doses = getMedicationDoseTimes(details, 1, 'Europe/Bucharest');
  assert.equal(doses[0], '2026-01-10T08:00:00.000Z');
});
