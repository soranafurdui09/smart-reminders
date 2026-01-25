"use client";

import ReminderRowMobile from '@/components/mobile/ReminderRowMobile';

type Props = {
  items: any[];
  locale: any;
  googleConnected?: boolean;
  userTimeZone?: string;
  emptyLabel: string;
};

export default function FilteredTaskList({
  items,
  locale,
  googleConnected,
  userTimeZone,
  emptyLabel
}: Props) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-500 shadow-sm">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((occurrence) => (
        <ReminderRowMobile
          key={occurrence.id}
          occurrence={occurrence}
          locale={locale}
          googleConnected={googleConnected}
          userTimeZone={userTimeZone}
        />
      ))}
    </div>
  );
}
