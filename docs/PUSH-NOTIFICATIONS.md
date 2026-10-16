# Push Notifications Implementation Guide

## Current Status

**Push notifications automatically use email** as a fallback since mobile push infrastructure is not yet configured. The notification system currently supports:

✅ **Email** (via AWS SES) - Fully functional  
✅ **SMS** (via AWS SNS) - Fully functional  
✅ **Push → Email Fallback** - Push notifications are sent via email until mobile infrastructure is set up

## Why Push Notifications Are Disabled

Push notifications for web apps require:

1. **Service Worker** - Background script to receive notifications
2. **VAPID Keys** - Web Push protocol authentication
3. **User Permission** - Browser permission to show notifications
4. **HTTPS** - Secure connection (required for service workers)
5. **Push Service** - Firebase Cloud Messaging (FCM) or AWS SNS Mobile Push

Since this is a prototype/MVP, push notifications are marked as "Coming Soon" to avoid confusion.

## How to Enable Push Notifications

### Option 1: Web Push Notifications (Browser-based)

For the current web app, you can implement browser push notifications:

#### Step 1: Generate VAPID Keys

```bash
npm install web-push -g
web-push generate-vapid-keys
```

Save the keys:
```
Public Key: BPx...
Private Key: abc...
```

#### Step 2: Create Service Worker

Create `client/public/sw.js`:

```javascript
// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

#### Step 3: Register Service Worker

Add to `client/src/main.tsx`:

```typescript
// Register service worker for push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker registered:', registration);
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}
```

#### Step 4: Request Permission and Subscribe

Create `client/src/utils/pushNotifications.ts`:

```typescript
const VAPID_PUBLIC_KEY = 'YOUR_PUBLIC_KEY_HERE';

export async function subscribeToPushNotifications(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }
  
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    // Send subscription to backend
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription
      })
    });
    
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

#### Step 5: Update Backend to Send Push

Add to `server/index.js`:

```javascript
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store push subscriptions (in production, use database)
const pushSubscriptions = new Map();

// Subscribe endpoint
app.post('/api/push-subscribe', (req, res) => {
  const { userId, subscription } = req.body;
  pushSubscriptions.set(userId, subscription);
  res.json({ success: true });
});

// Send push notification
async function sendPushNotification(userId, title, body) {
  const subscription = pushSubscriptions.get(userId);
  if (!subscription) {
    console.log('No push subscription for user:', userId);
    return;
  }
  
  const payload = JSON.stringify({
    title,
    body,
    url: '/'
  });
  
  try {
    await webpush.sendNotification(subscription, payload);
    console.log('Push notification sent to user:', userId);
  } catch (error) {
    console.error('Failed to send push notification:', error);
    // Remove invalid subscription
    if (error.statusCode === 410) {
      pushSubscriptions.delete(userId);
    }
  }
}
```

#### Step 6: Update Lambda Function

Update `lambda/notification-handler.js`:

```javascript
async function sendPushNotification(userId, title, body) {
  // Call your backend API to send push
  const response = await fetch(`${process.env.BACKEND_URL}/api/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, body })
  });
  
  return { messageId: `push-${Date.now()}`, channel: 'push' };
}
```

#### Step 7: Enable in Settings

Update `client/src/components/Settings.tsx`:

```typescript
{ value: 'push', label: t(locale, 'push'), icon: 'notifications', available: true }
```

### Option 2: Firebase Cloud Messaging (Recommended for Mobile)

For native mobile apps (React Native, Flutter, etc.):

#### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create a new project
3. Add your app (iOS/Android)
4. Download `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)

#### Step 2: Install Firebase SDK

```bash
npm install firebase
```

#### Step 3: Initialize Firebase

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission and get token
export async function requestNotificationPermission() {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY'
    });
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

// Listen for messages
onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
  // Show notification
});
```

#### Step 4: Update Lambda to Use FCM

```javascript
import admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

