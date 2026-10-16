/**
 * Quick Email Notification Test
 * 
 * INSTRUCTIONS:
 * 1. Change YOUR_EMAIL below to your actual email address
 * 2. Run: node quick-test.js
 * 3. Check your email inbox (and spam folder)
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '../.env' });

// ⚠️ CHANGE THIS TO YOUR EMAIL ADDRESS ⚠️
const YOUR_EMAIL = 'your-email@example.com';

const API_ENDPOINT = process.env.NOTIFICATION_API_ENDPOINT;

async function quickTest() {
  console.log('\n🌸 MumCare Email Notification Test');
  console.log('===================================\n');
  
  // Validation
  if (!API_ENDPOINT) {
    console.error('❌ ERROR: NOTIFICATION_API_ENDPOINT not set in .env file');
    console.log('\nPlease add this to your .env file:');
    console.log('NOTIFICATION_API_ENDPOINT=https://xxxxx.execute-api.ap-southeast-1.amazonaws.com/prod/notify\n');
    process.exit(1);
  }
  
  if (YOUR_EMAIL === 'your-email@example.com') {
    console.error('❌ ERROR: Please change YOUR_EMAIL in quick-test.js to your actual email address\n');
    process.exit(1);
  }
  
  console.log(`📧 Sending test email to: ${YOUR_EMAIL}`);
  console.log(`🔗 API Endpoint: ${API_ENDPOINT}\n`);
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType: 'wellness-reminder',
        userId: 'test-user-' + Date.now(),
        channel: 'email',
        data: {
          email: YOUR_EMAIL,
          locale: 'en',
          motherName: 'Sarah',
          dayNumber: 5
        }
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ SUCCESS! Email sent successfully!\n');
      console.log(`📬 Message ID: ${result.messageId}\n`);
      console.log('📧 Check your email inbox for:');
      console.log('   Subject: 🌸 Time for Your Daily Wellness Check\n');
      console.log('💡 TIP: If you don\'t see it, check your spam/junk folder\n');
    } else {
      console.log('❌ FAILED to send email\n');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\n📋 Troubleshooting:');
      console.log('1. Check if SES email is verified:');
      console.log('   aws ses list-verified-email-addresses --region ap-southeast-1\n');
      console.log('2. Check CloudWatch logs:');
      console.log('   aws logs tail /aws/lambda/MumCareNotificationHandler --follow\n');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check if Lambda functions are deployed');
    console.log('2. Verify API endpoint in .env file');
    console.log('3. Check your internet connection\n');
  }
}

quickTest();
