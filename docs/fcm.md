# FCM (Firebase Cloud Messaging) setup

Required env vars:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- Optional: `FIREBASE_APP_ID`

### Example (.env)
```
FIREBASE_PROJECT_ID=smart-reminder
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@smart-reminder.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nLINE1\nLINE2\n-----END PRIVATE KEY-----\n"
```

Notes:
- If you store `FIREBASE_PRIVATE_KEY` with `\n` escaped, the code replaces `\\n` → newline.
- Use the **service account JSON** from Firebase Admin SDK.

### Usage example
```ts
import { sendFcmToTokens } from '@/lib/push/fcm';

const result = await sendFcmToTokens(['token1', 'token2'], {
  title: 'Reminder',
  body: 'Plătește chiria azi',
  url: 'https://smart-reminder-app.com/app'
});

console.log(result);
```
