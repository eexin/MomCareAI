// Test all API endpoints
const https = require('https');

const API_BASE = 'https://qql26pimu7.execute-api.us-east-1.amazonaws.com/prod';

const tests = [
  {
    name: 'Complete Care Report',
    endpoint: '/api/complete-care-report',
    payload: {
      healthData: { sleepHours: 6, painLevel: 3, mood: 'good', stressLevel: 4 },
      profile: { locale: 'en' },
      recoveryStage: 5,
      weekNumber: 1
    }
  },
  {
    name: 'Breastfeeding Chat',
    endpoint: '/api/breastfeeding-chat',
    payload: {
      message: 'How often should I breastfeed?',
      history: [],
      locale: 'en'
    }
  },
  {
    name: 'Recovery Plan',
    endpoint: '/api/recovery-plan',
    payload: {
      recoveryStage: 5,
      deliveryMethod: 'vaginal',
      locale: 'en'
    }
  },
  {
    name: 'Community Discussion',
    endpoint: '/api/community-discussion',
    payload: {
      topic: 'Traditional postpartum practices',
      locale: 'en'
    }
  },
  {
    name: 'Day Summary',
    endpoint: '/api/day-summary',
    payload: {
      dayNumber: 5,
      activities: ['Rested', 'Fed baby', 'Short walk'],
      locale: 'en'
    }
  },
  {
    name: 'Meal Analysis',
    endpoint: '/api/meal-analysis',
    payload: {}
  }
];

async function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = new URL(API_BASE + test.endpoint);
    const payload = JSON.stringify(test.payload);
    
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
          resolve({ 
            name: test.name, 
            success: res.statusCode === 200, 
            statusCode: res.statusCode,
            response: json 
          });
        } catch (e) {
          resolve({ 
            name: test.name, 
            success: false, 
            statusCode: res.statusCode,
            error: 'Failed to parse response',
            rawData: data
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ 
        name: test.name, 
        success: false, 
        error: error.message 
      });
    });

    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing All API Endpoints\n');
  console.log('API Base:', API_BASE);
  console.log('='.repeat(70));
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📡 Testing: ${test.name}...`);
    const result = await testEndpoint(test);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ Success (${result.statusCode})`);
      if (result.response.report) {
        console.log(`   📄 Report: ${result.response.report.recoverySummary.message.substring(0, 60)}...`);
      } else if (result.response.response) {
        console.log(`   💬 Response: ${result.response.response.substring(0, 60)}...`);
      } else if (result.response.plan) {
        console.log(`   📋 Plan: ${result.response.plan.text.substring(0, 60)}...`);
      } else if (result.response.discussion) {
        console.log(`   🗣️  Discussion: ${result.response.discussion.substring(0, 60)}...`);
      } else if (result.response.summary) {
        console.log(`   📝 Summary: ${result.response.summary.substring(0, 60)}...`);
      } else if (result.response.analysis) {
        console.log(`   🍽️  Analysis: ${result.response.analysis}`);
      }
    } else {
      console.log(`   ❌ Failed (${result.statusCode || 'N/A'})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.response && result.response.error) {
        console.log(`   API Error: ${result.response.error}`);
      }
    }
    
    // Wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Summary:\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  });
  
  console.log(`\n📈 Results: ${successful}/${results.length} endpoints working`);
  
  if (successful === results.length) {
    console.log('\n🎉 All endpoints working perfectly!');
  } else {
    console.log(`\n⚠️  ${failed} endpoint(s) failed`);
  }
}

runTests().catch(console.error);
