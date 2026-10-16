# Deploy MumCare App to AWS - Complete Guide

## Overview

You have 3 main options to deploy your app to AWS:

1. **AWS Amplify** (Easiest) - Automatic deployment from Git
2. **AWS S3 + CloudFront** (Most cost-effective) - Static hosting
3. **AWS Elastic Beanstalk** (Full-stack) - Includes backend server

## Option 1: AWS Amplify (Recommended - Easiest)

### What You Get
- ✅ Automatic HTTPS
- ✅ Custom domain support
- ✅ Automatic deployments from Git
- ✅ Built-in CI/CD
- ✅ Global CDN
- ✅ ~$15/month for small apps

### Step 1: Push to GitHub

```powershell
cd C:\Users\bennc\bedrock-app

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/mumcare-app.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy with Amplify

1. Go to: https://console.aws.amazon.com/amplify
2. Click **New app** → **Host web app**
3. Choose **GitHub** and authorize
4. Select your repository: `mumcare-app`
5. Branch: `main`
6. **Build settings** - Amplify will auto-detect, but update to:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd client
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: client/dist
    files:
      - '**/*'
  cache:
    paths:
      - client/node_modules/**/*
backend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .
    files:
      - server/**/*
      - package.json
      - package-lock.json
```

7. **Advanced settings** → **Environment variables**:
   ```
   AWS_BEDROCK_API_KEY=your-key-here
   AWS_REGION=us-east-1
   AWS_BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
   NOTIFICATION_API_ENDPOINT=https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify
   ```

8. Click **Save and deploy**

### Step 3: Access Your App

After 5-10 minutes, you'll get a URL like:
```
https://main.d1234567890.amplifyapp.com
```

Your app is live! 🎉

---

## Option 2: S3 + CloudFront (Most Cost-Effective)

### What You Get
- ✅ Static hosting
- ✅ HTTPS via CloudFront
- ✅ Custom domain support
- ✅ ~$1-5/month
- ⚠️ Backend needs separate hosting

### Step 1: Build the Frontend

```powershell
cd C:\Users\bennc\bedrock-app\client
npm run build
```

This creates `client/dist` folder with your built app.

### Step 2: Create S3 Bucket

```powershell
# Create bucket (use a unique name)
aws s3 mb s3://mumcare-app-frontend --region ap-southeast-5

# Enable static website hosting
aws s3 website s3://mumcare-app-frontend --index-document index.html --error-document index.html

# Upload files
aws s3 sync client/dist s3://mumcare-app-frontend --delete

# Make public
aws s3api put-bucket-policy --bucket mumcare-app-frontend --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::mumcare-app-frontend/*"
  }]
}'
```

### Step 3: Create CloudFront Distribution

1. Go to: https://console.aws.amazon.com/cloudfront
2. Click **Create distribution**
3. **Origin domain**: Select your S3 bucket
4. **Viewer protocol policy**: Redirect HTTP to HTTPS
5. **Default root object**: `index.html`
6. Click **Create distribution**

Wait 10-15 minutes for deployment.

### Step 4: Deploy Backend

For the backend server, use:
- **AWS Lambda + API Gateway** (serverless)
- **AWS Elastic Beanstalk** (managed)
- **AWS EC2** (full control)

---

## Option 3: Elastic Beanstalk (Full-Stack)

### What You Get
- ✅ Frontend + Backend together
- ✅ Automatic scaling
- ✅ Load balancing
- ✅ HTTPS support
- ✅ ~$20-50/month

### Step 1: Prepare for Deployment

Create `.ebignore` file:

```bash
node_modules/
.git/
.env
*.log
.DS_Store
lambda/
```

Update `package.json` to include build script:

```json
{
  "scripts": {
    "start": "node server/index.js",
    "build": "cd client && npm install && npm run build",
    "postinstall": "npm run build"
  }
}
```

### Step 2: Initialize Elastic Beanstalk

