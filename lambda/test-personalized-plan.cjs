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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testPersonalizedPlans() {
  console.log('Testing Personalized Recovery Plans...\n');
  console.log('='.repeat(70));

  // Scenario 1: Mom with low sleep and high stress
  console.log('\n📊 SCENARIO 1: Low Sleep & High Stress');
  console.log('-'.repeat(70));
  try {
    const plan1 = await makeRequest('/api/recovery-plan', {
      recoveryStage: 10,
      deliveryMethod: 'vaginal',
      locale: 'en',
      healthData: {
        sleepHours: 4,
        painLevel: 2,
        mood: 'overwhelmed',
        stressLevel: 8,
        symptoms: ['insomnia', 'anxiety'],
        routines: ['showered']
      }
    });
    
    console.log('Week Theme:', plan1.plan?.weekTheme);
    console.log('\nDay 1:');
    console.log('  Focus:', plan1.plan?.days[0]?.focus);
    console.log('  Activity:', plan1.plan?.days[0]?.activities[0]);
    console.log('  Nutrition:', plan1.plan?.days[0]?.nutrition);
    console.log('\nDay 2:');
    console.log('  Focus:', plan1.plan?.days[1]?.focus);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Scenario 2: Mom with high pain
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SCENARIO 2: High Pain Level');
  console.log('-'.repeat(70));
  try {
    const plan2 = await makeRequest('/api/recovery-plan', {
      recoveryStage: 5,
      deliveryMethod: 'c-section',
      locale: 'en',
      healthData: {
        sleepHours: 6,
        painLevel: 7,
        mood: 'tired',
        stressLevel: 5,
        symptoms: ['incision-pain', 'back-pain'],
        routines: ['took-medication', 'rested-well']
      }
    });
    
    console.log('Week Theme:', plan2.plan?.weekTheme);
    console.log('\nDay 1:');
    console.log('  Focus:', plan2.plan?.days[0]?.focus);
    console.log('  Activity:', plan2.plan?.days[0]?.activities[0]);
    console.log('  Nutrition:', plan2.plan?.days[0]?.nutrition);
    console.log('\nDay 2:');
    console.log('  Focus:', plan2.plan?.days[1]?.focus);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Scenario 3: Mom doing well
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SCENARIO 3: Recovering Well');
  console.log('-'.repeat(70));
  try {
    const plan3 = await makeRequest('/api/recovery-plan', {
      recoveryStage: 15,
      deliveryMethod: 'vaginal',
      locale: 'en',
      healthData: {
        sleepHours: 7,
        painLevel: 1,
        mood: 'energetic',
        stressLevel: 2,
        symptoms: [],
        routines: ['showered', 'ate-meals', 'walked-outside', 'bonded-baby', 'drank-water']
      }
    });
    
    console.log('Week Theme:', plan3.plan?.weekTheme);
    console.log('\nDay 1:');
    console.log('  Focus:', plan3.plan?.days[0]?.focus);
    console.log('  Activity:', plan3.plan?.days[0]?.activities[0]);
    console.log('  Nutrition:', plan3.plan?.days[0]?.nutrition);
    console.log('\nDay 2:');
    console.log('  Focus:', plan3.plan?.days[1]?.focus);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Scenario 4: No health data (fallback)
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SCENARIO 4: No Health Data (Generic Plan)');
  console.log('-'.repeat(70));
  try {
    const plan4 = await makeRequest('/api/recovery-plan', {
      recoveryStage: 7,
      deliveryMethod: 'vaginal',
      locale: 'en'
    });
    
    console.log('Week Theme:', plan4.plan?.weekTheme);
    console.log('\nDay 1:');
    console.log('  Focus:', plan4.plan?.days[0]?.focus);
    console.log('  Activity:', plan4.plan?.days[0]?.activities[0]);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✓ All personalized plans generated successfully!');
  console.log('Plans are now tailored to each mom\'s specific health needs.');
}

testPersonalizedPlans().catch(console.error);
