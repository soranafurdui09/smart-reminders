"use client";

import { useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import SegmentedControl from '@/components/filters/SegmentedControl';
import FilterChip from '@/components/filters/FilterChip';
import { reminderCategories, type ReminderCategoryId } from '@/lib/categories';
import { type Locale, messages } from '@/lib/i18n';

type CreatedByOption = 'all' | 'me' | 'others';
type AssignmentOption = 'all' | 'assigned_to_me';
type KindFilter = 'all' | 'tasks' | 'medications';
type CategoryOption = 'all' | ReminderCategoryId;

type Props = {
  locale: Locale;
  kindFilter: KindFilter;
  createdBy: CreatedByOption;
  assignment: AssignmentOption;
  category: CategoryOption;
  onChangeKind: (value: KindFilter) => void;
  onChangeCreatedBy: (value: CreatedByOption) => void;
  onChangeAssignment: (value: AssignmentOption) => void;
  onChangeCategory: (value: CategoryOption) => void;
  showKindFilter?: boolean;
};

export default function ReminderFiltersPanel({
  locale,
  kindFilter,
  createdBy,
  assignment,
  category,
  onChangeKind,
  onChangeCreatedBy,
  onChangeAssignment,
  onChangeCategory,
  showKindFilter = true
}: Props) {
  const copy = messages[locale];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (kindFilter !== 'all') count += 1;
    if (createdBy !== 'all') count += 1;
    if (assignment !== 'all') count += 1;
    if (category !== 'all') count += 1;
    return count;
  }, [assignment, category, createdBy, kindFilter]);

  const kindLabel = kindFilter === 'tasks'
    ? copy.dashboard.filtersKindTasks
    : kindFilter === 'medications'
      ? copy.dashboard.filtersKindMeds
      : copy.dashboard.filtersKindAll;
  const createdLabel = createdBy === 'me'
    ? copy.dashboard.filtersCreatedMe
    : createdBy === 'others'
      ? copy.dashboard.filtersCreatedOthers
      : copy.dashboard.filtersCreatedAll;
  const assignmentLabel = assignment === 'assigned_to_me'
    ? copy.dashboard.filtersAssignedMe
    : copy.dashboard.filtersAssignedAll;
  const categoryLabel = category === 'all'
    ? copy.dashboard.filtersCategoryAll
    : reminderCategories.find((item) => item.id === category)?.label ?? copy.dashboard.filtersCategoryAll;

  const summaryParts = useMemo(() => {
    const parts: string[] = [];
    if (kindFilter !== 'all') {
      parts.push(`${copy.dashboard.filtersKindLabel}: ${kindLabel}`);
    }
    if (createdBy !== 'all') {
      parts.push(`${copy.dashboard.filtersCreatedLabel}: ${createdLabel}`);
    }
    if (assignment !== 'all') {
      parts.push(`${copy.dashboard.filtersAssignedLabel}: ${assignmentLabel}`);
    }
    if (category !== 'all') {
      parts.push(`${copy.dashboard.filtersCategoryLabel}: ${categoryLabel}`);
    }
    return parts;
  }, [
    assignment,
    assignmentLabel,
    category,
    categoryLabel,
    copy.dashboard.filtersAssignedLabel,
    copy.dashboard.filtersCategoryLabel,
    copy.dashboard.filtersCreatedLabel,
    copy.dashboard.filtersKindLabel,
    createdBy,
    createdLabel,
    kindFilter,
    kindLabel
  ]);

  const summaryText = activeFilterCount === 0
    ? copy.dashboard.filtersSummaryNone
    : summaryParts.join(' · ');

  const handleReset = () => {
    onChangeKind('all');
    onChangeCreatedBy('all');
    onChangeAssignment('all');
    onChangeCategory('all');
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-full border border-gray-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={() => setFiltersOpen((prev) => !prev)}
        aria-expanded={filtersOpen}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span>{copy.dashboard.filtersTitle}</span>
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500">
          <span className="truncate">{summaryText}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition ${filtersOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {filtersOpen ? (
        <div className="space-y-4 rounded-2xl border border-gray-300 bg-white p-4">
          {showKindFilter ? (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {copy.dashboard.filtersKindLabel}
              </div>
              <SegmentedControl
                options={[
                  { value: 'all', label: copy.dashboard.filtersKindAll },
                  { value: 'tasks', label: copy.dashboard.filtersKindTasks },
                  { value: 'medications', label: copy.dashboard.filtersKindMeds }
                ]}
                value={kindFilter}
                onChange={(value) => onChangeKind(value as KindFilter)}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {copy.dashboard.filtersCreatedLabel}
            </div>
            <SegmentedControl
              options={[
                { value: 'all', label: copy.dashboard.filtersCreatedAll },
                { value: 'me', label: copy.dashboard.filtersCreatedMe },
                { value: 'others', label: copy.dashboard.filtersCreatedOthers }
              ]}
              value={createdBy}
              onChange={(value) => onChangeCreatedBy(value as CreatedByOption)}
            />
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {copy.dashboard.filtersAssignedLabel}
            </div>
            <SegmentedControl
              options={[
                { value: 'all', label: copy.dashboard.filtersAssignedAll },
                { value: 'assigned_to_me', label: copy.dashboard.filtersAssignedMe }
              ]}
              value={assignment}
              onChange={(value) => onChangeAssignment(value as AssignmentOption)}
            />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600"
              onClick={() => setCategoriesOpen((prev) => !prev)}
              aria-expanded={categoriesOpen}
            >
              <span>{copy.dashboard.filtersCategoryLabel}</span>
              <span className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                {category === 'all' ? copy.dashboard.filtersCategoryAll : copy.dashboard.filtersCategorySelected}
                <ChevronDown className={`h-3.5 w-3.5 transition ${categoriesOpen ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {categoriesOpen ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <FilterChip
                  label={copy.dashboard.filtersCategoryAll}
                  selected={category === 'all'}
                  onToggle={() => onChangeCategory('all')}
                  className="text-xs"
                />
                {reminderCategories.map((item) => (
                  <FilterChip
                    key={item.id}
                    label={item.label}
                    selected={category === item.id}
                    onToggle={() => onChangeCategory(item.id)}
                    color={item.color}
                    className="text-xs"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              onClick={handleReset}
            >
              {copy.dashboard.filtersResetLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
