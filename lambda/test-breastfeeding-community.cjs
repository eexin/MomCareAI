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

async function testEndpoints() {
  console.log('Testing Breastfeeding and Community Endpoints...\n');

  // Test 1: Breastfeeding Chat
  console.log('1. Testing Breastfeeding Chat...');
  try {
    const breastfeedingResponse = await makeRequest('/api/breastfeeding-chat', {
      message: 'How can I improve my baby\'s latch?',
      history: [],
      locale: 'en'
    });
    
    console.log('✓ Breastfeeding Response:');
    const response = breastfeedingResponse.response || '';
    console.log('  - Has "Quick Answer":', response.includes('Quick Answer') || response.includes('**Quick Answer**'));
    console.log('  - Has "What to Do":', response.includes('What to Do') || response.includes('**What to Do**'));
    console.log('  - Has "Why This Helps":', response.includes('Why This Helps') || response.includes('**Why This Helps**'));
    console.log('  - Has "When to Seek Help":', response.includes('When to Seek Help') || response.includes('**When to Seek Help**'));
    console.log('  - Preview:', response.substring(0, 200) + '...');
    console.log('');
  } catch (error) {
    console.error('✗ Breastfeeding Error:', error.message);
  }

  // Test 2: Community Discussion
  console.log('2. Testing Community Discussion...');
  try {
    const communityResponse = await makeRequest('/api/community-discussion', {
      topic: 'Managing visitors after birth',
      locale: 'en'
    });
    
    console.log('✓ Community Discussion Response:');
    const discussion = communityResponse.discussion || '';
    console.log('  - Has "Introduction":', discussion.includes('Introduction') || discussion.includes('**Introduction**'));
    console.log('  - Has "Western Perspective":', discussion.includes('Western Perspective') || discussion.includes('**Western Perspective**'));
    console.log('  - Has "Asian Perspective":', discussion.includes('Asian Perspective') || discussion.includes('**Asian Perspective**'));
    console.log('  - Has "Southeast Asian":', discussion.includes('Southeast Asian') || discussion.includes('Middle Eastern'));
    console.log('  - Has "Common Themes":', discussion.includes('Common Themes') || discussion.includes('**Common Themes**'));
    console.log('  - Has "Practical Takeaways":', discussion.includes('Practical Takeaways') || discussion.includes('**Practical Takeaways**'));
    console.log('  - Preview:', discussion.substring(0, 200) + '...');
    console.log('');
  } catch (error) {
    console.error('✗ Community Discussion Error:', error.message);
  }

  console.log('Testing complete!');
}

testEndpoints().catch(console.error);
