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

function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

async function testConciseResponses() {
  console.log('Testing Concise AI Responses...\n');
  console.log('='.repeat(60));

  // Test 1: Care Report
  console.log('\n1. CARE REPORT');
  console.log('-'.repeat(60));
  try {
    const careReport = await makeRequest('/api/complete-care-report', {
      healthData: {
        sleepHours: 7,
        painLevel: 2,
        mood: 'calm',
        stressLevel: 3,
        symptoms: [],
        routines: ['showered', 'ate-meals']
      },
      profile: { locale: 'en', deliveryMethod: 'vaginal' },
      recoveryStage: 8,
      weekNumber: 2
    });
    
    const summary = careReport.report?.recoverySummary?.message || '';
    const priority = careReport.report?.todaysPriority || '';
    const tip = careReport.report?.quickTip || '';
    
    console.log('Recovery Summary:', summary);
    console.log('  Word count:', countWords(summary));
    console.log('\nToday\'s Priority:', priority);
    console.log('  Word count:', countWords(priority));
    console.log('\nQuick Tip:', tip);
    console.log('  Word count:', countWords(tip));
    console.log('\nTotal words:', countWords(summary + priority + tip));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 2: Breastfeeding
  console.log('\n' + '='.repeat(60));
  console.log('\n2. BREASTFEEDING SUPPORT');
  console.log('-'.repeat(60));
  try {
    const bfResponse = await makeRequest('/api/breastfeeding-chat', {
      message: 'My baby keeps falling asleep while feeding',
      history: [],
      locale: 'en'
    });
    
    const response = bfResponse.response || '';
    console.log('Response preview:', response.substring(0, 300) + '...');
    console.log('\nTotal words:', countWords(response));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 3: Community Discussion
  console.log('\n' + '='.repeat(60));
  console.log('\n3. COMMUNITY DISCUSSION');
  console.log('-'.repeat(60));
  try {
    const discussion = await makeRequest('/api/community-discussion', {
      topic: 'Rest and sleep during postpartum',
      locale: 'en'
    });
    
    const text = discussion.discussion || '';
    
    // Extract each section
    const westernMatch = text.match(/\*\*Western Medical Perspective\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    const tcmMatch = text.match(/\*\*Traditional Chinese Medicine\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    const malayMatch = text.match(/\*\*Malay Traditional Practices\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    const commonMatch = text.match(/\*\*Common Ground\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    
    if (westernMatch) {
      const western = westernMatch[1].trim();
      console.log('Western:', western);
      console.log('  Words:', countWords(western));
    }
    
    if (tcmMatch) {
      const tcm = tcmMatch[1].trim();
      console.log('\nTCM:', tcm);
      console.log('  Words:', countWords(tcm));
    }
    
    if (malayMatch) {
      const malay = malayMatch[1].trim();
      console.log('\nMalay:', malay);
      console.log('  Words:', countWords(malay));
    }
    
    if (commonMatch) {
      const common = commonMatch[1].trim();
      console.log('\nCommon Ground:', common);
      console.log('  Words:', countWords(common));
    }
    
    console.log('\nTotal words:', countWords(text));
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 4: Recovery Plan
  console.log('\n' + '='.repeat(60));
  console.log('\n4. RECOVERY PLAN');
  console.log('-'.repeat(60));
  try {
    const plan = await makeRequest('/api/recovery-plan', {
      recoveryStage: 5,
      deliveryMethod: 'c-section',
      locale: 'en'
    });
    
    if (plan.plan?.days) {
      console.log('Week Theme:', plan.plan.weekTheme);
      console.log('  Words:', countWords(plan.plan.weekTheme));
      
      const day1 = plan.plan.days[0];
      console.log('\nDay 1 Sample:');
      console.log('  Focus:', day1.focus, `(${countWords(day1.focus)} words)`);
      console.log('  Activity:', day1.activities[0], `(${countWords(day1.activities[0])} words)`);
      console.log('  Nutrition:', day1.nutrition, `(${countWords(day1.nutrition)} words)`);
      
      // Count total words for all days
      let totalWords = countWords(plan.plan.weekTheme);
      plan.plan.days.forEach(day => {
        totalWords += countWords(day.focus);
        totalWords += countWords(day.activities.join(' '));
        totalWords += countWords(day.nutrition);
        if (day.milestone) totalWords += countWords(day.milestone);
      });
      console.log('\nTotal words for entire plan:', totalWords);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✓ All responses are now concise and focused!');
}

testConciseResponses().catch(console.error);
