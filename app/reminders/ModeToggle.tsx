"use client";

type Props = {
  value: 'family' | 'focus';
  onChange: (value: 'family' | 'focus') => void;
};

export default function ModeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-[11px]">
      <button
        type="button"
        className={`rounded-full px-3 py-1 transition ${value === 'family' ? 'bg-white/10 text-white' : 'text-white/60'}`}
        onClick={() => onChange('family')}
      >
        Family
      </button>
      <button
        type="button"
        className={`rounded-full px-3 py-1 transition ${value === 'focus' ? 'bg-white/10 text-white' : 'text-white/60'}`}
        onClick={() => onChange('focus')}
      >
        Focus
      </button>
    </div>
  );
}
