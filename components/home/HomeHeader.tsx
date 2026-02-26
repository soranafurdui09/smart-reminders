"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

type Props = {
  // New design props
  uiMode?: 'family' | 'focus';
  onModeChange?: (mode: 'family' | 'focus') => void;
  syncStatus?: 'ok' | 'warn';
  onSearchClick?: () => void;
  // Legacy props — kept for backward compat but not rendered in new design
  title?: string;
  subtitle?: string;
  modeSwitcher?: ReactNode;
  onProfileClick?: () => void;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Bună dimineața.';
  if (h >= 12 && h < 18) return 'Bună ziua.';
  return 'Bună seara.';
}

export default function HomeHeader({
  uiMode = 'family',
  onModeChange,
  onSearchClick,
  syncStatus = 'ok',
}: Props) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const modeLabel = uiMode === 'family' ? 'Familie' : 'Focus';
  const nextMode: 'family' | 'focus' = uiMode === 'family' ? 'focus' : 'family';

  return (
    <div
      className="home-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        position: 'relative',
        zIndex: 20,
        gap: '0.5rem',
      }}
    >
      {/* Left: greeting + trust indicator */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
            fontSize: '1.125rem',
            fontWeight: 400,
            color: 'var(--text-primary, #eeedf5)',
            lineHeight: 1.25,
            minHeight: '1.4rem',
          }}
        >
          {greeting}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginTop: '3px',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: syncStatus === 'warn'
                ? 'var(--amber, #f59e0b)'
                : 'var(--success-color, #34d399)',
              display: 'inline-block',
              flexShrink: 0,
              boxShadow: syncStatus === 'warn'
                ? '0 0 4px rgba(245,158,11,0.5)'
                : '0 0 4px rgba(52,211,153,0.5)',
            }}
          />
          <span
            style={{
              fontSize: '0.625rem',
              color: syncStatus === 'warn'
                ? 'var(--amber-text, #fcd34d)'
                : 'var(--text-secondary, #8b8aa0)',
              fontFamily: 'var(--font-mono, monospace)',
              whiteSpace: 'nowrap',
            }}
          >
            {syncStatus === 'warn' ? 'Doze activ · notificări pot întârzia' : 'Sincronizat'}
          </span>
        </div>
      </div>

      {/* Right: mode chip + search icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {onModeChange ? (
          <button
            type="button"
            onClick={() => onModeChange(nextMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              height: '28px',
              paddingLeft: '10px',
              paddingRight: '10px',
              borderRadius: 'var(--radius-full, 9999px)',
              background: 'var(--bg-subtle, #1f2035)',
              border: '1px solid var(--border-default, #1e1f35)',
              color: 'var(--accent-text, #a5a8ff)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 120ms ease-out',
              whiteSpace: 'nowrap',
            }}
          >
            {modeLabel}
            <span style={{ opacity: 0.7, fontSize: '9px' }}>▾</span>
          </button>
        ) : null}
        <button
          type="button"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--bg-subtle, #1f2035)',
            border: '1px solid var(--border-default, #1e1f35)',
            color: 'var(--text-secondary, #8b8aa0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label="Căutare"
          onClick={onSearchClick}
        >
          <Search style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}
