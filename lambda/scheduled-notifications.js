/**
 * AWS Lambda Function: Scheduled Notifications
 * Triggered by EventBridge (CloudWatch Events) to send scheduled reminders
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || 'MumCareUserProfiles';
const NOTIFICATION_HANDLER_FUNCTION = process.env.NOTIFICATION_HANDLER_FUNCTION || 'MumCareNotificationHandler';

/**
 * Main handler - triggered by EventBridge schedule
 */
export const handler = async (event) => {
  console.log('Scheduled notification check triggered:', JSON.stringify(event, null, 2));
  
  try {
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Scan for users who need notifications at this time
    const users = await getUsersNeedingNotifications(currentHour, currentMinute);
    
    console.log(`Found ${users.length} users needing notifications`);
    
    // Send notifications for each user
    const results = await Promise.allSettled(
      users.map(user => processUserNotifications(user, now))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Scheduled notifications processed',
        totalUsers: users.length,
        successful,
        failed,
        timestamp: now.toISOString()
      })
    };
    
  } catch (error) {
    console.error('Scheduled notification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process scheduled notifications',
        details: error.message
      })
    };
  }
};

/**
 * Get users who need notifications at this time
 */
async function getUsersNeedingNotifications(hour, minute) {
  const params = {
    TableName: USER_PROFILES_TABLE,
    FilterExpression: 'attribute_exists(notificationSettings) AND notificationSettings.enabled = :enabled',
    ExpressionAttributeValues: {
      ':enabled': true
    }
  };
  
  const command = new ScanCommand(params);
  const result = await dynamoClient.send(command);
  
  // Filter users based on their notification schedule
  return (result.Items || []).filter(user => {
    const settings = user.notificationSettings;
    
    // Check if user wants notifications at this hour
    if (settings.wellnessReminderTime) {
      const [reminderHour, reminderMinute] = settings.wellnessReminderTime.split(':').map(Number);
      if (reminderHour === hour && Math.abs(reminderMinute - minute) < 5) {
        return true;
      }
    }
    
    return false;
  });
}

/**
 * Process notifications for a single user
 */
async function processUserNotifications(user, currentTime) {
  const notifications = [];
  const settings = user.notificationSettings;
  
  // Calculate recovery day
  const deliveryDate = new Date(user.deliveryDate);
  const daysSinceDelivery = Math.floor((currentTime - deliveryDate) / (1000 * 60 * 60 * 24));
  
  // 1. Daily wellness reminder
  if (settings.wellnessReminder) {
    notifications.push({
      notificationType: 'wellness-reminder',
      userId: user.userId,
      channel: settings.preferredChannel || 'email',
      data: {
        email: user.email,
        phoneNumber: user.phoneNumber,
        locale: user.locale || 'en',
        motherName: user.motherName,
        dayNumber: daysSinceDelivery
      }
    });
  }
  
  // 2. Medication reminders
  if (settings.medicationReminders && user.medications) {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    user.medications.forEach(med => {
      med.times.forEach(time => {
        const [hour, minute] = time.split(':').map(Number);
        if (hour === currentHour && Math.abs(minute - currentMinute) < 5) {
          notifications.push({
            notificationType: 'medication-reminder',
            userId: user.userId,
            channel: 'push',
            data: {
              phoneNumber: user.phoneNumber,
              locale: user.locale || 'en',
              medicationName: med.name,
              dosage: med.dosage,
              time: time
            }
          });
        }
      });
    });
  }
  
  // 3. Milestone celebrations (weekly)
  if (daysSinceDelivery > 0 && daysSinceDelivery % 7 === 0) {
    const weekNumber = Math.floor(daysSinceDelivery / 7);
    notifications.push({
      notificationType: 'milestone-celebration',
      userId: user.userId,
      channel: settings.preferredChannel || 'email',
      data: {
        email: user.email,
        phoneNumber: user.phoneNumber,
        locale: user.locale || 'en',
        motherName: user.motherName,
        dayNumber: daysSinceDelivery,
        milestone: `You've completed ${weekNumber} week${weekNumber > 1 ? 's' : ''} of recovery!`
      }
    });
  }
  
  // Send all notifications for this user
  return await Promise.all(
    notifications.map(notification => invokeNotificationHandler(notification))
  );
}

/**
 * Invoke the notification handler Lambda function
 */
async function invokeNotificationHandler(notification) {
  const params = {
    FunctionName: NOTIFICATION_HANDLER_FUNCTION,
    InvocationType: 'Event', // Async invocation
    Payload: JSON.stringify(notification)
  };
  
  const command = new InvokeCommand(params);
  const result = await lambdaClient.send(command);
  
  console.log(`Notification sent for user ${notification.userId}:`, result.StatusCode);
  return result;
}
