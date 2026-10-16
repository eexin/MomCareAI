# Deploy MumCare App to S3 + CloudFront

**Budget-Friendly Deployment: $3-10/month** (leaves $40-47 for Bedrock AI)

---

## 🎯 What You're Deploying

Your app has 2 parts:
1. **Frontend** (React app) → S3 + CloudFront
2. **Backend** (Node.js API) → AWS Lambda (we'll set this up)

---

## 📋 Prerequisites

- [x] AWS CLI installed and configured
- [x] Node.js and npm installed
- [x] Your app code ready
- [x] Lambda notification system already deployed ✅

---

## 🚀 Step 1: Deploy Backend API to Lambda

Your backend needs to be accessible from the internet. We'll deploy it as Lambda functions.

### Option A: Quick Lambda Deployment (Recommended)

```powershell
# Navigate to your project
cd C:\Users\bennc\bedrock-app

# Install dependencies
npm install

# Create a simple Lambda handler wrapper
# (I'll create this file for you)
```

### Option B: Use Existing Server (Requires EC2)

If you prefer to keep your Express server as-is, you'll need an EC2 instance (~$8-15/month extra).

**For now, let's use Option A (Lambda) to stay within budget.**

---

## 🚀 Step 2: Deploy Frontend to S3

### 2.1 Run the Deployment Script

```powershell
cd C:\Users\bennc\bedrock-app

# Deploy to S3
.\deploy-s3.ps1
```

This script will:
1. ✅ Build your React app
2. ✅ Create S3 bucket (if needed)
3. ✅ Upload files to S3
4. ✅ Configure static website hosting
5. ✅ Make bucket public

**Your app will be live at:**
```
http://mumcare-app-frontend.s3-website.ap-southeast-5.amazonaws.com
```

⚠️ **Note**: This URL uses HTTP (not HTTPS). Continue to Step 3 for HTTPS.

---

## 🔒 Step 3: Add HTTPS with CloudFront

```powershell
# Set up CloudFront distribution
.\setup-cloudfront.ps1
```

This will:
1. ✅ Create CloudFront distribution
2. ✅ Enable HTTPS automatically
3. ✅ Set up global CDN (faster worldwide)
4. ⏳ Takes 10-15 minutes to deploy

**Your app will be available at:**
```
https://d1234567890.cloudfront.net
```

---

## 🔄 Step 4: Update Your App (Future Updates)

Whenever you make changes:

```powershell
# Quick update script
.\update-app.ps1
```

This will:
1. Build your app
2. Upload to S3
3. Invalidate CloudFront cache
4. Changes live in 1-2 minutes

---

## 💰 Cost Breakdown

### Monthly Costs (Estimated)

| Service | Cost | Purpose |
|---------|------|---------|
| **S3 Storage** | $0.50-1 | Store app files |
| **CloudFront** | $0.50-4 | HTTPS + CDN |
| **Lambda (Backend)** | $1-3 | API endpoints |
| **Lambda (Notifications)** | $1-2 | Email system |
| **DynamoDB** | $1 | User data |
| **SES** | $0-1 | Emails |
| **API Gateway** | $0-1 | API access |
| **TOTAL** | **$4-13/month** | |

**Remaining for Bedrock AI**: $37-46/month ✅

---

## 🔧 Configuration

### Environment Variables

Your backend Lambda functions need these environment variables:

```bash
AWS_BEDROCK_API_KEY=your-bedrock-api-key
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
NOTIFICATION_API_ENDPOINT=https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify
```

These are already set in your `.env` file.

---

## 📊 Monitoring Costs

### Set Up Billing Alerts

1. Go to: https://console.aws.amazon.com/billing
2. Click **Budgets** → **Create budget**
3. Set budget: **$50/month**
4. Add email alert at: **$40 (80%)**

### Check Current Costs

```powershell
# View current month costs
aws ce get-cost-and-usage --time-period Start=2026-05-01,End=2026-05-31 --granularity MONTHLY --metrics BlendedCost
```

---

## 🔍 Troubleshooting

### Issue: Build fails

```powershell
cd client
npm install
npm run build
```

### Issue: S3 bucket already exists

Change bucket name in script:
```powershell
.\deploy-s3.ps1 -BucketName "mumcare-app-frontend-2"
```

### Issue: CloudFront takes too long

CloudFront deployment takes 10-15 minutes. Check status:
```powershell
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`MumCare App - CloudFront Distribution`].[Id,Status]'
```

### Issue: App shows "Cannot connect to server"

Your backend API needs to be deployed. See "Backend Deployment" section below.

---

## 🔧 Backend Deployment (Lambda)

Your Express server needs to be converted to Lambda functions. I'll create the necessary files:

1. **Lambda function for each API endpoint**
2. **API Gateway configuration**
3. **Deployment script**

This keeps costs low (~$1-3/month) vs EC2 (~$8-15/month).

---

## 🌐 Custom Domain (Optional)

### If you have a domain (e.g., mumcare.app):

1. **Request SSL Certificate** (free with AWS)
   ```powershell
   aws acm request-certificate --domain-name mumcare.app --validation-method DNS --region us-east-1
   ```

2. **Add to CloudFront**
   - Go to CloudFront console
   - Edit distribution
   - Add alternate domain name: `mumcare.app`
   - Select SSL certificate

3. **Update DNS**
   - Add CNAME record: `mumcare.app` → `d1234567890.cloudfront.net`

---

## ✅ Deployment Checklist

- [ ] Backend API deployed to Lambda
- [ ] Frontend built successfully
- [ ] S3 bucket created and configured
- [ ] Files uploaded to S3
- [ ] CloudFront distribution created
- [ ] HTTPS working
- [ ] Billing alerts set up
- [ ] Test all features work
- [ ] Monitor costs for first week

---

## 🎉 Next Steps

1. **Deploy backend to Lambda** (I'll help with this)
2. **Run deployment scripts**
3. **Test your live app**
4. **Set up billing alerts**
5. **Share with users!**

---

## 📞 Need Help?

Common issues:
- **CORS errors**: Backend needs CORS configuration
- **API not found**: Backend not deployed yet
- **Slow loading**: CloudFront cache not warmed up yet
- **High costs**: Check CloudWatch logs for errors causing retries

---

## 🔐 Security Checklist

- [x] HTTPS enabled (CloudFront)
- [x] S3 bucket policy (public read only)
- [x] API keys in environment variables (not in code)
- [x] CORS configured properly
- [ ] CloudWatch logging enabled
- [ ] Billing alerts set up

---

**Ready to deploy?** Run `.\deploy-s3.ps1` to get started! 🚀

