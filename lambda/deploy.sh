#!/bin/bash

# MumCare Notification System Deployment Script
# This script deploys the Lambda functions and CloudFormation stack

set -e

echo "🌸 MumCare Notification System Deployment"
echo "=========================================="

# Configuration
STACK_NAME="MumCareNotificationSystem"
REGION="${AWS_REGION:-ap-southeast-1}"
FROM_EMAIL="${FROM_EMAIL:-noreply@mumcare.app}"

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if logged in to AWS
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS credentials verified"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build Lambda packages
echo ""
echo "🔨 Building Lambda packages..."
zip -r notification-handler.zip notification-handler.js node_modules/ > /dev/null
zip -r scheduled-notifications.zip scheduled-notifications.js node_modules/ > /dev/null

echo "✅ Lambda packages created"

# Deploy CloudFormation stack
echo ""
echo "☁️  Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file cloudformation-template.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    FromEmail=$FROM_EMAIL \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $REGION

echo "✅ CloudFormation stack deployed"

# Get function names
HANDLER_FUNCTION=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`NotificationHandlerFunctionArn`].OutputValue' \
  --output text | cut -d':' -f7)

SCHEDULED_FUNCTION="MumCareScheduledNotifications"

# Update Lambda function code
echo ""
echo "📤 Uploading Lambda function code..."

echo "Updating notification handler..."
aws lambda update-function-code \
  --function-name $HANDLER_FUNCTION \
  --zip-file fileb://notification-handler.zip \
  --region $REGION > /dev/null

echo "Updating scheduled notifications..."
aws lambda update-function-code \
  --function-name $SCHEDULED_FUNCTION \
  --zip-file fileb://scheduled-notifications.zip \
  --region $REGION > /dev/null

echo "✅ Lambda functions updated"

# Get API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`NotificationApiEndpoint`].OutputValue' \
  --output text)

# Clean up zip files
rm notification-handler.zip scheduled-notifications.zip

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📋 Stack Details:"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"
echo ""
echo "🔗 API Endpoint:"
echo "  $API_ENDPOINT"
echo ""
echo "📝 Next Steps:"
echo "  1. Verify your sender email in AWS SES:"
echo "     aws ses verify-email-identity --email-address $FROM_EMAIL --region $REGION"
echo ""
echo "  2. Update your .env file with:"
echo "     NOTIFICATION_API_ENDPOINT=$API_ENDPOINT"
echo ""
echo "  3. Test the notification system:"
echo "     npm run test-notification"
echo ""
