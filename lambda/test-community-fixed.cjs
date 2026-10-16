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

async function testCommunityDiscussion() {
  console.log('Testing Community Discussion with Correct Headers...\n');

  try {
    const communityResponse = await makeRequest('/api/community-discussion', {
      topic: 'Traditional postpartum foods and nutrition',
      locale: 'en'
    });
    
    console.log('✓ Community Discussion Response:');
    const discussion = communityResponse.discussion || '';
    
    // Check for exact headers the frontend expects
    console.log('  - Has "**Western Medical Perspective**":', discussion.includes('**Western Medical Perspective**'));
    console.log('  - Has "**Traditional Chinese Medicine**":', discussion.includes('**Traditional Chinese Medicine**'));
    console.log('  - Has "**Malay Traditional Practices**":', discussion.includes('**Malay Traditional Practices**'));
    console.log('  - Has "**Common Ground**":', discussion.includes('**Common Ground**'));
    
    console.log('\n  Full Response Preview:');
    console.log('  ' + discussion.substring(0, 500).replace(/\n/g, '\n  '));
    
    // Test parsing like the frontend does
    console.log('\n  Testing Frontend Parsing:');
    const westernMatch = discussion.match(/\*\*Western Medical Perspective\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    const tcmMatch = discussion.match(/\*\*Traditional Chinese Medicine\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    const malayMatch = discussion.match(/\*\*Malay Traditional Practices\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    const commonMatch = discussion.match(/\*\*Common Ground\*\*\s*\n(.*?)(?=\n\*\*|$)/s);
    
    console.log('  - Western parsed:', !!westernMatch);
    console.log('  - TCM parsed:', !!tcmMatch);
    console.log('  - Malay parsed:', !!malayMatch);
    console.log('  - Common Ground parsed:', !!commonMatch);
    
    if (westernMatch) {
      console.log('\n  Sample Western Content:', westernMatch[1].substring(0, 100).trim() + '...');
    }
    
  } catch (error) {
    console.error('✗ Community Discussion Error:', error.message);
  }

  console.log('\nTesting complete!');
}

testCommunityDiscussion().catch(console.error);
