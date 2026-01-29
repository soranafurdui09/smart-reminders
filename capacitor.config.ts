import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = 'https://www.smart-reminder-app.com';

const config: CapacitorConfig = {
  appId: 'com.smartreminder.app',
  appName: 'Smart Reminder',
  webDir: 'public',
  server: {
    url: serverUrl,
    cleartext: false,
    allowNavigation: [
      'https://www.smart-reminder-app.com',
      'https://smart-reminder-app.com',
      'https://*.smart-reminder-app.com',
      'https://*.supabase.co',
      'https://accounts.google.com',
      'https://*.googleusercontent.com'
    ]
  },
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#f8fafc',
      showSpinner: false
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
      serverClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''
    }
  }
};

export default config;
