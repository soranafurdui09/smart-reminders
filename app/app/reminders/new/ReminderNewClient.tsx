"use client";

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import ReminderForm, { type ReminderFormVoiceHandle } from './ReminderForm';
import type { SpeechStatus } from '@/hooks/useSpeechToReminder';
import type { ContextSettings } from '@/lib/reminders/context';

type MemberOption = {
  id: string;
  label: string;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  copy: any;
  householdId: string;
  members: MemberOption[];
  locale: string;
  googleConnected: boolean;
  error?: string;
  autoVoice?: boolean;
  contextDefaults?: ContextSettings;
};

export default function ReminderNewClient({
  action,
  copy,
  householdId,
  members,
  locale,
  googleConnected,
  error,
  autoVoice = false,
  contextDefaults
}: Props) {
  const formRef = useRef<ReminderFormVoiceHandle | null>(null);
  const pendingStartRef = useRef(false);
  const [voiceStatus, setVoiceStatus] = useState<{ status: SpeechStatus; supported: boolean }>({
    status: 'idle',
    supported: false
  });

  const isListening =
    voiceStatus.status === 'starting' ||
    voiceStatus.status === 'listening' ||
    voiceStatus.status === 'transcribing';
  const isBusy =
    voiceStatus.status === 'starting' ||
    voiceStatus.status === 'processing' ||
    voiceStatus.status === 'parsing' ||
    voiceStatus.status === 'creating';
  const micClasses = useMemo(() => (
    `relative flex h-10 w-10 items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition hover:border-primary/30 hover:bg-white ${
      isListening ? 'border-primary/40 text-primaryStrong' : ''
    }`
  ), [isListening]);

  const handleMicClick = () => {
    if (!voiceStatus.supported || isBusy) return;
    if (isListening) {
      formRef.current?.stopVoice();
      return;
    }
    if (!formRef.current) {
      pendingStartRef.current = true;
      return;
    }
    formRef.current.startVoice();
  };

  const handleFormRef = useCallback((node: ReminderFormVoiceHandle | null) => {
    formRef.current = node;
    if (node && pendingStartRef.current) {
      pendingStartRef.current = false;
      node.startVoice();
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1>{copy.remindersNew.title}</h1>
            <p className="text-sm text-muted">{copy.remindersNew.subtitle}</p>
          </div>
          <button
            className={micClasses}
            type="button"
            onClick={handleMicClick}
            disabled={!voiceStatus.supported || isBusy}
            aria-label={copy.remindersNew.voiceNavLabel}
            aria-pressed={isListening}
            aria-busy={isBusy}
            title={voiceStatus.supported ? copy.remindersNew.voiceNavLabel : copy.remindersNew.voiceNotSupported}
          >
            {isListening ? (
              <span className="absolute -inset-1 rounded-full bg-sky-300/30 animate-ping" aria-hidden="true" />
            ) : null}
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm0 14a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v4"
              />
            </svg>
          </button>
        </div>
        <Link href="/app" className="btn btn-secondary">{copy.common.back}</Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {copy.remindersNew.error}
        </div>
      ) : null}

      <ReminderForm
        ref={handleFormRef}
        action={action}
        copy={copy}
        householdId={householdId}
        members={members}
        locale={locale}
        autoVoice={autoVoice}
        googleConnected={googleConnected}
        contextDefaults={contextDefaults}
        onVoiceStateChange={setVoiceStatus}
      />

      <button
        className={`fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink shadow-lg transition md:hidden relative ${
          isListening ? 'border-primary/40 text-primaryStrong' : ''
        }`}
        type="button"
        onClick={handleMicClick}
        aria-label={copy.remindersNew.voiceNavLabel}
        aria-pressed={isListening}
        aria-busy={isBusy}
        title={voiceStatus.supported ? copy.remindersNew.voiceNavLabel : copy.remindersNew.voiceNotSupported}
        disabled={!voiceStatus.supported || isBusy}
      >
        {isListening ? (
          <span className="absolute -inset-1 rounded-full bg-sky-300/30 animate-ping" aria-hidden="true" />
        ) : null}
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="1.5"
            d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm0 14a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v4"
          />
        </svg>
      </button>
    </div>
  );
}
