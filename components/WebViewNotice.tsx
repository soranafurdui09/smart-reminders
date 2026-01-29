"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'smart-reminder:webview-notice-dismissed';

export default function WebViewNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === '1';
    const isNative = Capacitor.isNativePlatform();
    if (!dismissed && !isNative) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="page-wrap">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 shadow-sm">
        <div className="font-semibold">Ești în versiunea WebView.</div>
        <div className="mt-1">
          Pentru notificări locale și experiență completă, folosește aplicația Android Capacitor.
        </div>
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-amber-900"
          onClick={() => {
            window.localStorage.setItem(STORAGE_KEY, '1');
            setVisible(false);
          }}
        >
          Înțeleg
        </button>
      </div>
    </div>
  );
}
