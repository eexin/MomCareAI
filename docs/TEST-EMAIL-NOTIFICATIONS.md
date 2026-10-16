# Testing Email Notifications - Quick Guide

Simple guide to test if your email notifications are working.

## Prerequisites

Before testing, make sure you've:
1. ✅ Deployed the Lambda functions
2. ✅ Verified your sender email in AWS SES
3. ✅ Updated `.env` with the API endpoint

## Method 1: Quick Test Script (Easiest)

### Step 1: Update Test Script

Edit `lambda/test-notification.js` and change the email to YOUR email address:

```javascript
// Line 30 - Change this email
email: 'YOUR-EMAIL@example.com',  // <-- PUT YOUR EMAIL HERE
```

### Step 2: Run Test

```powershell
cd lambda
npm run test-notification
```

### Step 3: Check Your Email

Within 1-2 minutes, you should receive test emails with subjects like:
- 🌸 Time for Your Daily Wellness Check
- 🚨 URGENT: Emergency Symptoms Detected
- 🎉 Congratulations on Your Recovery Milestone!
- 💜 We're Here to Support You

**If you don't receive emails, check:**
1. Spam/Junk folder
2. Email address is correct
3. SES email is verified (see troubleshooting below)

---

## Method 2: Test via PowerShell (Direct API Call)

### Step 1: Set Your Variables

```powershell
# Replace with your actual values
$endpoint = "https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify"
$yourEmail = "your-email@example.com"
```

### Step 2: Send Test Notification

```powershell
$body = @{
    notificationType = "wellness-reminder"
    userId = "test-user-123"
    channel = "email"
    data = @{
        email = $yourEmail
        locale = "en"
        motherName = "Sarah"
        dayNumber = 5
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri $endpoint -Method POST -Body $body -ContentType "application/json"
Write-Host "Response: $($response | ConvertTo-Json)"
```

### Step 3: Check Response

You should see:
```json
{
  "success": true,
  "messageId": "abc123...",
  "message": "Notification sent successfully"
}
```

### Step 4: Check Your Email

Look for an email with subject: **🌸 Time for Your Daily Wellness Check**

---

## Method 3: Test from Your App

### Step 1: Enable Notifications in Settings

1. Open your app: http://localhost:5173
2. Go to Settings
3. Enable Notifications toggle
4. Enter your email address
5. Choose "Email" or "Push" (both use email)
6. Enable "Daily Wellness Reminder"
7. Set reminder time

### Step 2: Trigger a Notification

**Option A: Complete a Wellness Check**

1. Go to Dashboard
2. Complete a wellness check
3. If you report concerning symptoms (e.g., "Heavy bleeding", "Severe headache"), you should receive an emergency alert email immediately

**Option B: Wait for Scheduled Reminder**

- If you set reminder time to current time + 5 minutes, wait for the scheduled notification
- The Lambda function runs every hour and checks for users needing reminders

---

## Troubleshooting

### ❌ No Email Received

**Check 1: Verify SES Email**

```powershell
aws ses list-verified-email-addresses --region ap-southeast-1
```

You should see your sender email in the list. If not:

```powershell
aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
```

Check your email inbox for verification link from AWS.

**Check 2: Check CloudWatch Logs**

```powershell
aws logs tail /aws/lambda/MumCareNotificationHandler --follow --region ap-southeast-1
```

Look for errors like:
- `Email address is not verified` → Verify SES email
- `MessageRejected` → Check email format
- `AccessDenied` → Check IAM permissions

**Check 3: SES Sandbox Mode**

If you're in SES sandbox mode, you can only send to verified email addresses.

To verify your recipient email:
```powershell
aws ses verify-email-identity --email-address your-email@example.com --region ap-southeast-1
```

Check your inbox and click the verification link.

**To check if you're in sandbox:**
```powershell
aws sesv2 get-account --region ap-southeast-1
```

