'use client';

import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const getPermissionGranted = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if ('granted' in record) return Boolean(record.granted);
  if ('state' in record) return record.state === 'granted';
  if ('permission' in record) return record.permission === 'granted';
  if ('speechRecognition' in record) return record.speechRecognition === 'granted';
  return false;
};

export async function isSpeechAvailable() {
  if (!isNativeAndroid()) return false;
  if (!Capacitor.isPluginAvailable('SpeechRecognition')) return false;
  const result = await SpeechRecognition.available();
  return Boolean(result?.available);
}

export async function requestSpeechPermission() {
  if (!isNativeAndroid()) return false;
  const api = SpeechRecognition as unknown as {
    requestPermission?: () => Promise<unknown>;
    requestPermissions?: () => Promise<unknown>;
    hasPermission?: () => Promise<unknown>;
  };
  if (api.requestPermission) {
    return getPermissionGranted(await api.requestPermission());
  }
  if (api.requestPermissions) {
    return getPermissionGranted(await api.requestPermissions());
  }
  if (api.hasPermission) {
    return getPermissionGranted(await api.hasPermission());
  }
  return false;
}

export async function startDictation(lang: string): Promise<string> {
  if (!isNativeAndroid()) {
    throw new Error('not-supported');
  }
  if (!Capacitor.isPluginAvailable('SpeechRecognition')) {
    throw new Error('not-supported');
  }
  const available = await SpeechRecognition.available();
  if (!available?.available) {
    throw new Error('not-supported');
  }
  const granted = await requestSpeechPermission();
  if (!granted) {
    throw new Error('not-allowed');
  }
  const result = await SpeechRecognition.start({
    language: lang,
    partialResults: false,
    popup: false,
    maxResults: 1
  });
  const transcript = Array.isArray(result?.matches) ? result.matches[0] ?? '' : '';
  return transcript.trim();
}

export async function stopDictation() {
  if (!isNativeAndroid()) return;
  if (!Capacitor.isPluginAvailable('SpeechRecognition')) return;
  try {
    await SpeechRecognition.stop();
  } catch {
    // ignore stop errors
  }
}
