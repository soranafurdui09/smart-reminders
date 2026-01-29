'use client';

import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const isSpeechPluginAvailable = () => isNativeAndroid() && Capacitor.isPluginAvailable('SpeechRecognition');

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
  if (!isSpeechPluginAvailable()) return false;
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
    const result = await api.requestPermission();
    console.log('[native][speech] permission result', result);
    return getPermissionGranted(result);
  }
  if (api.requestPermissions) {
    const result = await api.requestPermissions();
    console.log('[native][speech] permissions result', result);
    return getPermissionGranted(result);
  }
  if (api.hasPermission) {
    const result = await api.hasPermission();
    console.log('[native][speech] permission status', result);
    return getPermissionGranted(result);
  }
  return false;
}

export async function startDictation(lang: string): Promise<string> {
  if (!isNativeAndroid()) {
    throw new Error('not-supported');
  }
  if (!isSpeechPluginAvailable()) {
    console.warn('[native][speech] plugin missing');
    throw new Error('plugin-missing');
  }
  const granted = await requestSpeechPermission();
  if (!granted) {
    throw new Error('not-allowed');
  }
  const available = await SpeechRecognition.available();
  console.log('[native][speech] available', available);
  if (!available?.available) {
    throw new Error('not-supported');
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
