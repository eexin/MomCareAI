# 🚀 Quick Start: Deploy MumCare App to AWS

**Budget: $50/month** | **Estimated Cost: $4-13/month** | **Remaining: $37-46 for Bedrock AI** ✅

---

## ⚡ Quick Deploy (3 Steps)

### Step 1: Deploy Backend API (~5 minutes)

```powershell
cd C:\Users\bennc\bedrock-app\lambda
.\deploy-api.ps1
```

**What this does:**
- ✅ Creates Lambda function for your API
- ✅ Sets up API Gateway with HTTPS
- ✅ Configures all 8 API endpoints
- ✅ Costs: ~$1-3/month

**You'll get an API endpoint like:**
```
https://abc123xyz.execute-api.ap-southeast-5.amazonaws.com/prod
```

---

### Step 2: Deploy Frontend to S3 (~3 minutes)

```powershell
cd C:\Users\bennc\bedrock-app

# Create client .env file with your API endpoint
echo "VITE_API_URL=https://YOUR-API-ENDPOINT-FROM-STEP-1" > client\.env

# Deploy to S3
.\deploy-s3.ps1
```

**What this does:**
- ✅ Builds your React app
- ✅ Creates S3 bucket
- ✅ Uploads files
- ✅ Enables static website hosting
- ✅ Costs: ~$1-2/month

**Your app will be live at:**
```
http://mumcare-app-frontend.s3-website.ap-southeast-5.amazonaws.com
```

⚠️ **Note**: This uses HTTP (not HTTPS). Continue to Step 3 for HTTPS.

---

### Step 3: Add HTTPS with CloudFront (~15 minutes)

```powershell
.\setup-cloudfront.ps1
```

**What this does:**
- ✅ Creates CloudFront distribution
- ✅ Enables HTTPS automatically
- ✅ Sets up global CDN (faster worldwide)
- ✅ Costs: ~$0.50-4/month

**Your app will be available at:**
```
https://d1234567890.cloudfront.net
```

⏳ **Wait 10-15 minutes** for CloudFront to deploy globally.

---

## 🎉 Done! Your App is Live!

**Total time**: ~20-25 minutes  
**Total cost**: ~$4-13/month  
**Budget remaining**: $37-46/month for Bedrock AI ✅

---

## 📊 What You've Deployed

| Service | Purpose | Monthly Cost |
|---------|---------|--------------|
| **Lambda (API)** | Backend API endpoints | $1-3 |
| **Lambda (Notifications)** | Email system | $1-2 |
| **S3** | Store app files | $0.50-1 |
| **CloudFront** | HTTPS + CDN | $0.50-4 |
| **DynamoDB** | User data | $1 |
| **SES** | Email sending | $0-1 |
| **API Gateway** | API access | $0-1 |
| **TOTAL** | | **$4-13** |

---

## 🔄 Update Your App (Future Changes)

Whenever you make changes to your code:

```powershell
cd C:\Users\bennc\bedrock-app

# Quick update (builds and uploads)
.\update-app.ps1
```

Changes will be live in 1-2 minutes!

---

## 🔧 Troubleshooting

### Issue: "Build failed"

```powershell
cd client
npm install
npm run build
```

### Issue: "API endpoint not found"

Make sure you created `client\.env` with your API endpoint:
```
VITE_API_URL=https://YOUR-API-ENDPOINT
```

### Issue: "CORS error"

Your Lambda API has CORS enabled. If you still see errors:
1. Check CloudWatch logs: `aws logs tail /aws/lambda/MumCareApiHandler --follow --region ap-southeast-5`
2. Verify API endpoint is correct in `client\.env`

### Issue: "CloudFront takes too long"

CloudFront deployment takes 10-15 minutes. Check status:
```powershell
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`MumCare App - CloudFront Distribution`].[Id,Status]'
```

---

## 💰 Monitor Your Costs

### Set Up Billing Alert

1. Go to: https://console.aws.amazon.com/billing
2. Click **Budgets** → **Create budget**
3. Set budget: **$50/month**
4. Add email alert at: **$40 (80%)**

### Check Current Costs

```powershell
aws ce get-cost-and-usage --time-period Start=2026-05-01,End=2026-05-31 --granularity MONTHLY --metrics BlendedCost
```

---

## 🌐 Optional: Custom Domain

If you have a domain (e.g., `mumcare.app`):

### 1. Request SSL Certificate (Free)

```powershell
aws acm request-certificate --domain-name mumcare.app --validation-method DNS --region us-east-1
```

### 2. Add to CloudFront

1. Go to CloudFront console
2. Edit your distribution
3. Add alternate domain name: `mumcare.app`
4. Select your SSL certificate

### 3. Update DNS

Add CNAME record:
```
mumcare.app → d1234567890.cloudfront.net
```

---

## 📱 Test Your Live App

### 1. Open your CloudFront URL

```
https://d1234567890.cloudfront.net
```

### 2. Test all features:

- [ ] Dashboard loads
- [ ] Wellness check works
- [ ] Breastfeeding chat responds
- [ ] Meal analyzer works (upload photo)
- [ ] Recovery plan generates
- [ ] Settings save
- [ ] Notifications work

### 3. Check API logs:

```powershell
aws logs tail /aws/lambda/MumCareApiHandler --follow --region ap-southeast-5
```

---

## 🔐 Security Checklist

- [x] HTTPS enabled (CloudFront)
- [x] API keys in environment variables (not in code)
- [x] CORS configured properly
- [x] S3 bucket policy (public read only)
- [ ] Billing alerts set up
- [ ] CloudWatch logging enabled

---

## 📞 Need Help?

### Common Issues:

1. **API not responding**: Check Lambda logs
2. **CORS errors**: Verify API endpoint in client/.env
3. **High costs**: Check CloudWatch for errors causing retries
4. **Slow loading**: CloudFront cache warming up (wait 5-10 minutes)

### Useful Commands:

```powershell
# View API logs
aws logs tail /aws/lambda/MumCareApiHandler --follow --region ap-southeast-5

# View notification logs
aws logs tail /aws/lambda/MumCareNotificationHandler --follow --region ap-southeast-5

# Check CloudFormation stacks
aws cloudformation list-stacks --region ap-southeast-5

# Check S3 buckets
aws s3 ls

# Check CloudFront distributions
aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,DomainName,Status]'
```

---

## 🎯 Next Steps

1. ✅ **Deploy your app** (follow steps above)
2. ✅ **Set up billing alerts**
3. ✅ **Test all features**
4. ✅ **Share with users!**
5. 📱 **Optional**: Set up custom domain
6. 📊 **Optional**: Set up monitoring dashboard

---

## 📚 More Information

- **Full deployment guide**: `DEPLOY-S3-CLOUDFRONT.md`
- **Notification system**: `NOTIFICATION-SUMMARY.md`
- **Testing notifications**: `HOW-TO-TEST-NOTIFICATIONS.md`
- **General AWS deployment**: `DEPLOY-TO-AWS.md`

---

**Ready to deploy?** Run the commands above and your app will be live in ~20 minutes! 🚀

