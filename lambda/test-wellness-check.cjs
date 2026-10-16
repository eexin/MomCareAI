// Test wellness check endpoint
const https = require('https');

const API_BASE = 'https://qql26pimu7.execute-api.us-east-1.amazonaws.com/prod';

const payload = {
  healthData: {
    sleepHours: 8,
    painLevel: 0,
    mood: 'happy',
    stressLevel: 0
  },
  profile: {
    locale: 'en',
    motherName: 'Sarah'
  },
  recoveryStage: 5,
  weekNumber: 1
};

const url = new URL(API_BASE + '/api/complete-care-report');
const payloadStr = JSON.stringify(payload);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadStr)
  }
};

console.log('Testing Complete Care Report endpoint...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('\nRaw Response:');
    console.log(data);
    
    try {
      const json = JSON.parse(data);
      console.log('\nParsed Response:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.report) {
        console.log('\n✅ Report structure:');
        console.log('- recoverySummary.status:', json.report.recoverySummary?.status);
        console.log('- recoverySummary.message:', json.report.recoverySummary?.message?.substring(0, 80) + '...');
        console.log('- todaysPriority:', json.report.todaysPriority?.substring(0, 80) + '...');
        console.log('- quickTip:', json.report.quickTip?.substring(0, 80) + '...');
      }
    } catch (e) {
      console.log('\n❌ Failed to parse JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(payloadStr);
req.end();
