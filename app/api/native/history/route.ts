import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { requireUser } from '@/lib/auth';
import {
  getActionOccurrencesForHousehold,
  getDoneOccurrencesForHouseholdPaged,
  getHouseholdMembers,
  getUserHousehold,
  getUserLocale,
  getUserTimeZone
} from '@/lib/data';
import { getLocaleTag } from '@/lib/i18n';

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
  if (DEV) console.time('[native-history] total');
  const user = await requireUser('/app/history');
  if (DEV) console.time('[native-history] user+context');
  const [locale, userTimeZone, membership] = await Promise.all([
    getUserLocale(user.id),
    getUserTimeZone(user.id),
    getUserHousehold(user.id)
  ]);
  if (DEV) console.timeEnd('[native-history] user+context');

  if (!membership?.households) {
    if (DEV) console.timeEnd('[native-history] total');
    return jsonNoStore({
      ok: false,
      reason: 'no-household',
      locale,
      localeTag: getLocaleTag(locale),
      user: { id: user.id, email: user.email }
    });
  }

  const householdId = membership.households.id;
  const rangeDays = 7;
  const cutoffIso = addDays(new Date(), -rangeDays).toISOString();
  const pageSize = 40;
  if (DEV) console.time('[native-history] household data');
  const membersPromise = getHouseholdMembers(householdId);
  const donePromise = getDoneOccurrencesForHouseholdPaged({
    householdId,
    limit: pageSize,
    offset: 0,
    startIso: cutoffIso
  });
  const actionPromise = getActionOccurrencesForHousehold(householdId, ['done', 'snoozed'], cutoffIso);
  const [members, doneResult, actionOccurrences] = await Promise.all([
    membersPromise,
    donePromise,
    actionPromise
  ]);
  if (DEV) console.timeEnd('[native-history] household data');

  const memberLabelMap = new Map(
    members.map((member: any) => [
      member.user_id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const memberLabels = members.reduce<Record<string, string>>((acc, member: any) => {
    acc[member.user_id] = member.profiles?.name || member.profiles?.email || member.user_id;
    return acc;
  }, {});
  const statsMap = new Map<string, { done: number; snoozed: number }>();
  actionOccurrences.forEach((occurrence) => {
    if (!occurrence.performed_by) {
      return;
    }
    const current = statsMap.get(occurrence.performed_by) ?? { done: 0, snoozed: 0 };
    if (occurrence.status === 'done') {
      current.done += 1;
    }
    if (occurrence.status === 'snoozed') {
      current.snoozed += 1;
    }
    statsMap.set(occurrence.performed_by, current);
  });
  const statsRows = members.map((member: any) => {
    const label = memberLabelMap.get(member.user_id) || 'U';
    const initial = String(label || 'U').charAt(0).toUpperCase();
    const counts = statsMap.get(member.user_id) ?? { done: 0, snoozed: 0 };
    return { id: member.user_id, label, initial, counts };
  });
  const hasStats = statsRows.some((row) => row.counts.done > 0 || row.counts.snoozed > 0);

  if (DEV) console.timeEnd('[native-history] total');
  return jsonNoStore({
    ok: true,
    locale,
    localeTag: getLocaleTag(locale),
    user: { id: user.id, email: user.email },
    userTimeZone,
    householdId,
    rangeDays,
    items: doneResult.items,
    hasMore: doneResult.hasMore,
    memberLabels,
    statsRows,
    hasStats
  });
}
