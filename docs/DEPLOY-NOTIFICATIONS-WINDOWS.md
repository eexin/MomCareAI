# Deploy Notification System on Windows - Step by Step

## Step 1: Install AWS CLI

### Download and Install

1. Download AWS CLI for Windows:
   ```
   https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

2. Run the installer (double-click the downloaded file)

3. Follow the installation wizard (click Next, Next, Install)

4. **Restart PowerShell** after installation

5. Verify installation:
   ```powershell
   aws --version
   ```
   
   You should see something like: `aws-cli/2.x.x Python/3.x.x Windows/10`

---

## Step 2: Configure AWS Credentials

### Get Your AWS Credentials

1. Log in to AWS Console: https://console.aws.amazon.com
2. Click your name (top right) → **Security credentials**
3. Scroll to **Access keys**
4. Click **Create access key**
5. Choose **Command Line Interface (CLI)**
6. Check the box and click **Next**
7. Click **Create access key**
8. **IMPORTANT:** Copy both:
   - Access key ID (starts with `AKIA...`)
   - Secret access key (long random string)

### Configure AWS CLI

Open PowerShell and run:

```powershell
aws configure
```

Enter when prompted:
```
AWS Access Key ID: AKIA... (paste your access key)
AWS Secret Access Key: ... (paste your secret key)
Default region name: ap-southeast-1
Default output format: json
```

**Verify it worked:**
```powershell
aws sts get-caller-identity
```

You should see your AWS account info.

---

## Step 3: Deploy the Notification System

### Option A: Automatic Deployment (Recommended)

```powershell
cd C:\Users\bennc\bedrock-app\lambda
.\deploy.ps1
```

This will:
1. ✅ Install dependencies
2. ✅ Build Lambda packages
3. ✅ Deploy CloudFormation stack
4. ✅ Upload Lambda functions
5. ✅ Show you the API endpoint

**At the end, you'll see:**
```
🔗 API Endpoint:
  https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify
```

**Copy this endpoint!**

---

### Option B: Manual Deployment (If Script Fails)

#### 3.1: Install Dependencies

```powershell
cd C:\Users\bennc\bedrock-app\lambda
npm install
```

#### 3.2: Create Zip Files

```powershell
# Create notification-handler.zip
Compress-Archive -Path notification-handler.js,node_modules -DestinationPath notification-handler.zip -Force

# Create scheduled-notifications.zip
Compress-Archive -Path scheduled-notifications.js,node_modules -DestinationPath scheduled-notifications.zip -Force
```

#### 3.3: Deploy CloudFormation Stack

```powershell
aws cloudformation deploy `
  --template-file cloudformation-template.yaml `
  --stack-name MumCareNotificationSystem `
  --parameter-overrides FromEmail=noreply@mumcare.app `
  --capabilities CAPABILITY_NAMED_IAM `
  --region ap-southeast-1
```

Wait for this to complete (takes 2-3 minutes).

#### 3.4: Upload Lambda Code

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

#### 3.5: Get API Endpoint

```powershell
aws cloudformation describe-stacks `
  --stack-name MumCareNotificationSystem `
  --region ap-southeast-1 `
  --query 'Stacks[0].Outputs[?OutputKey==``NotificationApiEndpoint``].OutputValue' `
  --output text
```

**Copy the endpoint URL!**

---

## Step 4: Update .env File

1. Open `C:\Users\bennc\bedrock-app\.env` in a text editor

2. Add this line (replace with your actual endpoint):
   ```bash
   NOTIFICATION_API_ENDPOINT=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify
   ```

3. Save the file

---

## Step 5: Verify SES Email

```powershell
aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
```

**Check your email inbox** for a verification email from AWS.

**Click the verification link** in the email.

**Verify it worked:**
```powershell
aws ses list-verified-email-addresses --region ap-southeast-1
```

You should see `noreply@mumcare.app` in the list.

---

## Step 6: Test Notifications

### Quick Test

1. Edit `C:\Users\bennc\bedrock-app\lambda\quick-test.js`
2. Change line 14 to your email:
   ```javascript
   const YOUR_EMAIL = 'your-email@example.com';
   ```
3. Run:
   ```powershell
   cd C:\Users\bennc\bedrock-app\lambda
   npm run quick-test
   ```
4. Check your email inbox!

---

## Troubleshooting

### Error: "aws: command not found"

