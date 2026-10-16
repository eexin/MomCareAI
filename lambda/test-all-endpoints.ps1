# Test all Lambda API endpoints

$apiUrl = "https://qql26pimu7.execute-api.us-east-1.amazonaws.com/prod"

Write-Host "`n=== Testing Complete Care Report ===" -ForegroundColor Cyan
$body1 = @{
    healthData = @{
        sleepHours = 6
        painLevel = 3
        mood = "good"
        stressLevel = 4
    }
    profile = @{
        motherName = "Test"
        deliveryMethod = "vaginal"
        locale = "en"
    }
    recoveryStage = 5
    weekNumber = 1
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Uri "$apiUrl/api/complete-care-report" -Method Post -Body $body1 -ContentType "application/json"
    Write-Host "✓ Complete Care Report: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response1.report.recoverySummary.message.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Complete Care Report: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Testing Breastfeeding Chat ===" -ForegroundColor Cyan
$body2 = @{
    message = "How often should I breastfeed?"
    history = @()
    locale = "en"
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri "$apiUrl/api/breastfeeding-chat" -Method Post -Body $body2 -ContentType "application/json"
    Write-Host "✓ Breastfeeding Chat: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response2.response.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Breastfeeding Chat: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Testing Recovery Plan ===" -ForegroundColor Cyan
$body3 = @{
    recoveryStage = 5
    deliveryMethod = "vaginal"
    locale = "en"
} | ConvertTo-Json -Depth 10

try {
    $response3 = Invoke-RestMethod -Uri "$apiUrl/api/recovery-plan" -Method Post -Body $body3 -ContentType "application/json"
    Write-Host "✓ Recovery Plan: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response3.plan.text.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Recovery Plan: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Testing Community Discussion ===" -ForegroundColor Cyan
$body4 = @{
    topic = "Postpartum recovery tips"
    locale = "en"
} | ConvertTo-Json -Depth 10

try {
    $response4 = Invoke-RestMethod -Uri "$apiUrl/api/community-discussion" -Method Post -Body $body4 -ContentType "application/json"
    Write-Host "✓ Community Discussion: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response4.discussion.Substring(0, 50))..." -ForegroundColor Gray
} catch {
    Write-Host "✗ Community Discussion: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Testing Meal Analysis ===" -ForegroundColor Cyan
$body5 = @{
    description = "Chicken soup with vegetables"
    locale = "en"
} | ConvertTo-Json -Depth 10

try {
    $response5 = Invoke-RestMethod -Uri "$apiUrl/api/meal-analysis" -Method Post -Body $body5 -ContentType "application/json"
    Write-Host "✓ Meal Analysis: SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($response5.analysis)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Meal Analysis: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "All critical endpoints tested. Check results above." -ForegroundColor Yellow
Write-Host "`nYou can now test the app at: https://d2zzqvvvvvvvvv.cloudfront.net" -ForegroundColor Green
