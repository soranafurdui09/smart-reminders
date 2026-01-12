import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { getOptionalEnv } from '@/lib/env';

export const runtime = 'nodejs';

const EXAMPLE_INPUTS = [
  'Pay rent on the 1st of every month at 9am, remind me the day before',
  'Every Tuesday and Thursday at 20:00 Andrei should take out the trash',
  'Doctor appointment tomorrow at 3pm, remind me 2 hours before'
];

function buildSystemPrompt() {
  return [
    'You are a strict parser that converts natural language into a reminder JSON.',
    'Return ONLY valid JSON, no prose, no markdown.',
    'Use ISO 8601 with timezone offset for dueAt (e.g. 2026-01-10T09:00:00+02:00).',
    'Use RFC5545 RRULE for recurrenceRule if recurring, otherwise null.',
    'preReminderMinutes is the minutes before dueAt (integer) or null.',
    'assignedMemberId must be one of the provided member ids or null.',
    'If a field is unknown, set it to null.'
  ].join(' ');
}

function normalizeParsed(payload: any, memberIds: Set<string>) {
  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const description = typeof payload?.description === 'string' ? payload.description.trim() : null;
  const dueAt = typeof payload?.dueAt === 'string' ? payload.dueAt.trim() : '';
  const recurrenceRule =
    typeof payload?.recurrenceRule === 'string' && payload.recurrenceRule.trim()
      ? payload.recurrenceRule.trim()
      : null;
  const preReminderMinutes =
    typeof payload?.preReminderMinutes === 'number'
      ? payload.preReminderMinutes
      : typeof payload?.preReminderMinutes === 'string'
        ? Number(payload.preReminderMinutes)
        : null;
  const assignedMemberId =
    typeof payload?.assignedMemberId === 'string' && memberIds.has(payload.assignedMemberId)
      ? payload.assignedMemberId
      : null;

  return {
    title,
    description,
    dueAt,
    recurrenceRule,
    preReminderMinutes: Number.isFinite(preReminderMinutes) ? preReminderMinutes : null,
    assignedMemberId
  };
}

export async function POST(request: Request) {
  const apiKey = getOptionalEnv('OPENAI_API_KEY');
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured.' }, { status: 500 });
  }

  let payload: { text?: string; timezone?: string; householdId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = String(payload.text ?? '').trim();
  const timezone = String(payload.timezone ?? 'UTC').trim() || 'UTC';
  const householdId = String(payload.householdId ?? '').trim();

  if (!text || !householdId) {
    return NextResponse.json({ error: 'Missing text or householdId.' }, { status: 400 });
  }

  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: members } = await supabase
    .from('household_members')
    .select('id, profiles(name, email)')
    .eq('household_id', householdId);

  const memberList = (members ?? []).map((member: any) => ({
    id: member.id,
    name: member.profiles?.name ?? '',
    email: member.profiles?.email ?? ''
  }));
  const memberIds = new Set(memberList.map((member) => member.id));

  const model = getOptionalEnv('OPENAI_MODEL') || 'gpt-4o-mini';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: JSON.stringify({
            text,
            timezone,
            currentTime: new Date().toISOString(),
            householdMembers: memberList,
            examples: EXAMPLE_INPUTS,
            schema: {
              title: 'string',
              description: 'string | null',
              dueAt: 'string (ISO 8601)',
              recurrenceRule: 'string | null',
              preReminderMinutes: 'number | null',
              assignedMemberId: 'string | null'
            }
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ai] parse reminder failed', errorText);
    return NextResponse.json({ error: 'AI request failed.' }, { status: 500 });
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: 'AI response missing content.' }, { status: 500 });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('[ai] invalid json', error);
    return NextResponse.json({ error: 'AI returned invalid JSON.' }, { status: 500 });
  }

  const normalized = normalizeParsed(parsed, memberIds);
  if (!normalized.title || !normalized.dueAt) {
    return NextResponse.json({ error: 'AI could not parse the reminder.' }, { status: 422 });
  }

  return NextResponse.json(normalized);
}
