"use client";

import { useCallback, useEffect, useState } from 'react';
import { isNativeAndroidApp } from '@/lib/native/localNotifications';
import {
  getSpeechPermissionStatus,
  isSpeechAvailable,
  isSpeechPluginAvailable,
  requestSpeechPermission,
  startDictation,
  stopDictation
} from '@/lib/native/speechRecognition';

type Availability = 'yes' | 'no' | 'unknown';

export default function NativeSpeechDebug() {
  const [pluginAvailable, setPluginAvailable] = useState(false);
  const [permission, setPermission] = useState('unknown');
  const [available, setAvailable] = useState<Availability>('unknown');
  const [status, setStatus] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const refresh = useCallback(async () => {
    if (!isNativeAndroidApp()) return;
    const plugin = isSpeechPluginAvailable();
    setPluginAvailable(plugin);
    if (!plugin) {
      setPermission('missing');
      setAvailable('no');
      return;
    }
    const permissionStatus = await getSpeechPermissionStatus();
    setPermission(permissionStatus);
    try {
      const isAvailable = await isSpeechAvailable();
      setAvailable(isAvailable ? 'yes' : 'no');
    } catch {
      setAvailable('unknown');
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!isNativeAndroidApp()) return;
    void refresh();
  }, [refresh]);

  if (process.env.NODE_ENV === 'production') return null;
  if (!isNativeAndroidApp()) return null;

  const handlePermission = async () => {
    setStatus(null);
    if (!isSpeechPluginAvailable()) {
      setStatus('Plugin-ul de dictare lipsește.');
      setPermission('missing');
      return;
    }
    try {
      const granted = await requestSpeechPermission();
      setPermission(granted ? 'granted' : 'denied');
      setStatus(granted ? 'Permisiunea pentru microfon este acordată.' : 'Permisiunea a fost respinsă.');
    } catch (error) {
      console.error('[native][speech] permission failed', error);
      setStatus('Cererea de permisiune a eșuat.');
    }
  };

  const handleTestDictation = async () => {
    setStatus(null);
    if (!isSpeechPluginAvailable()) {
      setStatus('Plugin-ul de dictare lipsește.');
      setPermission('missing');
      return;
    }
    setListening(true);
    try {
      const transcript = await startDictation('ro-RO');
      const length = transcript.length;
      setStatus(length > 0 ? `Dictare OK (len=${length}).` : 'Nu s-a detectat text.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      if (message === 'not-allowed') {
        setStatus('Permisiunea pentru microfon este respinsă.');
      } else if (message === 'not-supported') {
        setStatus('Dictarea vocală nu este disponibilă.');
      } else if (message === 'plugin-missing') {
        setStatus('Plugin-ul de dictare lipsește.');
      } else {
        setStatus('Test dictare eșuat.');
      }
      console.error('[native][speech] test dictation failed', error);
    } finally {
      setListening(false);
      try {
        await stopDictation();
      } catch {
        // ignore stop errors
      }
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <div className="font-semibold">Debug (native)</div>
      <div className="mt-1 text-[11px] text-slate-500">
        Speech plugin: {pluginAvailable ? 'available' : 'missing'}
      </div>
      <div className="text-[11px] text-slate-500">Speech permission: {permission}</div>
      <div className="text-[11px] text-slate-500">Speech available: {available}</div>
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          onClick={handlePermission}
        >
          Request microphone permission
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
          onClick={handleTestDictation}
          disabled={listening}
        >
          {listening ? 'Listening…' : 'Test dictation (native)'}
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          onClick={refresh}
        >
          Refresh speech status
        </button>
      </div>
      {status ? <div className="mt-2 text-xs text-slate-600">{status}</div> : null}
    </div>
  );
}
