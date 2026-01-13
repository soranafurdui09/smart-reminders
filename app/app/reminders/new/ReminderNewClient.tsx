"use client";

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import ReminderForm, { type ReminderFormVoiceHandle } from './ReminderForm';
import type { SpeechStatus } from '@/hooks/useSpeechToReminder';

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
  error?: string;
  autoVoice?: boolean;
};

export default function ReminderNewClient({
  action,
  copy,
  householdId,
  members,
  locale,
  error,
  autoVoice = false
}: Props) {
  const formRef = useRef<ReminderFormVoiceHandle | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<{ status: SpeechStatus; supported: boolean }>({
    status: 'idle',
    supported: false
  });

  const isListening = voiceStatus.status === 'listening' || voiceStatus.status === 'transcribing';
  const micClasses = useMemo(() => (
    `flex h-10 w-10 items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition hover:border-primary/30 hover:bg-white ${
      isListening ? 'animate-pulse border-primary/40 text-primaryStrong' : ''
    }`
  ), [isListening]);

  const handleMicClick = () => {
    if (!voiceStatus.supported) return;
    if (isListening) {
      formRef.current?.stopVoice();
      return;
    }
    formRef.current?.startVoice();
  };

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
            disabled={!voiceStatus.supported}
            aria-label={copy.remindersNew.voiceNavLabel}
            title={voiceStatus.supported ? copy.remindersNew.voiceNavLabel : copy.remindersNew.voiceNotSupported}
          >
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
        ref={formRef}
        action={action}
        copy={copy}
        householdId={householdId}
        members={members}
        locale={locale}
        autoVoice={autoVoice}
        onVoiceStateChange={setVoiceStatus}
      />

      <button
        className={`fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink shadow-lg transition md:hidden ${
          isListening ? 'animate-pulse border-primary/40 text-primaryStrong' : ''
        }`}
        type="button"
        onClick={handleMicClick}
        aria-label={copy.remindersNew.voiceNavLabel}
        title={voiceStatus.supported ? copy.remindersNew.voiceNavLabel : copy.remindersNew.voiceNotSupported}
        disabled={!voiceStatus.supported}
      >
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
