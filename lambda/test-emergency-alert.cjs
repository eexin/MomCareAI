// Test emergency alert notification
const https = require('https');

const payload = {
  notificationType: 'emergency-alert',
  userId: 'test-user',
  channel: 'email',
  data: {
    email: 'your-email@example.com',
    locale: 'en',
    motherName: 'Sarah',
    symptoms: ['Heavy bleeding', 'Severe headache', 'Chest pain'],
    emergencyContacts: {
      hotline: '911'
    }
  }
};

const url = new URL('https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify');
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

console.log('Sending emergency alert test...');
console.log('Payload:', JSON.stringify(payload, null, 2));

const req = https.request(options, (res) => {
  console.log(`\nStatus: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('\nParsed:', JSON.stringify(json, null, 2));
      
      if (json.success) {
        console.log('\n✅ Emergency alert sent successfully!');
        console.log('📧 Check your email at your-email@example.com');
        console.log('Subject: 🚨 URGENT: Emergency Symptoms Detected');
      }
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