async function sendPushNotification(userId, title, body) {
  // Get user's FCM token from DynamoDB
  const user = await getUserProfile(userId);
  if (!user.fcmToken) {
    console.log('No FCM token for user:', userId);
    return { messageId: 'no-token', channel: 'push' };
  }
  
  const message = {
    notification: {
      title,
      body
    },
    token: user.fcmToken
  };
  
  try {
    const response = await admin.messaging().send(message);
    console.log('Push notification sent:', response);
    return { messageId: response, channel: 'push' };
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error;
  }
}
```

### Option 3: AWS SNS Mobile Push

For AWS-native solution:

#### Step 1: Create SNS Platform Application

```bash
# For iOS (APNS)
aws sns create-platform-application \
  --name MumCareIOS \
  --platform APNS \
  --attributes PlatformCredential=<APNS_CERTIFICATE>

# For Android (FCM)
aws sns create-platform-application \
  --name MumCareAndroid \
  --platform GCM \
  --attributes PlatformCredential=<FCM_SERVER_KEY>
```

#### Step 2: Register Device Endpoint

```javascript
async function registerDevice(userId, deviceToken, platform) {
  const platformApplicationArn = platform === 'ios' 
    ? process.env.SNS_IOS_APP_ARN 
    : process.env.SNS_ANDROID_APP_ARN;
  
  const params = {
    PlatformApplicationArn: platformApplicationArn,
    Token: deviceToken,
    CustomUserData: userId
  };
  
  const result = await snsClient.send(new CreatePlatformEndpointCommand(params));
  return result.EndpointArn;
}
```

#### Step 3: Send Push via SNS

```javascript
async function sendPushNotification(userId, title, body) {
  // Get user's endpoint ARN from DynamoDB
  const user = await getUserProfile(userId);
  if (!user.endpointArn) {
    console.log('No endpoint ARN for user:', userId);
    return { messageId: 'no-endpoint', channel: 'push' };
  }
  
  const message = {
    default: body,
    APNS: JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default'
      }
    }),
    GCM: JSON.stringify({
      notification: { title, body }
    })
  };
  
  const params = {
    TargetArn: user.endpointArn,
    Message: JSON.stringify(message),
    MessageStructure: 'json'
  };
  
  const result = await snsClient.send(new PublishCommand(params));
  return { messageId: result.MessageId, channel: 'push' };
}
```

## Testing Push Notifications

### Test Web Push

```javascript
// In browser console
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    new Notification('Test Notification', {
      body: 'This is a test notification',
      icon: '/favicon.svg'
    });
  }
});
```

### Test FCM

Use Firebase Console:
1. Go to Cloud Messaging
2. Click "Send test message"
3. Enter FCM token
4. Send

## Cost Considerations

| Service | Free Tier | Cost After Free Tier |
|---------|-----------|---------------------|
| Web Push | Free | Free (browser-based) |
| Firebase FCM | Free | Free (unlimited) |
| AWS SNS Mobile Push | 1M requests/month | $0.50 per million |

## Recommendations

1. **For Web App Only**: Use Web Push (browser notifications)
2. **For Mobile App**: Use Firebase Cloud Messaging (free, reliable)
3. **For AWS-Native**: Use SNS Mobile Push (if already using AWS)

## Current Implementation

For now, the system defaults to **Email** when push is selected, with a clear message to users that push notifications require a mobile app.

To enable push notifications:
1. Choose one of the options above
2. Implement the code
3. Update Settings.tsx to set `available: true` for push
4. Test thoroughly on target devices

## Security Considerations

- Always use HTTPS for web push
- Store VAPID keys securely (environment variables)
- Validate push subscriptions before sending
- Handle expired/invalid tokens gracefully
- Respect user's notification preferences
- Implement unsubscribe functionality

## Resources

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [AWS SNS Mobile Push](https://docs.aws.amazon.com/sns/latest/dg/sns-mobile-application-as-subscriber.html)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
