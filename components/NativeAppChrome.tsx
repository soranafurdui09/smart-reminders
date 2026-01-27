"use client";

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

const STATUS_BAR_COLOR = '#0b2a2e';

export default function NativeAppChrome() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (!isAndroid) return;
    console.log('[native] isAndroid=', isAndroid, 'location=', window.location.href);

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

    const focusHandler = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      const scrollContainer = document.querySelector('.app-content');
      if (!scrollContainer) return;
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 180);
    };

    const keyboardShow = Keyboard.addListener('keyboardWillShow', (event) => {
      document.documentElement.style.setProperty('--keyboard-offset', `${event.keyboardHeight}px`);
    });

    const keyboardHide = Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
    });

    document.addEventListener('focusin', focusHandler);

    return () => {
      window.clearTimeout(timer);
      keyboardShow.then((handler) => handler.remove());
      keyboardHide.then((handler) => handler.remove());
      document.removeEventListener('focusin', focusHandler);
    };
  }, []);

  return null;
}