```powershell
# Install EB CLI
pip install awsebcli

# Initialize
cd C:\Users\bennc\bedrock-app
eb init

# Choose:
# - Region: ap-southeast-5
# - Application name: mumcare-app
# - Platform: Node.js
# - SSH: Yes (optional)
```

### Step 3: Create Environment

```powershell
# Create environment
eb create mumcare-production

# Set environment variables
eb setenv AWS_BEDROCK_API_KEY=your-key-here AWS_REGION=us-east-1 AWS_BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0 NOTIFICATION_API_ENDPOINT=https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify
```

### Step 4: Deploy

```powershell
# Deploy
eb deploy

# Open in browser
eb open
```

---

## Comparison

| Feature | Amplify | S3 + CloudFront | Elastic Beanstalk |
|---------|---------|-----------------|-------------------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | $15/month | $1-5/month | $20-50/month |
| **Auto Deploy** | ✅ Yes | ❌ Manual | ✅ Yes |
| **HTTPS** | ✅ Auto | ✅ CloudFront | ✅ Auto |
| **Backend** | ✅ Included | ❌ Separate | ✅ Included |
| **Scaling** | ✅ Auto | ✅ CDN | ✅ Auto |
| **Best For** | Quick deploy | Static sites | Full control |

---

## Recommended: AWS Amplify

For your app, I recommend **AWS Amplify** because:
1. ✅ Easiest to set up
2. ✅ Handles both frontend and backend
3. ✅ Automatic HTTPS
4. ✅ Auto-deploys from Git
5. ✅ Built-in CI/CD

---

## Quick Start with Amplify

```powershell
# 1. Push to GitHub
cd C:\Users\bennc\bedrock-app
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub, then push

# 2. Go to AWS Amplify Console
# https://console.aws.amazon.com/amplify

# 3. Connect GitHub repo

# 4. Add environment variables

# 5. Deploy!
```

---

## Custom Domain (Optional)

### For Amplify:
1. Go to Amplify Console → Your app
2. Click **Domain management**
3. Click **Add domain**
4. Follow instructions to update DNS

### For CloudFront:
1. Request SSL certificate in ACM
2. Add CNAME to CloudFront distribution
3. Update DNS records

---

## Environment Variables

Make sure to set these in your deployment:

```bash
AWS_BEDROCK_API_KEY=your-bedrock-api-key
AWS_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
NOTIFICATION_API_ENDPOINT=https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify
PORT=3001
```

---

## Cost Estimates

### Amplify (Recommended)
- Build minutes: $0.01/minute
- Hosting: $0.15/GB stored + $0.15/GB served
- **Estimated**: $15-30/month for small app

### S3 + CloudFront
- S3 storage: $0.023/GB
- CloudFront: $0.085/GB
- **Estimated**: $1-5/month for small app

### Elastic Beanstalk
- EC2 t3.micro: $8.50/month
- Load balancer: $16/month
- **Estimated**: $25-50/month

---

## Security Checklist

Before going live:

- [ ] Enable HTTPS (automatic with Amplify/CloudFront)
- [ ] Set up proper CORS headers
- [ ] Secure environment variables
- [ ] Enable CloudWatch logging
- [ ] Set up AWS WAF (optional, for DDoS protection)
- [ ] Request SES production access
- [ ] Set up custom domain
- [ ] Enable CloudFront caching
- [ ] Set up monitoring/alerts

---

## Monitoring

### CloudWatch Logs
```powershell
# View application logs
aws logs tail /aws/elasticbeanstalk/mumcare-production/var/log/nodejs/nodejs.log --follow
```

### Amplify Logs
Available in Amplify Console → Your app → Build history

---

## Updating Your App

### Amplify
Just push to GitHub:
```powershell
git add .
git commit -m "Update"
git push
```
Amplify auto-deploys!

### S3 + CloudFront
```powershell
cd client
npm run build
aws s3 sync dist s3://mumcare-app-frontend --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Elastic Beanstalk
```powershell
eb deploy
```

---

## Need Help?

Choose your deployment method and I'll guide you through it step-by-step! 🚀

**Recommended**: Start with AWS Amplify for the easiest deployment.
