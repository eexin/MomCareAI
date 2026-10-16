# How to Test Email Notifications - Simple Guide

## Quick Test (3 Steps)

### Step 1: Edit the Test File

Open `lambda/quick-test.js` and change line 14:

```javascript
const YOUR_EMAIL = 'your-actual-email@example.com';  // <-- Change this
```

### Step 2: Run the Test

```powershell
cd lambda
npm run quick-test
```

### Step 3: Check Your Email

Look for an email with subject: **🌸 Time for Your Daily Wellness Check**

**Don't see it?** Check your spam/junk folder!

---
https://www.google.com/
## If Test Fails

### Error: "NOTIFICATION_API_ENDPOINT not set"

**You need to deploy the Lambda functions first!**

See the complete deployment guide: **[DEPLOY-NOTIFICATIONS-WINDOWS.md](./DEPLOY-NOTIFICATIONS-WINDOWS.md)**

**Quick steps:**

1. Install AWS CLI: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Configure AWS:
   ```powershell
   aws configure
   ```
3. Deploy:
   ```powershell
   cd lambda
   .\deploy.ps1
   ```
4. Copy the API endpoint from the output
5. Add to `.env` file:
   ```bash
   NOTIFICATION_API_ENDPOINT=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify
   ```

---

### Error: "Email address is not verified"

**Fix:** Verify your sender email in AWS SES:

```powershell
aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
```

Then check your email inbox and click the verification link from AWS.

**Verify it worked:**
```powershell
aws ses list-verified-email-addresses --region ap-southeast-1
```

You should see `noreply@mumcare.app` in the list.

---

### Error: "MessageRejected: Email address is not verified"

This means you're in **SES Sandbox Mode** and need to verify your recipient email too.

**Fix:** Verify your personal email:

```powershell
aws ses verify-email-identity --email-address your-email@example.com --region ap-southeast-1
```

Check your inbox and click the verification link.

**For Production:** Request production access at https://console.aws.amazon.com/ses

---

### No Email Received (No Errors)

**Check 1: Spam Folder**
- Look in spam/junk folder
- Add `noreply@mumcare.app` to your contacts

**Check 2: CloudWatch Logs**
```powershell
aws logs tail /aws/lambda/MumCareNotificationHandler --follow --region ap-southeast-1
```

Look for errors in the logs.

**Check 3: Test SES Directly**
```powershell
aws ses send-email `
  --from noreply@mumcare.app `
  --destination "ToAddresses=your-email@example.com" `
  --message "Subject={Data='Test'},Body={Text={Data='Test email'}}" `
  --region ap-southeast-1
```

If this works, the issue is with Lambda. If it fails, the issue is with SES.

---

## Test from Your App

### Step 1: Configure Settings

1. Open app: http://localhost:5173
2. Go to **Settings**
3. Scroll to **Notification Settings**
4. Toggle **Enable Notifications** ON
5. Enter your **Email Address**
6. Choose **Email** or **Push** (both use email)
7. Toggle **Daily Wellness Reminder** ON
8. Toggle **Emergency Alerts** ON

### Step 2: Trigger Emergency Alert

1. Go to **Dashboard**
2. Click **Complete Wellness Check**
3. In the symptoms section, select:
   - Heavy bleeding
   - Severe headache
4. Complete the check

You should receive an **emergency alert email** within 1-2 minutes!

---

## What Emails to Expect

### 1. Wellness Reminder
**Subject:** 🌸 Time for Your Daily Wellness Check  
**When:** Daily at your chosen time (requires scheduled Lambda)

### 2. Emergency Alert
**Subject:** 🚨 URGENT: Emergency Symptoms Detected  
**When:** Immediately when concerning symptoms are reported

### 3. Milestone Celebration
**Subject:** 🎉 Congratulations on Your Recovery Milestone!  
**When:** Every 7 days (Day 7, 14, 21, 28, etc.)

### 4. PPD Concern
**Subject:** 💜 We're Here to Support You  
**When:** When depression indicators are detected

---

## Troubleshooting Checklist

Before asking for help, verify:

- [ ] Lambda functions deployed (`.\deploy.ps1`)
- [ ] SES sender email verified (`noreply@mumcare.app`)
- [ ] API endpoint in `.env` file
- [ ] Test file has your correct email
- [ ] Checked spam/junk folder
- [ ] CloudWatch logs checked for errors
- [ ] If in sandbox, recipient email verified

---

## Cost

Testing is **FREE**:
- First 62,000 emails/month: FREE (AWS Free Tier)
- Lambda: First 1M invocations/month FREE

So test as much as you want! 🎉

---

## Need More Help?

See detailed troubleshooting guide:
- `lambda/TEST-EMAIL-NOTIFICATIONS.md` - Complete troubleshooting guide
- `lambda/README.md` - Full documentation
- `lambda/QUICK-REFERENCE.md` - API reference

---

## Success! 🎉

Once you receive test emails:

1. ✅ Test all notification types
2. ✅ Test in different languages (EN, ZH, MS)
3. ✅ Integrate with your app
4. ✅ Request SES production access (for production)

Your notification system is ready to use!
