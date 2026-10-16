# ✅ Email Notifications - Working!

## Current Status

Your email notification system is **fully deployed and working**!

### What's Deployed

- ✅ **Notification Lambda**: `MumCareNotificationHandler` in ap-southeast-5
- ✅ **API Gateway**: `https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify`
- ✅ **AWS SES**: Verified sender email `noreply.mumcareapp@gmail.com`
- ✅ **Verified Recipients**: `your-email@example.com`, `noreply.mumcareapp@gmail.com`

### API Endpoint

```
POST https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify
```

### Supported Notification Types

1. **wellness-reminder** - Daily wellness check reminders
2. **emergency-alert** - Urgent alerts for concerning symptoms
3. **milestone-celebration** - Recovery milestone celebrations
4. **ppd-concern** - Postpartum depression support
5. **medication-reminder** - Medication reminders
6. **feeding-reminder** - Feeding time reminders

## How to Use

### Test from Command Line

```javascript
// test-notification-api.cjs
const https = require('https');

const payload = {
  notificationType: 'wellness-reminder',
  userId: 'test-user',
  channel: 'email',
  data: {
    email: 'your-email@example.com',
    locale: 'en',  // or 'zh' for Chinese, 'ms' for Malay
    motherName: 'Sarah',
    dayNumber: 5
  }
};

const url = new URL('https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify');
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(payload))
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('Response:', data); });
});

req.write(JSON.stringify(payload));
req.end();
```

Run: `node test-notification-api.cjs`

### Integrate into Your App

Add this to your frontend code (e.g., after wellness check completion):

```typescript
// Send notification after wellness check
async function sendNotification(type: string, userData: any) {
  try {
    const response = await fetch('https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType: type,
        userId: userData.userId || 'user-' + Date.now(),
        channel: 'email',
        data: {
          email: userData.email,
          locale: userData.locale || 'en',
          motherName: userData.motherName,
          dayNumber: userData.dayNumber,
          symptoms: userData.symptoms  // for emergency alerts
        }
      })
    });
    
    const result = await response.json();
    console.log('Notification sent:', result);
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

// Example: Send emergency alert
if (hasEmergencySymptoms) {
  sendNotification('emergency-alert', {
    email: profile.email,
    locale: profile.locale,
    motherName: profile.motherName,
    symptoms: ['Heavy bleeding', 'Severe headache']
  });
}

// Example: Send milestone celebration
if (dayNumber % 7 === 0) {
  sendNotification('milestone-celebration', {
    email: profile.email,
    locale: profile.locale,
    motherName: profile.motherName,
    dayNumber: dayNumber,
    milestone: `You've completed ${dayNumber} days of recovery!`
  });
}
```

## Email Templates

### Wellness Reminder (English)
```
Subject: 🌸 Time for Your Daily Wellness Check

Hi Sarah,

It's time for your Day 5 wellness check. Taking a few minutes to track your recovery helps us provide better personalized care.

Tap here to complete your check-in.

With care,
MumCare AI
```

### Emergency Alert (English)
```
Subject: 🚨 URGENT: Emergency Symptoms Detected

URGENT ALERT

We've detected concerning symptoms that require immediate medical attention:
Heavy bleeding, Severe headache

Please contact your healthcare provider immediately or call emergency services.

Emergency Hotline: 911

This is an automated alert from MumCare AI.
```

### Milestone Celebration (English)
```
Subject: 🎉 Congratulations on Your Recovery Milestone!

Dear Sarah,

🎉 Congratulations! You've reached Day 7 of your postpartum recovery!

One week of recovery completed!

You're doing an amazing job. Every day is progress, and we're here to support you every step of the way.

Keep up the great work!

With pride,
MumCare AI
```

## Multi-Language Support

The system automatically sends emails in the user's preferred language:

- **English** (`locale: 'en'`)
- **Chinese** (`locale: 'zh'`) - 中文
- **Bahasa Malaysia** (`locale: 'ms'`)

## AWS SES Sandbox Mode

⚠️ **Important**: Your AWS SES is currently in **sandbox mode**, which means:

- ✅ You can send emails to verified addresses only
- ✅ Currently verified: `your-email@example.com`, `noreply.mumcareapp@gmail.com`
- ❌ Cannot send to unverified email addresses

### To Verify More Email Addresses

```powershell
aws sesv2 create-email-identity --email-identity user@example.com --region ap-southeast-5
```

The user will receive a verification email from AWS.

### To Move Out of Sandbox (Production)

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses)
2. Click "Account Dashboard"
3. Click "Request production access"
4. Fill out the form explaining your use case
5. Wait for approval (usually 24 hours)

Once approved, you can send to any email address!

## Cost

- **Current**: FREE (within AWS Free Tier)
- **After Free Tier**: $0.10 per 1,000 emails
- **Example**: 10,000 emails/month = $1.00

## Troubleshooting

### Email Not Received

1. **Check spam folder** - AWS SES emails often go to spam initially
2. **Verify email address** - Recipient must be verified in sandbox mode
3. **Check CloudWatch logs**:
   ```powershell
   aws logs tail /aws/lambda/MumCareNotificationHandler --region ap-southeast-5 --follow
   ```

### API Returns Error

- Check the request format matches the examples above
- Ensure `Content-Type: application/json` header is set
- Verify the email address is verified in SES (sandbox mode)

## Next Steps

1. ✅ Test sending emails to your verified address
2. ✅ Integrate into your app's wellness check flow
3. ✅ Add emergency symptom detection
4. ✅ Add milestone celebrations
5. ⏳ Request SES production access (when ready for real users)
6. ⏳ Add scheduled reminders (requires EventBridge setup)

## Support

If you need help:
- Check CloudWatch logs for errors
- Verify email addresses in SES console
- Test with the provided Node.js script

Your notification system is ready to use! 🎉
