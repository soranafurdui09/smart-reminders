import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl, sendEmail } from '@/lib/notifications';
import { sendPushNotification } from '@/lib/push';
import { reminderEmailTemplate } from '@/lib/templates';

export const runtime = 'nodejs';

export async function GET() {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: occurrences, error } = await admin
    .from('reminder_occurrences')
    .select('id, occur_at, snoozed_until, status, reminder:reminders(id, title, household_id, is_active)')
    // Notification flow: use snoozed_until as the effective due time when present.
    .or(
      `and(status.eq.snoozed,snoozed_until.lte.${nowIso}),and(status.eq.open,occur_at.lte.${nowIso})`
    );

  if (error) {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  for (const occurrence of occurrences ?? []) {
    const reminder = Array.isArray(occurrence.reminder) ? occurrence.reminder[0] : occurrence.reminder;
    if (!reminder?.household_id || !reminder?.is_active) {
      continue;
    }

    const effectiveAt = occurrence.snoozed_until ?? occurrence.occur_at;
    const { data: insertData, error: insertError } = await admin
      .from('notification_log')
      .insert({
        reminder_occurrence_id: occurrence.id,
        channel: 'email',
        status: 'sent'
      })
      .select('id')
      .single();

    if (insertError || !insertData) {
      continue;
    }

    const { data: memberIds } = await admin
      .from('household_members')
      .select('user_id')
      .eq('household_id', reminder.household_id);

    const userIds = (memberIds ?? []).map((item) => item.user_id);
    if (!userIds.length) {
      await admin
        .from('notification_log')
        .update({ status: 'skipped' })
        .eq('id', insertData.id);
      continue;
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('email')
      .in('user_id', userIds);

    const emails = (profiles ?? []).map((profile) => profile.email).filter(Boolean) as string[];
    if (!emails.length) {
      await admin
        .from('notification_log')
        .update({ status: 'skipped' })
        .eq('id', insertData.id);
      continue;
    }

    const html = reminderEmailTemplate({
      title: reminder.title,
      occurAt: format(new Date(effectiveAt), 'dd MMM yyyy HH:mm')
    });

    let finalStatus: 'sent' | 'skipped' | 'failed' = 'sent';
    for (const email of emails) {
      const result = await sendEmail({
        to: email,
        subject: `Reminder: ${reminder.title}`,
        html
      });
      if (result.status === 'skipped') {
        console.log('Resend not configured, skipping email notifications.');
        finalStatus = 'skipped';
        break;
      }
      if (result.status === 'failed') {
        finalStatus = 'failed';
        break;
      }
    }

    await admin
      .from('notification_log')
      .update({
        status: finalStatus,
        sent_at: finalStatus === 'sent' ? now.toISOString() : null
      })
      .eq('id', insertData.id);

    const { data: pushLog, error: pushLogError } = await admin
      .from('notification_log')
      .insert({
        reminder_occurrence_id: occurrence.id,
        channel: 'push',
        status: 'sent'
      })
      .select('id')
      .single();

    if (pushLogError || !pushLog) {
      continue;
    }

    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', userIds);

    if (!subscriptions?.length) {
      await admin
        .from('notification_log')
        .update({ status: 'skipped' })
        .eq('id', pushLog.id);
      continue;
    }

    const payload = {
      title: reminder.title,
      body: `Scadenta: ${format(new Date(effectiveAt), 'dd MMM yyyy HH:mm')}`,
      url: `${getAppUrl()}/app`
    };

    const pushResult = await sendPushNotification(subscriptions, payload);

    if (pushResult.staleEndpoints.length) {
      await admin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', pushResult.staleEndpoints);
    }

    await admin
      .from('notification_log')
      .update({
        status: pushResult.status,
        sent_at: pushResult.status === 'sent' ? now.toISOString() : null
      })
      .eq('id', pushLog.id);
  }

  return NextResponse.json({ ok: true, processed: occurrences?.length ?? 0 });
}
