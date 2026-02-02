"use client";

import { useMemo } from 'react';
import { reminderCategories, type ReminderCategoryId } from '@/lib/categories';
import SegmentedControl from '@/components/filters/SegmentedControl';
import FilterChip from '@/components/filters/FilterChip';

type CreatedByOption = 'all' | 'me' | 'others';
type AssignmentOption = 'all' | 'assigned_to_me';
type CategoryOption = 'all' | ReminderCategoryId;

type Props = {
  createdBy: CreatedByOption;
  assignment: AssignmentOption;
  category: CategoryOption;
  onChangeCreatedBy: (value: CreatedByOption) => void;
  onChangeAssignment: (value: AssignmentOption) => void;
  onChangeCategory: (value: CategoryOption) => void;
  className?: string;
  showHeader?: boolean;
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
const categoryOptions: { value: CategoryOption; label: string; color?: string }[] = [
  { value: 'all', label: 'Toate' },
  ...reminderCategories.map((category) => ({
    value: category.id,
    label: category.label,
    color: category.color
  }))
];

export default function ReminderFilterBar({
  createdBy,
  assignment,
  category,
  onChangeCreatedBy,
  onChangeAssignment,
  onChangeCategory,
  className,
  showHeader = true
}: Props) {
  const activeFilters = useMemo(() => {
    let count = 0;
    if (createdBy !== 'all') count += 1;
    if (assignment !== 'all') count += 1;
    if (category !== 'all') count += 1;
    return count;
  }, [createdBy, assignment, category]);
  const isDefault = activeFilters === 0;
  const handleReset = () => {
    onChangeCreatedBy('all');
    onChangeAssignment('all');
    onChangeCategory('all');
  };

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white/70 px-4 py-4 shadow-sm ${className ?? ''}`}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
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
            <div className="text-sm font-semibold">Filtre</div>
            {activeFilters > 0 ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                {activeFilters}
              </span>
            ) : null}
          </div>
          {!isDefault ? (
            <button
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              onClick={handleReset}
            >
              Șterge filtrele
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={`${showHeader ? 'mt-4' : ''} space-y-5`}>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creat de</div>
          <SegmentedControl
            options={createdOptions}
            value={createdBy}
            onChange={(value) => onChangeCreatedBy(value as CreatedByOption)}
            className="mt-2"
          />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Asignare</div>
          <SegmentedControl
            options={assignmentOptions}
            value={assignment}
            onChange={(value) => onChangeAssignment(value as AssignmentOption)}
            className="mt-2"
          />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categorie</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {categoryOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={category === option.value}
                color={option.color}
                onToggle={() => onChangeCategory(option.value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
