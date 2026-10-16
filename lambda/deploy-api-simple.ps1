# Simple API Deployment Script
param(
    [string]$StackName = "MumCareApiBackend",
    [string]$Region = "ap-southeast-5"
)

Write-Host "Deploying MumCare API Backend..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host ""

# Step 2: Create deployment package
Write-Host "Step 2: Creating deployment package..." -ForegroundColor Yellow

# Create minimal package.json for Lambda
@"
{
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.0.0"
  }
}
"@ | Out-File -FilePath "package-lambda.json" -Encoding utf8

# Copy and prepare files
Copy-Item "api-handler.js" -Destination "api-handler-deploy.js" -Force
Copy-Item "package-lambda.json" -Destination "package.json" -Force

# Install production dependencies
npm install --production --silent

# Create zip
if (Test-Path "api-handler.zip") {
    Remove-Item "api-handler.zip" -Force
}
Compress-Archive -Path "api-handler-deploy.js", "package.json", "node_modules" -DestinationPath "api-handler.zip" -Force

# Cleanup temp files
Remove-Item "api-handler-deploy.js" -Force
Remove-Item "package-lambda.json" -Force

Write-Host "Deployment package created" -ForegroundColor Green
Write-Host ""

# Step 3: Load environment variables
Write-Host "Step 3: Loading environment variables..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "..\\.env"
$apiKey = ""
$region = "us-east-1"
$modelId = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "AWS_BEDROCK_API_KEY=(.+)") {
            $apiKey = $matches[1]
        }
        if ($line -match "AWS_REGION=(.+)") {
            $region = $matches[1]
        }
        if ($line -match "AWS_BEDROCK_MODEL_ID=(.+)") {
            $modelId = $matches[1]
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Deploy CloudFormation
Write-Host "Step 4: Deploying CloudFormation stack..." -ForegroundColor Yellow
Write-Host "This may take 2-3 minutes..." -ForegroundColor Gray
Write-Host ""

aws cloudformation deploy `
    --template-file api-cloudformation.yaml `
    --stack-name $StackName `
    --parameter-overrides BedrockAPIKey=$apiKey BedrockRegion=$region BedrockModelId=$modelId `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "CloudFormation deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "CloudFormation deployed successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Upload Lambda code
Write-Host "Step 5: Uploading Lambda code..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name MumCareApiHandler `
    --zip-file fileb://api-handler.zip `
    --region $Region `
    --no-cli-pager

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload Lambda code" -ForegroundColor Red
    exit 1
}

Write-Host "Lambda code uploaded" -ForegroundColor Green
Write-Host ""

# Step 6: Get API endpoint
Write-Host "Step 6: Getting API endpoint..." -ForegroundColor Yellow
$endpoint = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" `
    --output text

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your API endpoint:" -ForegroundColor Yellow
Write-Host $endpoint -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create client\.env file with:" -ForegroundColor Gray
Write-Host "   VITE_API_URL=$endpoint" -ForegroundColor Gray
Write-Host "2. Deploy frontend: cd .. ; .\deploy-s3.ps1" -ForegroundColor Gray
Write-Host ""

# Save endpoint
$endpoint | Out-File -FilePath "api-endpoint.txt" -Encoding utf8 -NoNewline
Write-Host "API endpoint saved to api-endpoint.txt" -ForegroundColor Green
Write-Host ""
