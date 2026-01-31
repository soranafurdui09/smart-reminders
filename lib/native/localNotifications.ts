'use client';

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { notificationIdFromKey } from '@/lib/native/notificationIds';

const LAST_SYNC_KEY = 'local-notifications:last-sync';
const DEVICE_ID_KEY = 'native-device-id';
const RESYNC_MIN_INTERVAL_MS = 20 * 1000;
const RESYNC_ON_RESUME_MS = 12 * 60 * 60 * 1000;
const HEARTBEAT_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REMINDER_CHANNEL_ID = 'reminders';
const MAX_LOCAL_NOTIFICATIONS = 300;

type UpcomingNotificationItem = {
  job_key: string;
  reminder_id: string;
  title: string;
  body: string;
  occurrence_at_utc: string;
  timezone?: string | null;
};

export function isNativeAndroidApp() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function ensureNotificationChannel() {
  if (!isNativeAndroidApp()) return;
  try {
    await LocalNotifications.createChannel({
      id: REMINDER_CHANNEL_ID,
      name: 'Reminders',
      description: 'Smart Reminder alerts',
      importance: 5
    });
    console.log('[native] notification channel ready', REMINDER_CHANNEL_ID);
  } catch (error) {
    console.warn('[native] notification channel create failed', error);
  }
}

export async function getOrCreateDeviceId() {
  const existing = await Preferences.get({ key: DEVICE_ID_KEY });
  if (existing.value) return existing.value;
  const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await Preferences.set({ key: DEVICE_ID_KEY, value: next });
  return next;
}

export async function requestPermissionsIfNeeded() {
  if (!isNativeAndroidApp()) return false;
  await ensureNotificationChannel();
  const status = await LocalNotifications.checkPermissions();
  console.log('[native] notification permissions', status);
  try {
    await Preferences.set({ key: 'local-notifications:status', value: status.display });
  } catch {
    // ignore preferences failures
  }
  if (status.display === 'granted') return true;
  const next = await LocalNotifications.requestPermissions();
  console.log('[native] notification permissions result', next);
  try {
    await Preferences.set({ key: 'local-notifications:status', value: next.display });
  } catch {
    // ignore preferences failures
  }
  return next.display === 'granted';
}

export async function cancelAllScheduled() {
  if (!isNativeAndroidApp()) return;
  const pending = await LocalNotifications.getPending();
  if (pending?.notifications?.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
}

export async function sendHeartbeat(force = false) {
  if (!isNativeAndroidApp()) return;
  const lastBeat = await Preferences.get({ key: 'native-heartbeat:last' });
  const lastTs = lastBeat.value ? Number(lastBeat.value) : 0;
  if (!force && Date.now() - lastTs < HEARTBEAT_MIN_INTERVAL_MS) {
    return;
  }
  const deviceId = await getOrCreateDeviceId();
  await fetch('/api/mobile/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, platform: 'android' })
  });
  await Preferences.set({ key: 'native-heartbeat:last', value: String(Date.now()) });
}

async function fetchUpcoming(days = 7): Promise<UpcomingNotificationItem[]> {
  const response = await fetch(`/api/mobile/upcoming-notifications?days=${days}`, {
    credentials: 'include'
  });
  if (response.status === 401) {
    await cancelAllScheduled();
    return [];
  }
  if (!response.ok) {
    throw new Error('Failed to load upcoming notifications');
  }
  const payload = (await response.json()) as UpcomingNotificationItem[];
  return Array.isArray(payload) ? payload : [];
}

export async function scheduleUpcoming(days = 7) {
  if (!isNativeAndroidApp()) return;
  const items = await fetchUpcoming(days);
  const limitedItems = items.slice(0, MAX_LOCAL_NOTIFICATIONS);
  if (items.length > limitedItems.length) {
    console.warn('[native] upcoming notifications capped', {
      total: items.length,
      scheduled: limitedItems.length
    });
  }
  if (!limitedItems.length) {
    return;
  }
  const notifications = limitedItems
    .map((item) => {
      const at = new Date(item.occurrence_at_utc);
      if (Number.isNaN(at.getTime())) {
        return null;
      }
        return {
        id: notificationIdFromKey(item.job_key),
        title: item.title,
        body: item.body,
        channelId: REMINDER_CHANNEL_ID,
        schedule: { at },
        extra: { reminder_id: item.reminder_id, job_key: item.job_key }
      };
    })
    .filter(Boolean) as Array<{
      id: number;
      title: string;
      body: string;
      channelId: string;
      schedule: { at: Date };
      extra: Record<string, string>;
    }>;
  if (!notifications.length) {
    return;
  }
  await LocalNotifications.schedule({ notifications });
}

export async function scheduleTestNotification() {
  if (!isNativeAndroidApp()) return;
  await ensureNotificationChannel();
  const at = new Date(Date.now() + 5000);
  const id = Math.floor(Date.now() % 2147483647);
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Test notification',
          body: 'If you can read this, local notifications work.',
          channelId: REMINDER_CHANNEL_ID,
          schedule: { at }
        }
      ]
    });
    console.log('[native] test notification scheduled', { id, at: at.toISOString() });
  } catch (error) {
    console.error('[native] test notification failed', error);
    throw error;
  }
}

export async function getNotificationPermissionStatus() {
  if (!isNativeAndroidApp()) return 'unavailable';
  try {
    const status = await LocalNotifications.checkPermissions();
    return status.display;
  } catch {
    return 'unknown';
  }
}

export async function resync(days = 7, force = false) {
  if (!isNativeAndroidApp()) return;
  const lastSync = await Preferences.get({ key: LAST_SYNC_KEY });
  const lastTs = lastSync.value ? Number(lastSync.value) : 0;
  if (!force && Date.now() - lastTs < RESYNC_MIN_INTERVAL_MS) {
    return;
  }
  await cancelAllScheduled();
  await scheduleUpcoming(days);
  await Preferences.set({ key: LAST_SYNC_KEY, value: String(Date.now()) });
}

export function setupNotificationTap(onNavigate: (url: string) => void) {
  if (!isNativeAndroidApp()) return;
  LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const reminderId = event.notification?.extra?.reminder_id as string | undefined;
    if (reminderId) {
      onNavigate(`/app/reminders/${reminderId}`);
      return;
    }
    onNavigate('/app');
  });
}

export function setupResumeSync() {
  if (!isNativeAndroidApp()) return;
  App.addListener('appStateChange', async ({ isActive }) => {
    if (!isActive) return;
    await sendHeartbeat();
    const lastSync = await Preferences.get({ key: LAST_SYNC_KEY });
    const lastTs = lastSync.value ? Number(lastSync.value) : 0;
    if (Date.now() - lastTs > RESYNC_ON_RESUME_MS) {
      await resync(7, true);
    }
  });
}
