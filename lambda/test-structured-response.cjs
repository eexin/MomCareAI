const https = require('https');

const API_URL = 'https://qql26pimu7.execute-api.us-east-1.amazonaws.com/prod';

function makeRequest(path, body) {
  return new Promise((resolve, reject) => {
    const fullPath = `/prod${path}`;  // Add /prod prefix
    const postData = JSON.stringify(body);

    const options = {
      hostname: 'qql26pimu7.execute-api.us-east-1.amazonaws.com',
      port: 443,
      path: fullPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`  Response status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.log(`  Raw response: ${data.substring(0, 200)}`);
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testStructuredResponses() {
  console.log('Testing Structured AI Responses...\n');

  // Test 1: Complete Care Report
  console.log('1. Testing Complete Care Report...');
  try {
    const careReport = await makeRequest('/api/complete-care-report', {
      healthData: {
        sleepHours: 6,
        painLevel: 3,
        mood: 'calm',
        stressLevel: 4,
        symptoms: ['back-pain'],
        routines: ['showered', 'ate-meals', 'drank-water']
      },
      profile: {
        locale: 'en',
        deliveryMethod: 'vaginal'
      },
      recoveryStage: 5,
      weekNumber: 1
    });
    
    console.log('✓ Care Report Response:');
    console.log('  - Recovery Summary Status:', careReport.report?.recoverySummary?.status);
    console.log('  - Recovery Summary Message:', careReport.report?.recoverySummary?.message?.substring(0, 100) + '...');
    console.log('  - Today\'s Priority:', careReport.report?.todaysPriority?.substring(0, 80) + '...');
    console.log('  - Quick Tip:', careReport.report?.quickTip?.substring(0, 80) + '...');
    console.log('');
  } catch (error) {
    console.error('✗ Care Report Error:', error.message);
  }

  // Test 2: Recovery Plan
  console.log('2. Testing Recovery Plan...');
  try {
    const recoveryPlan = await makeRequest('/api/recovery-plan', {
      recoveryStage: 10,
      deliveryMethod: 'c-section',
      locale: 'en'
    });
    
    console.log('✓ Recovery Plan Response:');
    const planText = recoveryPlan.plan?.text || '';
    console.log('  - Has "Week Overview":', planText.includes('Week Overview') || planText.includes('**Week'));
    console.log('  - Has "Daily Focus":', planText.includes('Daily Focus') || planText.includes('Focus Areas'));
    console.log('  - Has "Physical Recovery":', planText.includes('Physical Recovery'));
    console.log('  - Has "Nutrition":', planText.includes('Nutrition'));
    console.log('  - Has "Warning Signs":', planText.includes('Warning Signs'));
    console.log('  - Preview:', planText.substring(0, 150) + '...');
    console.log('');
  } catch (error) {
    console.error('✗ Recovery Plan Error:', error.message);
  }

  // Test 3: Community Discussion
  console.log('3. Testing Community Discussion...');
  try {
    const discussion = await makeRequest('/api/community-discussion', {
      topic: 'Managing visitors after birth',
      locale: 'en'
    });
    
    console.log('✓ Community Discussion Response:');
    const discussionText = discussion.discussion || '';
    console.log('  - Has "Introduction":', discussionText.includes('Introduction') || discussionText.includes('**Introduction'));
    console.log('  - Has "Western Perspective":', discussionText.includes('Western'));
    console.log('  - Has "Asian Perspective":', discussionText.includes('Asian'));
    console.log('  - Has "Common Themes":', discussionText.includes('Common Themes'));
    console.log('  - Has "Practical Takeaways":', discussionText.includes('Practical Takeaways') || discussionText.includes('Takeaways'));
    console.log('  - Preview:', discussionText.substring(0, 150) + '...');
    console.log('');
  } catch (error) {
    console.error('✗ Community Discussion Error:', error.message);
  }

  console.log('Testing complete!');
}

testStructuredResponses().catch(console.error);
