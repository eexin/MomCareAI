// Test all notification types
const https = require('https');

const API_URL = 'https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify';

const notifications = [
  {
    name: 'Wellness Reminder',
    payload: {
      notificationType: 'wellness-reminder',
      userId: 'test-user',
      channel: 'email',
      data: {
        email: 'your-email@example.com',
        locale: 'en',
        motherName: 'Sarah',
        dayNumber: 5
      }
    }
  },
  {
    name: 'Emergency Alert',
    payload: {
      notificationType: 'emergency-alert',
      userId: 'test-user',
      channel: 'email',
      data: {
        email: 'your-email@example.com',
        locale: 'en',
        motherName: 'Sarah',
        symptoms: ['Heavy bleeding', 'Severe headache'],
        emergencyContacts: { hotline: '911' }
      }
    }
  },
  {
    name: 'Milestone Celebration',
    payload: {
      notificationType: 'milestone-celebration',
      userId: 'test-user',
      channel: 'email',
      data: {
        email: 'your-email@example.com',
        locale: 'en',
        motherName: 'Sarah',
        dayNumber: 7,
        milestone: 'One week of recovery completed!'
      }
    }
  },
  {
    name: 'PPD Concern',
    payload: {
      notificationType: 'ppd-concern',
      userId: 'test-user',
      channel: 'email',
      data: {
        email: 'your-email@example.com',
        locale: 'en',
        motherName: 'Sarah',
        concernLevel: 'moderate'
      }
    }
  }
];

async function sendNotification(notification) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const payload = JSON.stringify(notification.payload);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ name: notification.name, success: json.success, messageId: json.messageId });
        } catch (e) {
          reject(new Error(`Failed to parse response for ${notification.name}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testAll() {
  console.log('🧪 Testing All Notification Types\n');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const notification of notifications) {
    console.log(`\n📧 Testing: ${notification.name}...`);
    try {
      const result = await sendNotification(notification);
      results.push(result);
      console.log(`   ✅ Success! Message ID: ${result.messageId.substring(0, 20)}...`);
      
      // Wait 1 second between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ name: notification.name, success: false, error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log(`\n📈 Results: ${successful}/${results.length} successful`);
  
  if (successful === results.length) {
    console.log('\n🎉 All notifications working perfectly!');
    console.log('📧 Check your email at your-email@example.com');
  } else {
    console.log(`\n⚠️  ${failed} notification(s) failed`);
  }
}

testAll().catch(console.error);
