# 🔔 MumCare Notification System Setup Guide

Complete guide to setting up AWS Lambda-based notifications for your postpartum care app.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Testing](#testing)
6. [Integration](#integration)
7. [Troubleshooting](#troubleshooting)

## Overview

The notification system provides:
- ✅ **Scheduled Reminders**: Daily wellness checks, medication alerts
- ✅ **Emergency Alerts**: Immediate notifications for concerning symptoms
- ✅ **Milestone Celebrations**: Weekly recovery achievements
- ✅ **PPD Monitoring**: Alerts for postpartum depression indicators
- ✅ **Multi-channel**: Email (SES), SMS (SNS), Push notifications
- ✅ **Multi-language**: English, Chinese, Bahasa Malaysia

## Prerequisites

### 1. AWS Account
- Active AWS account with appropriate permissions
- AWS CLI installed and configured

### 2. Install AWS CLI

**Windows (PowerShell):**
```powershell
# Download and install AWS CLI
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version
```

**macOS:**
```bash
brew install awscli
aws --version
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

### 3. Configure AWS Credentials

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `ap-southeast-1` (or your preferred region)
- Default output format: `json`

## Quick Start

### 1. Deploy Lambda Functions

```bash
cd lambda
npm install
chmod +x deploy.sh
./deploy.sh
```

**For Windows (PowerShell):**
```powershell
cd lambda
npm install
# Run deployment manually (see Detailed Setup below)
```

### 2. Verify SES Email

```bash
aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
```

Check your email and click the verification link.

### 3. Update Environment Variables

Add to your `.env` file:

```bash
NOTIFICATION_API_ENDPOINT=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify
```

(Get the endpoint from CloudFormation outputs)

### 4. Test Notifications

```bash
cd lambda
npm run test-notification
```

## Detailed Setup

### Step 1: Deploy CloudFormation Stack

```bash
cd lambda

# Deploy the stack
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name MumCareNotificationSystem \
  --parameter-overrides FromEmail=noreply@mumcare.app \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-southeast-1
```

This creates:
- 2 DynamoDB tables (UserProfiles, Notifications)
- 2 Lambda functions (NotificationHandler, ScheduledNotifications)
- 1 API Gateway endpoint
- 1 EventBridge rule (hourly schedule)
- IAM roles and permissions

### Step 2: Build and Upload Lambda Code

```bash
# Install dependencies
npm install

# Build Lambda packages
zip -r notification-handler.zip notification-handler.js node_modules/
zip -r scheduled-notifications.zip scheduled-notifications.js node_modules/

# Upload to Lambda
aws lambda update-function-code \
  --function-name MumCareNotificationHandler \
  --zip-file fileb://notification-handler.zip \
  --region ap-southeast-1

aws lambda update-function-code \
  --function-name MumCareScheduledNotifications \
  --zip-file fileb://scheduled-notifications.zip \
  --region ap-southeast-1
```

**For Windows (PowerShell):**
```powershell
# Use 7-Zip or built-in compression
Compress-Archive -Path notification-handler.js,node_modules -DestinationPath notification-handler.zip -Force
Compress-Archive -Path scheduled-notifications.js,node_modules -DestinationPath scheduled-notifications.zip -Force

# Upload to Lambda
aws lambda update-function-code --function-name MumCareNotificationHandler --zip-file fileb://notification-handler.zip --region ap-southeast-1
aws lambda update-function-code --function-name MumCareScheduledNotifications --zip-file fileb://scheduled-notifications.zip --region ap-southeast-1
```

### Step 3: Get API Endpoint

```bash
aws cloudformation describe-stacks \
  --stack-name MumCareNotificationSystem \
  --region ap-southeast-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`NotificationApiEndpoint`].OutputValue' \
  --output text
```

Copy the endpoint URL and add to `.env`:

```bash
NOTIFICATION_API_ENDPOINT=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify
```

### Step 4: Verify SES Email

```bash
# Verify sender email
aws ses verify-email-identity \
  --email-address noreply@mumcare.app \
  --region ap-southeast-1

# Check verification status
aws ses list-verified-email-addresses --region ap-southeast-1
```

**Important**: Check your email inbox and click the verification link from AWS.

### Step 5: (Optional) Move SES Out of Sandbox

By default, SES is in sandbox mode and can only send to verified emails. For production:

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses)
2. Click "Account Dashboard"
3. Click "Request production access"
4. Fill out the form explaining your use case
5. Wait for approval (usually 24 hours)

## Testing

### Test Individual Notifications

```bash
cd lambda
npm run test-notification
```

This will send test notifications for:
- Wellness reminder
- Emergency alert
- Milestone celebration
- PPD concern
- Medication reminder
- Multi-language tests

### Test via API

```bash
curl -X POST https://your-api-endpoint/prod/notify \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "wellness-reminder",
    "userId": "test-user",
    "channel": "email",
    "data": {
      "email": "your-email@example.com",
      "locale": "en",
      "motherName": "Sarah",
      "dayNumber": 5
    }
  }'
```

### View Lambda Logs

```bash
# Notification Handler logs
aws logs tail /aws/lambda/MumCareNotificationHandler --follow

# Scheduled Notifications logs
aws logs tail /aws/lambda/MumCareScheduledNotifications --follow
```

## Integration

### Backend Integration

Update `server/index.js`:

```javascript
import { sendNotification, checkEmergencySymptoms, checkPPDIndicators, checkMilestone } from './notification-service.js';

// In your wellness check endpoint
app.post('/api/complete-care-report', async (req, res) => {
  const { healthData, profile, recoveryStage } = req.body;
  
  // Check for emergency symptoms
  if (healthData.symptoms && healthData.symptoms.length > 0) {
    checkEmergencySymptoms(healthData.symptoms, profile);
  }
  
  // Check for PPD indicators
  checkPPDIndicators(healthData, profile);
  
  // Check for milestones
  checkMilestone(recoveryStage, profile);
  
  // ... rest of your code
});
```

### Frontend Integration

Users can configure notifications in Settings:

1. Enable/disable notifications
2. Choose preferred channel (email, SMS, push)
3. Set wellness reminder time
4. Enable/disable emergency alerts

Settings are stored in `localStorage` and synced to DynamoDB when user completes wellness checks.

### Add User to DynamoDB

For scheduled notifications to work, users must be in DynamoDB:

```javascript
// Example: Add user after setup
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });

