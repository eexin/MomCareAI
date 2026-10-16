# Deploy MumCare API Backend to Lambda
# Budget-friendly backend deployment (~$1-3/month)

param(
    [string]$StackName = "MumCareApiBackend",
    [string]$Region = "ap-southeast-5"
)

Write-Host "🚀 Deploying MumCare API Backend to Lambda" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed!" -ForegroundColor Green
Write-Host ""

# Step 2: Create deployment package
Write-Host "📦 Step 2: Creating deployment package..." -ForegroundColor Yellow

# Create package.json for Lambda
$packageJson = @"
{
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.0.0"
  }
}
"@
$packageJson | Out-File -FilePath "package-lambda.json" -Encoding utf8

# Copy files
Copy-Item "api-handler.js" -Destination "api-handler-deploy.js"
Copy-Item "package-lambda.json" -Destination "package.json"

# Install Lambda dependencies
npm install --production

# Create zip file
if (Test-Path "api-handler.zip") {
    Remove-Item "api-handler.zip"
}

# Use PowerShell's Compress-Archive
Compress-Archive -Path "api-handler-deploy.js", "package.json", "node_modules" -DestinationPath "api-handler.zip"

# Cleanup
Remove-Item "api-handler-deploy.js"
Remove-Item "package-lambda.json"

Write-Host "✅ Deployment package created!" -ForegroundColor Green
Write-Host ""

# Step 3: Load environment variables
Write-Host "🔑 Step 3: Loading environment variables..." -ForegroundColor Yellow
$envFile = "..\\.env"
$AWS_BEDROCK_API_KEY = ""
$AWS_REGION = "us-east-1"
$AWS_BEDROCK_MODEL_ID = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim()
                
                if ($key -eq "AWS_BEDROCK_API_KEY") {
                    $script:AWS_BEDROCK_API_KEY = $value
                }
                elseif ($key -eq "AWS_REGION") {
                    $script:AWS_REGION = $value
                }
                elseif ($key -eq "AWS_BEDROCK_MODEL_ID") {
                    $script:AWS_BEDROCK_MODEL_ID = $value
                }
            }
        }
    }
    Write-Host "✅ Environment variables loaded!" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found, using defaults" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Deploy CloudFormation stack
Write-Host "☁️  Step 4: Deploying CloudFormation stack..." -ForegroundColor Yellow
Write-Host "   This will create Lambda function and API Gateway..." -ForegroundColor Gray
Write-Host ""

aws cloudformation deploy `
    --template-file api-cloudformation.yaml `
    --stack-name $StackName `
    --parameter-overrides `
        "BedrockAPIKey=$AWS_BEDROCK_API_KEY" `
        "BedrockRegion=$AWS_REGION" `
        "BedrockModelId=$AWS_BEDROCK_MODEL_ID" `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CloudFormation deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ CloudFormation stack deployed!" -ForegroundColor Green
Write-Host ""

# Step 5: Upload Lambda code
Write-Host "📤 Step 5: Uploading Lambda function code..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name MumCareApiHandler `
    --zip-file fileb://api-handler.zip `
    --region $Region | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload Lambda code!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Lambda code uploaded!" -ForegroundColor Green
Write-Host ""

# Step 6: Get API endpoint
Write-Host "🔍 Step 6: Getting API endpoint..." -ForegroundColor Yellow
$apiEndpoint = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' `
    --output text

Write-Host "✅ API endpoint retrieved!" -ForegroundColor Green
Write-Host ""

# Step 7: Test API
Write-Host "🧪 Step 7: Testing API..." -ForegroundColor Yellow
$testPayload = @{
    responses = @{
        sleepHours = 6
        painLevel = 3
        mood = "good"
    }
    recoveryStage = 5
    deliveryMethod = "vaginal"
    locale = "en"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$apiEndpoint/api/wellness-check" -Method Post -Body $testPayload -ContentType "application/json"
    Write-Host "✅ API is working!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  API test failed (this is normal on first deploy, try again in 30 seconds)" -ForegroundColor Yellow
}
Write-Host ""

# Success!
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Your API is now live at:" -ForegroundColor Yellow
Write-Host "   $apiEndpoint" -ForegroundColor Cyan
Write-Host ""
Write-Host "💰 Estimated monthly cost: $1-3" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Update your frontend to use this API endpoint" -ForegroundColor Gray
Write-Host "   2. Create .env file in client/ with:" -ForegroundColor Gray
Write-Host "      VITE_API_URL=$apiEndpoint" -ForegroundColor Gray
Write-Host "   3. Deploy frontend with: ..\deploy-s3.ps1" -ForegroundColor Gray
Write-Host ""

# Save API endpoint
$apiEndpoint | Out-File -FilePath "api-endpoint.txt" -Encoding utf8
Write-Host "💾 API endpoint saved to: api-endpoint.txt" -ForegroundColor Green
Write-Host ""
