"use client";

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

type CalendarItem = {
  id: string;
  title: string;
  timeLabel: string;
  href: string;
  color: string;
};

type CalendarDay = {
  key: string;
  label: string;
  dayNumber: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
};

type Props = {
  days: CalendarDay[];
  weekdays: readonly string[];
  emptyLabel: string;
};

export default function CalendarView({ days, weekdays, emptyLabel }: Props) {
  const [activeDay, setActiveDay] = useState<CalendarDay | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {weekdays.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const indicatorCount = Math.min(day.items.length, 3);
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setActiveDay(day)}
              className={`relative flex aspect-square flex-col items-center justify-between rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                day.isCurrentMonth
                  ? 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50'
                  : 'border-slate-100 bg-slate-50 text-slate-400'
              } ${day.isToday ? 'ring-2 ring-sky-200' : ''}`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${day.isToday ? 'bg-sky-500 text-white' : ''}`}>
                {day.dayNumber}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: indicatorCount }).map((_, idx) => (
                  <span
                    key={`${day.key}-dot-${idx}`}
                    className="h-1.5 w-1.5 rounded-full bg-slate-300"
                    aria-hidden="true"
                  />
                ))}
                {day.items.length > indicatorCount ? (
                  <span className="text-[10px] text-slate-400">+{day.items.length - indicatorCount}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {activeDay ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 px-4 pb-[calc(env(safe-area-inset-bottom)_+_16px)]"
          onClick={() => setActiveDay(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-float"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={activeDay.label}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">{activeDay.label}</div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500"
                onClick={() => setActiveDay(null)}
                aria-label="Închide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {activeDay.items.length ? (
                activeDay.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span className="truncate font-medium">{item.title}</span>
                      <span className="text-xs text-slate-500">{item.timeLabel}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  {emptyLabel}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
