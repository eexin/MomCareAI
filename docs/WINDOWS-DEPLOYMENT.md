# Windows Deployment Guide for MumCare Notifications

Step-by-step guide for deploying the notification system on Windows.

## Prerequisites

### 1. Install AWS CLI

Download and install AWS CLI for Windows:
```
https://awscli.amazonaws.com/AWSCLIV2.msi
```

After installation, verify:
```powershell
aws --version
```

### 2. Configure AWS Credentials

Open PowerShell and run:
```powershell
aws configure
```

Enter:
- **AWS Access Key ID**: Your access key
- **AWS Secret Access Key**: Your secret key
- **Default region name**: `ap-southeast-1`
- **Default output format**: `json`

### 3. Install Node.js

If not already installed:
```
https://nodejs.org/
```

Verify:
```powershell
node --version
npm --version
```

## Deployment Steps

### Step 1: Navigate to Lambda Folder

```powershell
cd C:\Users\bennc\bedrock-app\lambda
```

### Step 2: Install Dependencies

```powershell
npm install
```

### Step 3: Run Deployment Script

```powershell
.\deploy.ps1
```

This script will:
1. ✅ Check AWS CLI installation
2. ✅ Verify AWS credentials
3. ✅ Install npm dependencies
4. ✅ Build Lambda packages (zip files)
5. ✅ Deploy CloudFormation stack
6. ✅ Upload Lambda function code
7. ✅ Display API endpoint

### Step 4: Verify SES Email

After deployment, verify your sender email:

```powershell
aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
```

**Important**: Check your email inbox and click the verification link from AWS.

### Step 5: Update Environment Variables

Copy the API endpoint from the deployment output and add to your `.env` file:

```bash
NOTIFICATION_API_ENDPOINT=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify
```

### Step 6: Test Notifications

```powershell
npm run test-notification
```

## Manual Deployment (If Script Fails)

If the PowerShell script doesn't work, follow these manual steps:

### 1. Install Dependencies

```powershell
npm install
```

### 2. Create Zip Files

```powershell
# Create notification-handler.zip
Compress-Archive -Path notification-handler.js,node_modules -DestinationPath notification-handler.zip -Force

# Create scheduled-notifications.zip
Compress-Archive -Path scheduled-notifications.js,node_modules -DestinationPath scheduled-notifications.zip -Force
```

### 3. Deploy CloudFormation Stack

```powershell
aws cloudformation deploy `
  --template-file cloudformation-template.yaml `
  --stack-name MumCareNotificationSystem `
  --parameter-overrides FromEmail=noreply@mumcare.app `
  --capabilities CAPABILITY_NAMED_IAM `
  --region ap-southeast-1
```

### 4. Upload Lambda Code

```powershell
# Upload notification handler
aws lambda update-function-code `
  --function-name MumCareNotificationHandler `
  --zip-file fileb://notification-handler.zip `
  --region ap-southeast-1

# Upload scheduled notifications
aws lambda update-function-code `
  --function-name MumCareScheduledNotifications `
  --zip-file fileb://scheduled-notifications.zip `
  --region ap-southeast-1
```

### 5. Get API Endpoint

```powershell
aws cloudformation describe-stacks `
  --stack-name MumCareNotificationSystem `
  --region ap-southeast-1 `
  --query 'Stacks[0].Outputs[?OutputKey==``NotificationApiEndpoint``].OutputValue' `
  --output text
```

## Troubleshooting

### Error: "aws: command not found"

**Solution**: AWS CLI is not installed or not in PATH.
1. Reinstall AWS CLI from https://awscli.amazonaws.com/AWSCLIV2.msi
2. Restart PowerShell
3. Verify with `aws --version`

### Error: "Unable to locate credentials"

**Solution**: AWS credentials not configured.
```powershell
aws configure
```

### Error: "Access Denied"

**Solution**: Your AWS user doesn't have sufficient permissions.

Required permissions:
- CloudFormation: Full access
- Lambda: Full access
- DynamoDB: Full access
- SES: Full access
- SNS: Full access
- IAM: Create roles and policies
- API Gateway: Full access
- EventBridge: Full access

### Error: "Stack already exists"

**Solution**: Stack already deployed. To update:
```powershell
aws cloudformation update-stack `
  --stack-name MumCareNotificationSystem `
  --template-body file://cloudformation-template.yaml `
  --parameters ParameterKey=FromEmail,ParameterValue=noreply@mumcare.app `
  --capabilities CAPABILITY_NAMED_IAM `
  --region ap-southeast-1
```

### Error: "Compress-Archive: command not found"

**Solution**: Use 7-Zip or WinRAR to create zip files manually.

**With 7-Zip**:
```powershell
# Install 7-Zip first, then:
& "C:\Program Files\7-Zip\7z.exe" a -tzip notification-handler.zip notification-handler.js node_modules
& "C:\Program Files\7-Zip\7z.exe" a -tzip scheduled-notifications.zip scheduled-notifications.js node_modules
```

### Error: "Email not verified"

**Solution**: 
1. Check your email inbox for verification email from AWS
2. Click the verification link
3. Verify status:
   ```powershell
   aws ses list-verified-email-addresses --region ap-southeast-1
   ```

### Error: "SES in sandbox mode"

**Solution**: For production, request production access:
1. Go to https://console.aws.amazon.com/ses
2. Click "Account Dashboard"
3. Click "Request production access"
4. Fill out the form
5. Wait for approval (usually 24 hours)

## Viewing Logs

### CloudWatch Logs

```powershell
# Notification Handler logs
aws logs tail /aws/lambda/MumCareNotificationHandler --follow --region ap-southeast-1

# Scheduled Notifications logs
aws logs tail /aws/lambda/MumCareScheduledNotifications --follow --region ap-southeast-1
```

### CloudFormation Events

```powershell
aws cloudformation describe-stack-events `
  --stack-name MumCareNotificationSystem `
  --region ap-southeast-1 `
  --max-items 10
```

## Testing

### Test All Notifications

```powershell
npm run test-notification
```

### Test Specific Notification

```powershell
$endpoint = "https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify"

$body = @{
    notificationType = "wellness-reminder"
    userId = "test-user"
    channel = "email"
    data = @{
        email = "your-email@example.com"
        locale = "en"
        motherName = "Sarah"
        dayNumber = 5
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri $endpoint -Method POST -Body $body -ContentType "application/json"
```

## Cleanup (Delete Everything)

To remove all resources:

```powershell
aws cloudformation delete-stack --stack-name MumCareNotificationSystem --region ap-southeast-1
```

This will delete:
- Lambda functions
- DynamoDB tables
- API Gateway
- EventBridge rules
- IAM roles

**Warning**: This action cannot be undone. All notification data will be lost.

## Next Steps

1. ✅ Verify SES email
2. ✅ Update `.env` with API endpoint
3. ✅ Test notifications
4. ✅ Integrate with your Express server
5. ✅ Add users to DynamoDB for scheduled notifications

## Support

For issues:
1. Check CloudWatch logs
2. Review error messages carefully
3. Verify AWS service quotas
4. Check IAM permissions
5. Consult AWS documentation

## Useful Links

- [AWS CLI Windows Installation](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html)
- [AWS SES Console](https://console.aws.amazon.com/ses)
- [AWS Lambda Console](https://console.aws.amazon.com/lambda)
- [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation)
- [CloudWatch Logs Console](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)
