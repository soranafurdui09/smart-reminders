import { Capacitor, registerPlugin } from '@capacitor/core';

type GoogleAuthSignInResult = {
  idToken?: string;
  accessToken?: string;
  authentication?: {
    idToken?: string;
    accessToken?: string;
    id_token?: string;
    access_token?: string;
  };
  id_token?: string;
  access_token?: string;
};

type GoogleAuthInitOptions = {
  clientId?: string;
  serverClientId?: string;
  scopes?: string[];
  forceCodeForRefreshToken?: boolean;
};

type GoogleAuthPlugin = {
  initialize?: (options: GoogleAuthInitOptions) => Promise<void>;
  signIn: () => Promise<GoogleAuthSignInResult>;
  signOut?: () => Promise<void>;
  refresh?: () => Promise<GoogleAuthSignInResult>;
};

const GoogleAuth = registerPlugin<GoogleAuthPlugin>('GoogleAuth');
let initialized = false;

const pickToken = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

export async function nativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('GoogleAuth is only available on native platforms.');
  }
  if (!Capacitor.isPluginAvailable('GoogleAuth')) {
    throw new Error('GoogleAuth plugin is not available.');
  }

  if (!initialized && GoogleAuth.initialize) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
    await GoogleAuth.initialize({
      clientId: clientId || undefined,
      serverClientId: clientId || undefined,
      scopes: ['profile', 'email']
    });
    initialized = true;
  }

  const result = await GoogleAuth.signIn();
  const idToken =
    pickToken(result.idToken) ??
    pickToken(result.id_token) ??
    pickToken(result.authentication?.idToken) ??
    pickToken(result.authentication?.id_token);
  const accessToken =
    pickToken(result.accessToken) ??
    pickToken(result.access_token) ??
    pickToken(result.authentication?.accessToken) ??
    pickToken(result.authentication?.access_token);

  return { idToken, accessToken };
}