await dynamodb.put({
  TableName: 'MumCareUserProfiles',
  Item: {
    userId: 'user-' + Date.now(),
    email: 'user@example.com',
    phoneNumber: '+60123456789',
    motherName: 'Sarah',
    deliveryDate: '2026-05-01',
    deliveryMethod: 'vaginal',
    locale: 'en',
    notificationSettings: {
      enabled: true,
      preferredChannel: 'email',
      wellnessReminder: true,
      wellnessReminderTime: '09:00',
      medicationReminders: false,
      feedingReminders: false,
      emergencyAlerts: true
    }
  }
}).promise();
```

## Troubleshooting

### Email Not Sending

**Problem**: Emails are not being delivered

**Solutions**:
1. Verify email address in SES:
   ```bash
   aws ses list-verified-email-addresses --region ap-southeast-1
   ```
2. Check SES is out of sandbox mode (for production)
3. Check CloudWatch logs for errors:
   ```bash
   aws logs tail /aws/lambda/MumCareNotificationHandler --follow
   ```
4. Verify IAM permissions for SES

### SMS Not Sending

**Problem**: SMS messages are not being delivered

**Solutions**:
1. Verify phone number format: `+60123456789`
2. Check SNS SMS spending limits:
   - Go to SNS Console → Text messaging (SMS) → Spending limits
3. Verify SMS is enabled in your region
4. Check CloudWatch logs for errors

### Lambda Function Errors

**Problem**: Lambda function is failing

**Solutions**:
1. Check CloudWatch logs:
   ```bash
   aws logs tail /aws/lambda/MumCareNotificationHandler --follow
   ```
2. Verify environment variables are set correctly
3. Check IAM role has necessary permissions
4. Verify DynamoDB tables exist and are accessible

### Scheduled Notifications Not Running

**Problem**: Scheduled notifications are not being triggered

**Solutions**:
1. Check EventBridge rule is enabled:
   ```bash
   aws events describe-rule --name MumCareScheduledNotifications --region ap-southeast-1
   ```
2. Verify Lambda has permission to be invoked by EventBridge
3. Check CloudWatch logs for the scheduled function
4. Verify users exist in DynamoDB with notification settings

### API Gateway Errors

**Problem**: API endpoint returns errors

**Solutions**:
1. Verify API Gateway is deployed:
   ```bash
   aws apigatewayv2 get-apis --region ap-southeast-1
   ```
2. Check CORS configuration
3. Verify Lambda integration is correct
4. Test Lambda function directly:
   ```bash
   aws lambda invoke --function-name MumCareNotificationHandler --payload '{"body":"{}"}' response.json
   ```

## Cost Estimation

Based on 1,000 active users:

| Service | Usage | Cost/Month |
|---------|-------|------------|
| Lambda | ~50,000 invocations | $0.10 |
| DynamoDB | On-demand, ~100K reads/writes | $2.00 |
| SES | ~30,000 emails | $3.00 |
| SNS SMS | ~5,000 SMS (optional) | $32.25 |
| API Gateway | ~50,000 requests | $0.05 |
| EventBridge | Included in Lambda | $0.00 |
| **Total (without SMS)** | | **~$5.15** |
| **Total (with SMS)** | | **~$37.40** |

## Security Best Practices

1. **Use IAM Roles**: Never hardcode AWS credentials
2. **Enable Encryption**: DynamoDB encryption at rest is enabled by default
3. **Use HTTPS**: API Gateway uses HTTPS by default
4. **Limit Permissions**: Lambda roles have minimal required permissions
5. **Set TTL**: Notification logs expire after 90 days
6. **Validate Input**: Lambda functions validate all input data
7. **Rate Limiting**: Consider adding API Gateway throttling for production

## Monitoring

### CloudWatch Dashboards

Create a dashboard to monitor:
- Lambda invocation count and errors
- API Gateway request count and latency
- DynamoDB read/write capacity
- SES/SNS delivery rates

### Alarms

Set up CloudWatch alarms for:
- Lambda function errors > 5% error rate
- API Gateway 5xx errors
- DynamoDB throttling
- SES bounce rate > 5%

## Next Steps

1. **Add Push Notifications**: Integrate with Firebase Cloud Messaging or AWS SNS Mobile Push
2. **Add SMS Support**: Configure SNS for SMS delivery
3. **Customize Templates**: Modify email/SMS templates in Lambda functions
4. **Add Analytics**: Track notification open rates and engagement
5. **Implement Preferences**: Allow users to customize notification frequency
6. **Add Unsubscribe**: Implement unsubscribe functionality for emails

## Support

For issues or questions:
- Check CloudWatch logs first
- Review AWS service quotas
- Consult AWS documentation
- Open an issue in the repository

## License

MIT
