const https = require('https');

function makeRequest(path, body) {
  return new Promise((resolve, reject) => {
    const fullPath = `/prod${path}`;
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
        console.log(`Response status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.log(`Raw response: ${data.substring(0, 300)}`);
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testRecoveryPlan() {
  console.log('Testing Recovery Plan Structured Response...\n');

  try {
    const recoveryPlan = await makeRequest('/api/recovery-plan', {
      recoveryStage: 8,
      deliveryMethod: 'vaginal',
      locale: 'en'
    });
    
    console.log('✓ Recovery Plan Response:');
    console.log('  - Has weekTheme:', !!recoveryPlan.plan?.weekTheme);
    console.log('  - Week Theme:', recoveryPlan.plan?.weekTheme);
    console.log('  - Has days array:', !!recoveryPlan.plan?.days);
    console.log('  - Number of days:', recoveryPlan.plan?.days?.length || 0);
    
    if (recoveryPlan.plan?.days && recoveryPlan.plan.days.length > 0) {
      console.log('\n  Sample Day 1:');
      const day1 = recoveryPlan.plan.days[0];
      console.log('    - Day:', day1.day);
      console.log('    - Focus:', day1.focus);
      console.log('    - Activities:', day1.activities);
      console.log('    - Nutrition:', day1.nutrition);
      console.log('    - Milestone:', day1.milestone || 'none');
      
      console.log('\n  Sample Day 7:');
      const day7 = recoveryPlan.plan.days[6];
      console.log('    - Day:', day7.day);
      console.log('    - Focus:', day7.focus);
      console.log('    - Activities:', day7.activities);
      console.log('    - Nutrition:', day7.nutrition);
      console.log('    - Milestone:', day7.milestone || 'none');
    } else if (recoveryPlan.plan?.text) {
      console.log('\n  Fallback to text format:');
      console.log('  - Text preview:', recoveryPlan.plan.text.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('✗ Recovery Plan Error:', error.message);
  }
}

testRecoveryPlan().catch(console.error);
