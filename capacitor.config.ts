import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL;
let allowNavigation: string[] | undefined;
if (serverUrl) {
  try {
    allowNavigation = [new URL(serverUrl).origin];
  } catch {
    allowNavigation = [serverUrl];
  }
}

const config: CapacitorConfig = {
  appId: 'com.smartreminder.app',
  appName: 'Smart Reminder',
  webDir: 'public',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        allowNavigation
      }
    : undefined,
  android: {
    allowMixedContent: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#f8fafc',
      showSpinner: false
    }
  }
};

export default config;
