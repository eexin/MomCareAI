/**
 * Test script for MumCare notification system
 * Run with: node test-notification.js
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '../.env' });

const API_ENDPOINT = process.env.NOTIFICATION_API_ENDPOINT;

if (!API_ENDPOINT) {
  console.error('❌ NOTIFICATION_API_ENDPOINT not set in .env file');
  process.exit(1);
}

async function testNotification(notificationType, data) {
  console.log(`\n🧪 Testing ${notificationType}...`);
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType,
        userId: 'test-user-123',
        channel: data.channel || 'email',
        data
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
    } else {
      console.log('❌ Failed:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🌸 MumCare Notification System Test');
  console.log('====================================');
  console.log(`API Endpoint: ${API_ENDPOINT}`);
  
  // Test 1: Wellness Reminder
  await testNotification('wellness-reminder', {
    email: 'test@example.com',
    locale: 'en',
    motherName: 'Sarah',
    dayNumber: 5,
    channel: 'email'
  });
  
  // Test 2: Emergency Alert
  await testNotification('emergency-alert', {
    email: 'test@example.com',
    phoneNumber: '+60123456789',
    locale: 'en',
    symptoms: ['Heavy bleeding', 'Severe headache'],
    emergencyContacts: { hotline: '999' },
    channel: 'email'
  });
  
  // Test 3: Milestone Celebration
  await testNotification('milestone-celebration', {
    email: 'test@example.com',
    locale: 'en',
    motherName: 'Sarah',
    dayNumber: 7,
    milestone: "You've completed 1 week of recovery!",
    channel: 'email'
  });
  
  // Test 4: PPD Concern
  await testNotification('ppd-concern', {
    email: 'test@example.com',
    locale: 'en',
    motherName: 'Sarah',
    concernLevel: 'moderate',
    channel: 'email'
  });
  
  // Test 5: Medication Reminder (SMS)
  await testNotification('medication-reminder', {
    phoneNumber: '+60123456789',
    locale: 'en',
    medicationName: 'Ibuprofen',
    dosage: '400mg',
    time: '14:00',
    channel: 'sms'
  });
  
  // Test 6: Chinese Language
  await testNotification('wellness-reminder', {
    email: 'test@example.com',
    locale: 'zh',
    motherName: '小美',
    dayNumber: 3,
    channel: 'email'
  });
  
  // Test 7: Bahasa Malaysia
  await testNotification('wellness-reminder', {
    email: 'test@example.com',
    locale: 'ms',
    motherName: 'Siti',
    dayNumber: 10,
    channel: 'email'
  });
  
  console.log('\n====================================');
  console.log('✅ All tests completed!');
  console.log('\n📧 Check your email inbox for test notifications');
  console.log('📱 Check CloudWatch logs for detailed execution logs');
}

runTests().catch(console.error);