**Solution:** AWS CLI not installed or PowerShell not restarted.
1. Install AWS CLI from https://awscli.amazonaws.com/AWSCLIV2.msi
2. **Restart PowerShell**
3. Try again

---

### Error: "Unable to locate credentials"

**Solution:** AWS credentials not configured.

```powershell
aws configure
```

Enter your access key, secret key, region (ap-southeast-1), and format (json).

---

### Error: "Access Denied" or "User is not authorized"

**Solution:** Your AWS user needs permissions.

**Required permissions:**
- CloudFormation: Full access
- Lambda: Full access
- DynamoDB: Full access
- SES: Full access
- IAM: Create roles
- API Gateway: Full access
- EventBridge: Full access

**Quick fix:** Attach `AdministratorAccess` policy to your user (for testing).

1. Go to AWS Console → IAM → Users
2. Click your username
3. Click **Add permissions** → **Attach policies directly**
4. Search for `AdministratorAccess`
5. Check the box and click **Add permissions**

---

### Error: "Stack already exists"

**Solution:** Stack is already deployed. To update:

```powershell
aws cloudformation update-stack `
  --stack-name MumCareNotificationSystem `
  --template-body file://cloudformation-template.yaml `
  --parameters ParameterKey=FromEmail,ParameterValue=noreply@mumcare.app `
  --capabilities CAPABILITY_NAMED_IAM `
  --region ap-southeast-1
```

---

### Error: "Email address is not verified"

**Solution:** Verify your sender email in SES.

```powershell
aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
```

Check your email and click the verification link.

---

### Deployment takes too long

**Normal:** CloudFormation deployment takes 2-5 minutes. Be patient!

**Check progress:**
```powershell
aws cloudformation describe-stack-events `
  --stack-name MumCareNotificationSystem `
  --region ap-southeast-1 `
  --max-items 5
```

---

## Success Checklist

After deployment, verify:

- [ ] AWS CLI installed and configured
- [ ] CloudFormation stack deployed successfully
- [ ] Lambda functions uploaded
- [ ] API endpoint added to `.env` file
- [ ] SES email verified
- [ ] Test email received

---

## What Gets Created in AWS

The deployment creates:

1. **2 Lambda Functions**
   - MumCareNotificationHandler (sends notifications)
   - MumCareScheduledNotifications (checks for scheduled reminders)

2. **2 DynamoDB Tables**
   - MumCareUserProfiles (stores user notification preferences)
   - MumCareNotifications (logs sent notifications)

3. **1 API Gateway**
   - HTTP API with `/notify` endpoint

4. **1 EventBridge Rule**
   - Runs every hour to check for scheduled notifications

5. **IAM Roles**
   - Permissions for Lambda to access SES, DynamoDB, etc.

---

## Cost

**Free Tier (First 12 months):**
- Lambda: 1M requests/month FREE
- DynamoDB: 25GB storage FREE
- SES: 62,000 emails/month FREE
- API Gateway: 1M requests/month FREE

**After Free Tier:**
- ~$5-10/month for 1,000 active users

---

## Next Steps

Once deployed:

1. ✅ Test email notifications
2. ✅ Integrate with your app
3. ✅ Request SES production access (for production)
4. ✅ Add users to DynamoDB for scheduled notifications

---

## Need Help?

**Check CloudWatch Logs:**
```powershell
aws logs tail /aws/lambda/MumCareNotificationHandler --follow --region ap-southeast-1
```

**View Stack Status:**
```powershell
aws cloudformation describe-stacks --stack-name MumCareNotificationSystem --region ap-southeast-1
```

**Delete Everything (Start Over):**
```powershell
aws cloudformation delete-stack --stack-name MumCareNotificationSystem --region ap-southeast-1
```

---

## Quick Reference

**Deploy:**
```powershell
cd C:\Users\bennc\bedrock-app\lambda
.\deploy.ps1
```

**Get Endpoint:**
```powershell
aws cloudformation describe-stacks --stack-name MumCareNotificationSystem --region ap-southeast-1 --query 'Stacks[0].Outputs[?OutputKey==``NotificationApiEndpoint``].OutputValue' --output text
```

**Verify Email:**
```powershell
aws ses verify-email-identity --email-address noreply@mumcare.app --region ap-southeast-1
```

**Test:**
```powershell
cd C:\Users\bennc\bedrock-app\lambda
npm run quick-test
```

Good luck! 🌸
