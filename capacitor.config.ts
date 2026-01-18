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
  webDir: 'out',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        allowNavigation
      }
    : undefined,
  android: {
    allowMixedContent: false
  }
};

export default config;
