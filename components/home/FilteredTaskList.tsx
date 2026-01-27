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
      <div className="premium-card p-[var(--space-3)] text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-[var(--space-2)]">
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
