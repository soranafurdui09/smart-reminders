"use client";

import { useMemo, useState } from 'react';

type CreatedByOption = 'all' | 'me' | 'others';
type AssignmentOption = 'all' | 'assigned_to_me';

type Props = {
  createdBy: CreatedByOption;
  assignment: AssignmentOption;
  onChangeCreatedBy: (value: CreatedByOption) => void;
  onChangeAssignment: (value: AssignmentOption) => void;
  className?: string;
};

const createdOptions: { value: CreatedByOption; label: string }[] = [
  { value: 'all', label: 'Toți' },
  { value: 'me', label: 'De mine' },
  { value: 'others', label: 'De altcineva' }
];
const assignmentOptions: { value: AssignmentOption; label: string }[] = [
  { value: 'all', label: 'Toate' },
  { value: 'assigned_to_me', label: 'Asignate mie' }
];

const chipBase =
  'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition focus:outline-none focus-visible:ring focus-visible:ring-sky-300';

export default function ReminderFilterBar({
  createdBy,
  assignment,
  onChangeCreatedBy,
  onChangeAssignment,
  className
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeFilters = useMemo(() => {
    let count = 0;
    if (createdBy !== 'all') count += 1;
    if (assignment !== 'all') count += 1;
    return count;
  }, [createdBy, assignment]);
  const isDefault = activeFilters === 0;

  const renderChip = (
    value: string,
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      key={value}
      type="button"
      className={`${chipBase} ${active ? 'bg-sky-500 border-sky-500 text-white shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
      onClick={onClick}
    >
      {label}
    </button>
  );

  const filterSection = (
    <div className="space-y-3">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Creat de</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {createdOptions.map((option) => renderChip(option.value, option.label, createdBy === option.value, () => onChangeCreatedBy(option.value)))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Asignare</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {assignmentOptions.map((option) =>
            renderChip(option.value, option.label, assignment === option.value, () => onChangeAssignment(option.value))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`rounded-2xl bg-white/60 border border-slate-100 px-4 py-3 shadow-sm md:flex md:items-center md:justify-between md:gap-4 ${className ||
          ''}`}
      >
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg border border-slate-200 bg-white/80 p-2 text-slate-700">
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M6 12h11M9 18h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="text-sm font-semibold text-slate-900">Filtre</div>
        </div>
        <div className="hidden md:flex md:flex-1 md:flex-col md:gap-4">{filterSection}</div>
        {!isDefault && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
            onClick={() => {
              onChangeCreatedBy('all');
              onChangeAssignment('all');
            }}
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Clear filters
          </button>
        )}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          Filtre
          {activeFilters > 0 ? ` (${activeFilters} active${activeFilters > 1 ? 's' : ''})` : ''}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40 md:hidden">
          <div className="w-full rounded-t-3xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Filtre</div>
              <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => setMobileOpen(false)}>
                Închide
              </button>
            </div>
            <div className="mt-4 space-y-4">{filterSection}</div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={isDefault}
                className="text-xs font-semibold text-slate-500 disabled:text-slate-300"
                onClick={() => {
                  onChangeCreatedBy('all');
                  onChangeAssignment('all');
                }}
              >
                Clear filters
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
