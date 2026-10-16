# Notification System Quick Reference

## Notification Types

### 1. Wellness Reminder
Daily reminder to complete wellness check.

**Trigger**: Scheduled (EventBridge)  
**Channel**: Email, SMS, or Push  
**Languages**: EN, ZH, MS

```json
{
  "notificationType": "wellness-reminder",
  "userId": "user123",
  "channel": "email",
  "data": {
    "email": "user@example.com",
    "locale": "en",
    "motherName": "Sarah",
    "dayNumber": 5
  }
}
```

---

### 2. Emergency Alert
Immediate alert for concerning symptoms.

**Trigger**: API call (when symptoms detected)  
**Channel**: Email + SMS (multi-channel)  
**Languages**: EN, ZH, MS

```json
{
  "notificationType": "emergency-alert",
  "userId": "user123",
  "channel": "email",
  "data": {
    "email": "user@example.com",
    "phoneNumber": "+60123456789",
    "locale": "en",
    "symptoms": ["Heavy bleeding", "Severe headache"],
    "emergencyContacts": { "hotline": "999" }
  }
}
```

**Emergency Symptoms**:
- Heavy bleeding
- Severe headache
- Chest pain
- Difficulty breathing
- Severe abdominal pain
- High fever
- Seizures
- Loss of consciousness
- Severe swelling
- Vision changes

---

### 3. Milestone Celebration
Weekly recovery achievements.

**Trigger**: Scheduled (EventBridge) or API call  
**Channel**: Email or Push  
**Languages**: EN, ZH, MS

```json
{
  "notificationType": "milestone-celebration",
  "userId": "user123",
  "channel": "email",
  "data": {
    "email": "user@example.com",
    "locale": "en",
    "motherName": "Sarah",
    "dayNumber": 7,
    "milestone": "You've completed 1 week of recovery!"
  }
}
```

**Milestones**:
- Day 1: First day of recovery
- Day 3: 3 days postpartum
- Day 7: One week completed
- Day 14: Two weeks postpartum
- Day 21: Three weeks
- Day 28: One month
- Day 42: Six weeks (traditional recovery period)

---

### 4. PPD Concern
Alert for postpartum depression indicators.

**Trigger**: API call (when PPD indicators detected)  
**Channel**: Email or Push  
**Languages**: EN, ZH, MS

```json
{
  "notificationType": "ppd-concern",
  "userId": "user123",
  "channel": "email",
  "data": {
    "email": "user@example.com",
    "locale": "en",
    "motherName": "Sarah",
    "concernLevel": "moderate"
  }
}
```

**PPD Indicators**:
- Mood: sad, depressed, hopeless, anxious, overwhelmed
- Sleep: < 4 hours
- Stress: ≥ 8/10
- Symptoms: crying, panic, anxiety, worthless, guilt

**Concern Levels**:
- `moderate`: Score 4-5
- `high`: Score ≥ 6

---

### 5. Medication Reminder
Reminder to take medication.

**Trigger**: Scheduled (EventBridge)  
**Channel**: SMS or Push  
**Languages**: EN, ZH, MS

```json
{
  "notificationType": "medication-reminder",
  "userId": "user123",
  "channel": "sms",
  "data": {
    "phoneNumber": "+60123456789",
    "locale": "en",
    "medicationName": "Ibuprofen",
    "dosage": "400mg",
    "time": "14:00"
  }
}
```

---

### 6. Feeding Reminder
Reminder for breastfeeding/feeding time.

**Trigger**: Scheduled (EventBridge) or API call  
**Channel**: Push  
**Languages**: EN, ZH, MS

```json
{
  "notificationType": "feeding-reminder",
  "userId": "user123",
  "channel": "push",
  "data": {
    "locale": "en",
    "lastFeedingTime": "11:00 AM"
  }
}
```

---

## API Endpoints

### Send Notification
```
POST https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify
Content-Type: application/json

{
  "notificationType": "wellness-reminder",
  "userId": "user123",
  "channel": "email",
  "data": { ... }
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "abc123",
  "message": "Notification sent successfully"
}
```

---

## User Profile Structure

```json
{
  "userId": "user123",
  "email": "user@example.com",
  "phoneNumber": "+60123456789",
  "motherName": "Sarah",
  "deliveryDate": "2026-05-01",
  "deliveryMethod": "vaginal",
  "locale": "en",
  "notificationSettings": {
    "enabled": true,
    "preferredChannel": "email",
    "wellnessReminder": true,
    "wellnessReminderTime": "09:00",
    "medicationReminders": true,
    "feedingReminders": false,
    "emergencyAlerts": true
  },
  "medications": [
    {
      "name": "Ibuprofen",
      "dosage": "400mg",
      "times": ["08:00", "14:00", "20:00"]
    }
  ],
  "emergencyContacts": {
    "hotline": "999",
    "doctor": "+60123456789"
  }
}
```

---

## Scheduled Notifications

**EventBridge Schedule**: Every hour (`cron(0 * * * ? *)`)

**Process**:
1. Scan `MumCareUserProfiles` table
2. Filter users with `notificationSettings.enabled = true`
3. Check if current time matches user's reminder time
4. Send appropriate notifications
5. Log to `MumCareNotifications` table

---

## Testing

### Test All Notifications
```bash
cd lambda
npm run test-notification
```

### Test Specific Notification
```bash
curl -X POST $NOTIFICATION_API_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "notificationType": "wellness-reminder",
    "userId": "test-user",
    "channel": "email",
    "data": {
      "email": "your-email@example.com",
      "locale": "en",
      "motherName": "Sarah",
      "dayNumber": 5
    }
  }'
```

### View Logs
```bash
# Notification Handler
aws logs tail /aws/lambda/MumCareNotificationHandler --follow

# Scheduled Notifications
aws logs tail /aws/lambda/MumCareScheduledNotifications --follow
```

---

## Common Commands

### Deploy Stack
```bash
cd lambda
./deploy.sh
```

### Update Lambda Code
```bash
npm install
zip -r notification-handler.zip notification-handler.js node_modules/
aws lambda update-function-code \
  --function-name MumCareNotificationHandler \
  --zip-file fileb://notification-handler.zip \
  --region ap-southeast-1
```

### Verify SES Email
```bash
aws ses verify-email-identity \
  --email-address noreply@mumcare.app \
  --region ap-southeast-1
```

### Check SES Status
```bash
aws ses list-verified-email-addresses --region ap-southeast-1
```

### Add User to DynamoDB
```bash
aws dynamodb put-item \
  --table-name MumCareUserProfiles \
  --item file://user-profile.json \
  --region ap-southeast-1
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Verify SES email, check sandbox mode |
| SMS not sending | Check phone format, SNS limits |
| Lambda errors | Check CloudWatch logs |
| Scheduled not running | Verify EventBridge rule enabled |
| API errors | Check API Gateway deployment |

---

## Cost Estimate (1,000 users)

| Service | Cost/Month |
|---------|------------|
| Lambda | $0.10 |
| DynamoDB | $2.00 |
| SES | $3.00 |
| SNS SMS | $32.25 (optional) |
| API Gateway | $0.05 |
| **Total** | **$5.15 - $37.40** |

---

## Support Resources

- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [AWS SES Docs](https://docs.aws.amazon.com/ses/)
- [AWS SNS Docs](https://docs.aws.amazon.com/sns/)
- [AWS DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)
