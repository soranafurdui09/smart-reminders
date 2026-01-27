import admin from 'firebase-admin';

type FcmPayload = {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
  url?: string;
};

let firebaseApp: admin.app.App | null = null;

function coerceData(data?: FcmPayload['data']): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    out[key] = value === null ? 'null' : String(value);
  });
  return out;
}

export function initFirebaseAdmin(): admin.app.App {
  if (firebaseApp) return firebaseApp;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      }),
      projectId
    });
  }

  firebaseApp = admin.app();
  return firebaseApp;
}

export async function sendFcmToTokens(tokens: string[], payload: FcmPayload) {
  if (!tokens.length) {
    return { sent: 0, failed: 0, invalidTokens: [] as string[] };
  }

  initFirebaseAdmin();
  const data = coerceData(payload.data);
  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: payload.url ? { ...(data ?? {}), url: payload.url } : data,
    android: {
      priority: 'high',
      ttl: 60 * 60 * 1000
    }
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  const invalidTokens: string[] = [];

  response.responses.forEach((res, index) => {
    if (res.success) return;
    const code = (res.error as { code?: string } | undefined)?.code;
    if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(tokens[index]);
    }
  });

  return {
    sent: response.successCount,
    failed: response.failureCount,
    invalidTokens
  };
}
