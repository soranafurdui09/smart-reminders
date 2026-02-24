"use client";

type Props = {
  value: 'family' | 'focus';
  onChange: (value: 'family' | 'focus') => void;
};

export default function ModeToggle({ value, onChange }: Props) {
  return (
    <div
      className="flex items-center gap-1 p-1"
      style={{
        background: 'var(--bg-subtle, #1f2035)',
        border: '1px solid var(--border-default, #1e1f35)',
        borderRadius: 'var(--radius-full, 9999px)',
      }}
    >
      <button
        type="button"
        style={value === 'family' ? {
          background: 'var(--bg-overlay, #252640)',
          color: 'var(--accent-text, #a5a8ff)',
          borderRadius: 'var(--radius-full, 9999px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 120ms ease-out',
          whiteSpace: 'nowrap' as const,
        } : {
          background: 'transparent',
          color: 'var(--text-muted, #4a4860)',
          borderRadius: 'var(--radius-full, 9999px)',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 120ms ease-out',
          whiteSpace: 'nowrap' as const,
        }}
        onClick={() => onChange('family')}
      >
        Familie
      </button>
      <button
        type="button"
        style={value === 'focus' ? {
          background: 'var(--bg-overlay, #252640)',
          color: 'var(--accent-text, #a5a8ff)',
          borderRadius: 'var(--radius-full, 9999px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 120ms ease-out',
          whiteSpace: 'nowrap' as const,
        } : {
          background: 'transparent',
          color: 'var(--text-muted, #4a4860)',
          borderRadius: 'var(--radius-full, 9999px)',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          transition: 'all 120ms ease-out',
          whiteSpace: 'nowrap' as const,
        }}
        onClick={() => onChange('focus')}
      >
        Focus
      </button>
    </div>
  );
}
