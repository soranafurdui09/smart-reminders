"use client";

import { useMemo, useState } from 'react';

function toLocalIsoWithOffset(date: Date) {
  const pad = (value: number) => String(Math.floor(Math.abs(value))).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetMins = pad(Math.abs(offsetMinutes) % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

function toIsoFromLocalInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toLocalIsoWithOffset(date);
}

export default function DateTimeLocalField({
  name,
  defaultValue,
  className
}: {
  name: string;
  defaultValue?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const isoValue = useMemo(() => (value ? toIsoFromLocalInput(value) : ''), [value]);

  return (
    <>
      <input
        name={name}
        type="datetime-local"
        className={className}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <input type="hidden" name={`${name}_iso`} value={isoValue} />
    </>
  );
}
