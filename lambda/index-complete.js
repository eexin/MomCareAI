// Complete Lambda handler with all API endpoints
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const AWS_REGION = process.env.AWS_BEDROCK_REGION || 'us-east-1';
const MODEL_ID = process.env.AWS_BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

async function callBedrock(messages, systemPrompt = '') {
  const input = {
    modelId: MODEL_ID,
    messages: messages.map(m => ({
      role: m.role,
      content: [{ text: m.content }]
    })),
    inferenceConfig: {
      maxTokens: 1000,
      temperature: 0.7
    }
  };

  if (systemPrompt) {
    input.system = [{ text: systemPrompt }];
  }

  const command = new ConverseCommand(input);
  const response = await bedrockClient.send(command);
  return response.output.message.content[0].text;
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    // Remove stage prefix from path (e.g., /prod/api/... -> /api/...)
    let path = event.requestContext.http.path;
    if (path.startsWith('/prod/')) {
      path = path.substring(5); // Remove '/prod'
    }
    const body = JSON.parse(event.body || '{}');

    // Complete Care Report
    if (path === '/api/complete-care-report') {
      const { healthData, profile, recoveryStage, weekNumber } = body;
      const systemPrompt = `You are MumCare AI. Generate a brief care report in ${profile.locale === 'zh' ? 'Chinese' : profile.locale === 'ms' ? 'Bahasa Malaysia' : 'English'}. 3 sections: Recovery Summary, Today's Priority, Quick Tip.`;
      const userMessage = `Sleep ${healthData.sleepHours}h, Pain ${healthData.painLevel}/10, Mood ${healthData.mood}, Stress ${healthData.stressLevel}/10`;
      const response = await callBedrock([{ role: 'user', content: userMessage }], systemPrompt);
      const sections = response.split('\n\n').filter(s => s.trim());
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            recoverySummary: { status: 'recovering-well', message: sections[0] || response },
            todaysPriority: sections[1] || '',
            quickTip: sections[2] || ''
          }
        })
      };
    }

    // Breastfeeding Chat
    if (path === '/api/breastfeeding-chat') {
      const { message, history, locale } = body;
      const systemPrompt = `Breastfeeding support in ${locale === 'zh' ? 'Chinese' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}. Be brief and helpful.`;
      const messages = [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }];
      const response = await callBedrock(messages, systemPrompt);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      };
    }

    // Recovery Plan
    if (path === '/api/recovery-plan') {
      const { recoveryStage, deliveryMethod, locale } = body;
      const systemPrompt = `Create a simple 7-day recovery plan in ${locale === 'zh' ? 'Chinese' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}. Return JSON format.`;
      const userMessage = `Day ${recoveryStage} postpartum, ${deliveryMethod} delivery`;
      const response = await callBedrock([{ role: 'user', content: userMessage }], systemPrompt);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: { text: response } })
      };
    }

    // Community Discussion
    if (path === '/api/community-discussion') {
      const { topic, locale } = body;
      const systemPrompt = `Discuss postpartum topic from multiple cultural perspectives in ${locale === 'zh' ? 'Chinese' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}.`;
      const response = await callBedrock([{ role: 'user', content: topic }], systemPrompt);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ discussion: response })
      };
    }

    // Meal Analysis (simplified - no image support yet)
    if (path === '/api/meal-analysis') {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: 'Meal analysis coming soon. Image analysis requires additional setup.' })
      };
    }

    // Default
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: `Endpoint not found: ${path}` })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
