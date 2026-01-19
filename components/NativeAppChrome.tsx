"use client";

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

const STATUS_BAR_COLOR = '#f8fafc';

export default function NativeAppChrome() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (!isAndroid) return;

    document.documentElement.classList.add('native-android');
    document.body.classList.add('native-android');

    const applyChrome = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: STATUS_BAR_COLOR });
      } catch (error) {
        console.warn('[native] status bar setup failed', error);
      }

      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      } catch (error) {
        console.warn('[native] keyboard setup failed', error);
      }

      try {
        await SplashScreen.hide();
      } catch (error) {
        console.warn('[native] splash screen hide failed', error);
      }
    };

    const timer = window.setTimeout(() => {
      void applyChrome();
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
