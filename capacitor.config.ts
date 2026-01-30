import type { CapacitorConfig } from '@capacitor/cli';

const baseServerUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://www.smart-reminder-app.com';
const isAndroidBuild =
  process.env.CAPACITOR_PLATFORM === 'android' ||
  process.env.CAPACITOR_ANDROID === 'true' ||
  process.env.CAPACITOR_ANDROID === '1';
// NOTE: set CAPACITOR_PLATFORM=android (or CAPACITOR_ANDROID=1) for Android builds to load /native.
const serverUrl = isAndroidBuild
  ? `${baseServerUrl.replace(/\/$/, '')}/native`
  : baseServerUrl;

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
    SocialLogin: {
      providers: {
        google: true
      }
    }
  }
};

export default config;
