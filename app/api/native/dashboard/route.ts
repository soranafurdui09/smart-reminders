import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import {
  getHouseholdMembers,
  getOpenOccurrencesForHousehold,
  getUserHousehold,
  getUserLocale,
  getUserTimeZone
} from '@/lib/data';
import { getUserGoogleConnection } from '@/lib/google/calendar';
import { getLocaleTag } from '@/lib/i18n';
import { getTodayMedicationDoses } from '@/lib/reminders/medication';

const jsonNoStore = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...(init?.headers ?? {})
    }
  });

export async function GET() {
  const DEV = process.env.NODE_ENV !== 'production';
  if (DEV) console.time('[native-dashboard] total');
  const user = await requireUser('/app');
  if (DEV) console.time('[native-dashboard] user+context');
  const [locale, userTimeZone, membership, googleConnection] = await Promise.all([
    getUserLocale(user.id),
    getUserTimeZone(user.id),
    getUserHousehold(user.id),
    getUserGoogleConnection(user.id)
  ]);
  if (DEV) console.timeEnd('[native-dashboard] user+context');

  if (!membership?.households) {
    if (DEV) console.timeEnd('[native-dashboard] total');
    return jsonNoStore({
      ok: false,
      reason: 'no-household',
      locale,
      localeTag: getLocaleTag(locale),
      user: { id: user.id, email: user.email }
    });
  }

  const householdId = membership.households.id;
  if (DEV) console.time('[native-dashboard] household data');
  const [occurrencesAll, members, medicationDoses] = await Promise.all([
    getOpenOccurrencesForHousehold(householdId),
    getHouseholdMembers(householdId),
    getTodayMedicationDoses(householdId, new Date(), userTimeZone)
  ]);
  if (DEV) console.timeEnd('[native-dashboard] household data');

  const memberMap = new Map(
    members.map((member: any) => [
      member.id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const memberUserMap = new Map(
    members.map((member: any) => [
      member.user_id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const memberLabels = members.reduce<Record<string, string>>((acc, member: any) => {
    acc[member.id] = member.profiles?.name || member.profiles?.email || member.user_id;
    return acc;
  }, {});
  const occurrences = occurrencesAll
    .filter((occurrence) => occurrence.reminder?.is_active)
    .map((occurrence) => {
      const effectiveAt = occurrence.snoozed_until ?? occurrence.occur_at;
      const assignedId = occurrence.reminder?.assigned_member_id;
      const performedBy = occurrence.performed_by;
      const performedByLabel = performedBy ? memberUserMap.get(performedBy) : null;
      if (!assignedId) {
        return performedByLabel
          ? { ...occurrence, performed_by_label: performedByLabel, effective_at: effectiveAt }
          : { ...occurrence, effective_at: effectiveAt };
      }
      const label = memberMap.get(assignedId);
      const base = {
        ...occurrence,
        effective_at: effectiveAt,
        reminder: label
          ? { ...occurrence.reminder, assigned_member_label: label }
          : occurrence.reminder
      };
      return performedByLabel ? { ...base, performed_by_label: performedByLabel } : base;
    });

  if (DEV) console.timeEnd('[native-dashboard] total');
  return jsonNoStore({
    ok: true,
    locale,
    localeTag: getLocaleTag(locale),
    user: { id: user.id, email: user.email },
    membershipId: membership.id,
    householdId,
    userTimeZone,
    googleConnected: Boolean(googleConnection),
    memberLabels,
    medicationDoses,
    occurrences
  });
}