Look for `ProductionAccessEnabled: false` (means you're in sandbox).

**Check 4: Test SES Directly**

```powershell
aws ses send-email `
  --from noreply@mumcare.app `
  --destination "ToAddresses=your-email@example.com" `
  --message "Subject={Data='Test Email'},Body={Text={Data='This is a test'}}" `
  --region ap-southeast-1
```

If this works, the issue is with your Lambda function. If it fails, the issue is with SES configuration.

---

### ❌ Error: "Email address is not verified"

**Solution:**

1. Verify sender email:
   ```powershell
   aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
   ```

2. Check your email inbox for verification link

3. Click the link to verify

4. Confirm verification:
   ```powershell
   aws ses list-verified-email-addresses --region ap-southeast-1
   ```

---

### ❌ Error: "MessageRejected: Email address is not verified"

This means you're in **SES Sandbox Mode** and trying to send to an unverified recipient.

**Solution 1: Verify Recipient Email (Quick)**

```powershell
aws ses verify-email-identity --email-address your-email@example.com --region ap-southeast-1
```

Check your inbox and verify.

**Solution 2: Request Production Access (For Production)**

1. Go to https://console.aws.amazon.com/ses
2. Click "Account Dashboard"
3. Click "Request production access"
4. Fill out the form:
   - **Use case**: Transactional emails for postpartum care app
   - **Website URL**: Your app URL
   - **Describe how you will comply**: We only send to users who opt-in
   - **Describe your process**: Users enable notifications in settings
5. Submit and wait for approval (usually 24 hours)

---

### ❌ Lambda Function Not Found

**Check deployment:**

```powershell
aws lambda list-functions --region ap-southeast-1 | Select-String "MumCare"
```

You should see:
- MumCareNotificationHandler
- MumCareScheduledNotifications

If not, redeploy:
```powershell
cd lambda
.\deploy.ps1
```

---

### ❌ API Endpoint Not Working

**Check API Gateway:**

```powershell
aws apigatewayv2 get-apis --region ap-southeast-1
```

Look for `MumCareNotificationApi`.

**Get the correct endpoint:**

```powershell
aws cloudformation describe-stacks `
  --stack-name MumCareNotificationSystem `
  --region ap-southeast-1 `
  --query 'Stacks[0].Outputs[?OutputKey==``NotificationApiEndpoint``].OutputValue' `
  --output text
```

Update your `.env` file with this endpoint.

---

## Expected Email Examples

### Wellness Reminder
```
Subject: 🌸 Time for Your Daily Wellness Check

Hi Sarah,

It's time for your Day 5 wellness check. Taking a few minutes to track 
your recovery helps us provide better personalized care.

Tap here to complete your check-in.

With care,
MumCare AI
```

### Emergency Alert
```
Subject: 🚨 URGENT: Emergency Symptoms Detected

URGENT ALERT

We've detected concerning symptoms that require immediate medical attention:
Heavy bleeding, Severe headache

Please contact your healthcare provider immediately or call emergency services.

Emergency Hotline: 911

This is an automated alert from MumCare AI.
```

### Milestone Celebration
```
Subject: 🎉 Congratulations on Your Recovery Milestone!

Dear Sarah,

🎉 Congratulations! You've reached Day 7 of your postpartum recovery!

You've completed 1 week of recovery!

You're doing an amazing job. Every day is progress, and we're here to 
support you every step of the way.

Keep up the great work!

With pride,
MumCare AI
```

---

## Quick Checklist

Before asking for help, verify:

- [ ] Lambda functions are deployed
- [ ] SES sender email is verified
- [ ] API endpoint is in `.env` file
- [ ] Test script has correct email address
- [ ] Checked spam/junk folder
- [ ] CloudWatch logs show no errors
- [ ] If in sandbox, recipient email is verified

---

## Success Indicators

✅ **Test script shows**: `✅ Success: { success: true, messageId: '...' }`  
✅ **CloudWatch logs show**: `Notification sent: <messageId>`  
✅ **Email received** within 1-2 minutes  
✅ **Email not in spam** folder

---

## Cost of Testing

Testing is essentially **free**:
- First 62,000 emails/month: **FREE** (AWS Free Tier)
- After that: $0.10 per 1,000 emails
- Lambda invocations: First 1M/month **FREE**

So feel free to test as much as you need! 🎉

---

## Next Steps

Once email notifications work:

1. ✅ Test all notification types (wellness, emergency, milestone, PPD)
2. ✅ Test in different languages (EN, ZH, MS)
3. ✅ Set up scheduled notifications (add users to DynamoDB)
4. ✅ Integrate with your app's wellness check flow
5. ✅ Request SES production access (if needed)

---

## Need Help?

If you're still having issues:

1. **Check CloudWatch Logs** (most errors show here)
2. **Verify SES Configuration** (most common issue)
3. **Test SES Directly** (isolate the problem)
4. **Check IAM Permissions** (Lambda needs SES permissions)

Good luck! 🌸
