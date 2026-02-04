"use client";

import type { ReactNode } from 'react';
import { Search, User } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
  modeSwitcher?: ReactNode;
};

export default function HomeHeader({ title, subtitle, onSearchClick, onProfileClick, modeSwitcher }: Props) {
  return (
    <div className="home-header">
      <div>
        <div className="home-header-title">{title}</div>
        {subtitle ? <div className="home-header-subtitle">{subtitle}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        {modeSwitcher ? <div>{modeSwitcher}</div> : null}
        <button
          type="button"
          className="home-icon-btn"
          aria-label="Căutare"
          onClick={onSearchClick}
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="home-icon-btn home-profile-btn"
          aria-label="Profil"
          onClick={onProfileClick}
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
