// Test notification API
const https = require('https');

const API_ENDPOINT = 'https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify';

const payload = {
  notificationType: 'wellness-reminder',
  userId: 'test-user',
  channel: 'email',
  data: {
    email: 'your-email@example.com',
    locale: 'en',
    motherName: 'Sarah',
    dayNumber: 5
  }
};

const url = new URL(API_ENDPOINT);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(payload))
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('Parsed:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(JSON.stringify(payload));
req.end();

console.log('Sending notification test...');
console.log('Payload:', JSON.stringify(payload, null, 2));
