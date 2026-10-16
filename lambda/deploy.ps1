# MumCare Notification System Deployment Script (PowerShell)
# Run with: .\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "🌸 MumCare Notification System Deployment" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""

# Configuration
$STACK_NAME = "MumCareNotificationSystem"
$REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-southeast-1" }
$FROM_EMAIL = if ($env:FROM_EMAIL) { $env:FROM_EMAIL } else { "noreply@mumcare.app" }

# Check AWS CLI is installed
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Yellow
    exit 1
}

# Check if logged in to AWS
Write-Host ""
Write-Host "Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Not logged in"
    }
    Write-Host "✅ AWS credentials verified" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to AWS. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Build Lambda packages
Write-Host ""
Write-Host "🔨 Building Lambda packages..." -ForegroundColor Yellow

# Create zip files using PowerShell
if (Test-Path "notification-handler.zip") { Remove-Item "notification-handler.zip" }
if (Test-Path "scheduled-notifications.zip") { Remove-Item "scheduled-notifications.zip" }

Compress-Archive -Path notification-handler.js,node_modules -DestinationPath notification-handler.zip -CompressionLevel Optimal
Compress-Archive -Path scheduled-notifications.js,node_modules -DestinationPath scheduled-notifications.zip -CompressionLevel Optimal

Write-Host "✅ Lambda packages created" -ForegroundColor Green

# Deploy CloudFormation stack
Write-Host ""
Write-Host "☁️  Deploying CloudFormation stack..." -ForegroundColor Yellow
aws cloudformation deploy `
  --template-file cloudformation-template.yaml `
  --stack-name $STACK_NAME `
  --parameter-overrides FromEmail=$FROM_EMAIL `
  --capabilities CAPABILITY_NAMED_IAM `
  --region $REGION

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CloudFormation deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ CloudFormation stack deployed" -ForegroundColor Green

# Get function names
Write-Host ""
Write-Host "📋 Getting function names..." -ForegroundColor Yellow
$HANDLER_FUNCTION = "MumCareNotificationHandler"
$SCHEDULED_FUNCTION = "MumCareScheduledNotifications"

# Update Lambda function code
Write-Host ""
Write-Host "📤 Uploading Lambda function code..." -ForegroundColor Yellow

Write-Host "Updating notification handler..." -ForegroundColor Cyan
aws lambda update-function-code `
  --function-name $HANDLER_FUNCTION `
  --zip-file fileb://notification-handler.zip `
  --region $REGION | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update notification handler" -ForegroundColor Red
    exit 1
}

Write-Host "Updating scheduled notifications..." -ForegroundColor Cyan
aws lambda update-function-code `
  --function-name $SCHEDULED_FUNCTION `
  --zip-file fileb://scheduled-notifications.zip `
  --region $REGION | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update scheduled notifications" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Lambda functions updated" -ForegroundColor Green

# Get API endpoint
Write-Host ""
Write-Host "🔗 Getting API endpoint..." -ForegroundColor Yellow
$API_ENDPOINT = aws cloudformation describe-stacks `
  --stack-name $STACK_NAME `
  --region $REGION `
  --query 'Stacks[0].Outputs[?OutputKey==`NotificationApiEndpoint`].OutputValue' `
  --output text

# Clean up zip files
Remove-Item notification-handler.zip
Remove-Item scheduled-notifications.zip

Write-Host ""
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "📋 Stack Details:" -ForegroundColor Cyan
Write-Host "  Stack Name: $STACK_NAME" -ForegroundColor White
Write-Host "  Region: $REGION" -ForegroundColor White
Write-Host ""
Write-Host "🔗 API Endpoint:" -ForegroundColor Cyan
Write-Host "  $API_ENDPOINT" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Verify your sender email in AWS SES:" -ForegroundColor Yellow
Write-Host "     aws ses verify-email-identity --email-address $FROM_EMAIL --region $REGION" -ForegroundColor White
Write-Host ""
Write-Host "  2. Update your .env file with:" -ForegroundColor Yellow
Write-Host "     NOTIFICATION_API_ENDPOINT=$API_ENDPOINT" -ForegroundColor White
Write-Host ""
Write-Host "  3. Test the notification system:" -ForegroundColor Yellow
Write-Host "     npm run test-notification" -ForegroundColor White
Write-Host ""
