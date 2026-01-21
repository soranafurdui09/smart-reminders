"use client";

import ReminderForm from './ReminderForm';
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
  prefillAiText?: string;
  prefillMode?: 'ai' | 'manual' | 'medication';
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
  prefillAiText,
  prefillMode,
  contextDefaults
}: Props) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{copy.remindersNew.title}</h1>
        <p className="text-sm text-slate-600">{copy.remindersNew.subtitle}</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {copy.remindersNew.error}
        </div>
      ) : null}

      <ReminderForm
        action={action}
        copy={copy}
        householdId={householdId}
        members={members}
        locale={locale}
        autoVoice={autoVoice}
        googleConnected={googleConnected}
        prefillAiText={prefillAiText}
        prefillMode={prefillMode}
        contextDefaults={contextDefaults}
      />
    </div>
  );
}
