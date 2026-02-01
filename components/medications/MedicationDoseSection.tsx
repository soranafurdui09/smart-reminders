"use client";

import { useMemo, useState } from 'react';
import MedicationDoseList, { type MedicationDoseRow } from '@/components/medications/MedicationDoseList';

type Labels = {
  taken: string;
  skipped: string;
  skip: string;
  snooze: string;
  skipPrompt: string;
  skipReasonDefault: string;
  pending?: string;
  missed?: string;
  showAll: string;
  showLess: string;
};

export default function MedicationDoseSection({
  doses,
  locale,
  timeZone,
  labels,
  initialVisible = 3
}: {
  doses: MedicationDoseRow[];
  locale: string;
  timeZone: string;
  labels: Labels;
  initialVisible?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const canCollapse = doses.length > initialVisible;
  const visibleDoses = useMemo(
    () => (showAll || !canCollapse ? doses : doses.slice(0, initialVisible)),
    [canCollapse, doses, initialVisible, showAll]
  );

  return (
    <div className="space-y-3">
      <MedicationDoseList
        doses={visibleDoses}
        locale={locale}
        timeZone={timeZone}
        labels={labels}
        variant="compact"
      />
      {canCollapse ? (
        <button
          type="button"
          className="text-xs font-semibold text-[color:rgb(var(--accent))]"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? labels.showLess : `${labels.showAll} (${doses.length})`}
        </button>
      ) : null}
    </div>
  );
}
