// MumCare API Lambda Handler
// Handles all API endpoints for the MumCare app

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const MODEL_ID = process.env.AWS_BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

// Helper to call Bedrock
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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  // Handle OPTIONS for CORS
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const path = event.requestContext.http.path;
    const body = JSON.parse(event.body || '{}');

    let result;

    // Route to appropriate handler
    switch (path) {
      case '/api/complete-care-report':
        result = await handleCompleteCareReport(body);
        break;
      case '/api/wellness-check':
        result = await handleWellnessCheck(body);
        break;
      case '/api/breastfeeding-chat':
        result = await handleBreastfeedingChat(body);
        break;
      case '/api/meal-analysis':
        result = await handleMealAnalysis(body);
        break;
      case '/api/recovery-plan':
        result = await handleRecoveryPlan(body);
        break;
      case '/api/progress-analysis':
        result = await handleProgressAnalysis(body);
        break;
      case '/api/community-discussion':
        result = await handleCommunityDiscussion(body);
        break;
      case '/api/day-summary':
        result = await handleDaySummary(body);
        break;
      default:
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Endpoint not found' })
        };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};

// Handler functions
async function handleCompleteCareReport(body) {
  const { healthData, profile, recoveryStage, weekNumber } = body;
  
  const systemPrompt = `You are MumCare AI, a compassionate postpartum care specialist. Generate a brief, easy-to-digest care report in ${profile.locale === 'zh' ? 'Chinese (中文)' : profile.locale === 'ms' ? 'Bahasa Malaysia' : 'English'}.

Mother: ${profile.motherName}
Delivery: ${profile.deliveryMethod}
Recovery: Week ${weekNumber}, Day ${recoveryStage}

IMPORTANT: Keep responses SHORT and actionable. New mothers are tired and overwhelmed.

Generate 3 BRIEF sections (2-3 sentences each):
1. Recovery Summary (status: recovering-well/monitor-closely/seek-immediate-care + ONE key observation)
2. Today's Priority (ONE most important action to take today)
3. Quick Tip (ONE practical tip for their current situation)

CRITICAL RULES:
- NO hashtags (#)
- NO markdown formatting (**, ##, etc.)
- NO titles like "Your Care Report" or "Day X"
- Just provide the 3 sections with plain text
- Be warm, concise, and supportive
- Avoid medical jargon
- Pay special attention to symptoms and notes - they provide important context`;
  
  const userMessage = `Health Status:
- Sleep: ${healthData.sleepHours}h
- Pain: ${healthData.painLevel}/10
- Mood: ${healthData.mood}
- Stress: ${healthData.stressLevel}/10
${healthData.symptoms && healthData.symptoms.length > 0 ? `- Symptoms: ${healthData.symptoms.join(', ')}` : ''}
${healthData.routines && healthData.routines.length > 0 ? `- Completed Routines: ${healthData.routines.join(', ')}` : ''}
${healthData.notes ? `- Personal Notes: ${healthData.notes}` : ''}
${healthData.breastfeedingConcerns ? `- Concerns: ${healthData.breastfeedingConcerns}` : ''}`;
  
  const response = await callBedrock([
    { role: 'user', content: userMessage }
  ], systemPrompt);
  
  const sections = response.split('\n\n').filter(s => s.trim());
  
  const report = {
    recoverySummary: { 
      status: healthData.painLevel > 7 || healthData.sleepHours < 3 || (healthData.symptoms && healthData.symptoms.length > 3) ? 'monitor-closely' : 'recovering-well', 
      message: sections[0] || response 
    },
    todaysPriority: sections[1] || '',
    quickTip: sections[2] || ''
  };
  
  return { report };
}

async function handleWellnessCheck(body) {
  const { responses, recoveryStage, deliveryMethod, locale } = body;
  
  const systemPrompt = `You are a postpartum care assistant. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}. Maximum 100 words. Identify the postpartum day, highlight ONE concern, give ONE action.`;
  
  const userMessage = `Recovery stage: Day ${recoveryStage}. Delivery: ${deliveryMethod}. Wellness data: ${JSON.stringify(responses)}`;
  
  const report = await callBedrock([
    { role: 'user', content: userMessage }
  ], systemPrompt);
  
  return { report };
}

async function handleBreastfeedingChat(body) {
  const { message, history, recoveryStage, deliveryMethod, locale } = body;
  
  const systemPrompt = `You are a breastfeeding support assistant. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Melayu (with halal-aware guidance)' : 'English'}.

CRITICAL: Use these EXACT English section headers, even when responding in Chinese or Bahasa Melayu:

**Quick Answer** (1-2 sentences - the most important thing to know)

**What to Do** (2-3 bullet points - actionable steps)
• Step 1
• Step 2

**Why This Helps** (1-2 sentences - brief explanation)

**When to Seek Help** (if applicable - red flags to watch for)

IMPORTANT RULES:
1. Use English section headers: **Quick Answer**, **What to Do**, **Why This Helps**, **When to Seek Help**
2. Content can be in ${locale === 'zh' ? 'Chinese' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}
3. Keep responses SHORT and practical
4. New mothers are tired - be concise
5. Use simple language
6. Be warm and encouraging
7. NO markdown formatting in content (no **, ##, #)

If the question is simple, just give a Quick Answer. Only use multiple sections for complex topics.`;
  
  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];
  
  const response = await callBedrock(messages, systemPrompt);
  
  return { response };
}

async function handleMealAnalysis(body) {
  const { imageBase64, recoveryStage, deliveryMethod, locale } = body;
  
  let base64Data = imageBase64;
  let imageFormat = 'jpeg';
  
  if (imageBase64.includes('base64,')) {
    const parts = imageBase64.split('base64,');
    base64Data = parts[1];
    
    if (parts[0].includes('image/png')) imageFormat = 'png';
    else if (parts[0].includes('image/webp')) imageFormat = 'webp';
    else if (parts[0].includes('image/gif')) imageFormat = 'gif';
  }
  
  const systemPrompt = `You are a postpartum nutrition assistant. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Melayu (include halal check)' : 'English'}.

CRITICAL: You MUST include ALL 4 sections below with these EXACT English section headers:

**Identified Foods**
List ONLY 3-5 food names, no descriptions, no colons
• Food 1
• Food 2
• Food 3

**Nutritional Highlights**
List 2-3 key nutrients with benefits
• Nutrient: Benefit for recovery

**Postpartum Suitability**
Rate as Good/Moderate/Caution and explain why in 1-2 sentences

**Suggestions**
Give 1-2 practical tips to improve the meal
• Tip 1
• Tip 2

ALL 4 SECTIONS ARE REQUIRED. Do not skip any section.`;

  const input = {
    modelId: MODEL_ID,
    messages: [{
      role: 'user',
      content: [
        {
          image: {
            format: imageFormat,
            source: { bytes: base64Data }
          }
        },
        {
          text: `Analyze this meal for a postpartum mother on day ${recoveryStage}, delivery method: ${deliveryMethod}. Provide nutritional analysis and recovery recommendations.`
        }
      ]
    }],
    inferenceConfig: {
      maxTokens: 1200,
      temperature: 0.7
    },
    system: [{ text: systemPrompt }]
  };

  const command = new ConverseCommand(input);
  const response = await bedrockClient.send(command);
  const analysis = response.output.message.content[0].text;
  
  return { analysis };
}

async function handleRecoveryPlan(body) {
  const { recoveryStage, deliveryMethod, locale } = body;
  
  const systemPrompt = `You are a postpartum recovery planner. Respond in ${locale === 'zh' ? 'Chinese (中文, include TCM practices)' : locale === 'ms' ? 'Bahasa Melayu (halal-compliant)' : 'English'}.

Generate a SIMPLE 7-day recovery plan in STRICT JSON format. Keep it MINIMAL - new mothers are overwhelmed.

Each day should have:
- day: number (1-7)
- focus: ONE word or short phrase (e.g., "Rest", "Gentle Movement")
- activities: array with ONLY 1 activity (the most important one, max 5 words)
- nutrition: ONE simple food suggestion (max 5 words, e.g., "Protein & leafy greens")
- milestone: optional achievement ONLY for special days (day 1, 7, 14, etc.)

Return ONLY valid JSON, no other text:
{
  "weekTheme": "brief theme (3-4 words max)",
  "days": [
    {
      "day": 1,
      "focus": "Rest",
      "activities": ["Gentle breathing"],
      "nutrition": "Warm soups, protein",
      "milestone": "First day of recovery"
    }
  ]
}`;
  
  const userMessage = `Create a SIMPLE weekly recovery plan for day ${recoveryStage} postpartum, delivery method: ${deliveryMethod}. Keep it minimal and easy to digest.`;
  
  const response = await callBedrock([
    { role: 'user', content: userMessage }
  ], systemPrompt);
  
  let plan;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { weekTheme: 'Recovery Week', days: [] };
  } catch (e) {
    plan = { text: response };
  }
  
  return { plan };
}

async function handleProgressAnalysis(body) {
  const { entries, recoveryStage, deliveryMethod, locale } = body;
  
  const systemPrompt = `You are a postpartum recovery analyst. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}. Analyze journal entries for physical and emotional trends. Flag PPD indicators if present.`;
  
  const userMessage = `Analyze these journal entries from a mother on day ${recoveryStage} postpartum (${deliveryMethod}): ${JSON.stringify(entries)}`;
  
  const analysis = await callBedrock([
    { role: 'user', content: userMessage }
  ], systemPrompt);
  
  return { analysis };
}

async function handleCommunityDiscussion(body) {
  const { topic, locale } = body;
  
  const systemPrompt = `You are a multicultural postpartum advisor. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}.

CRITICAL: Use these EXACT English section headers, even when responding in Chinese or Bahasa Melayu:

**Western Medical Perspective**
Brief evidence-based medical view (2-3 sentences)

**Traditional Chinese Medicine**
TCM approach and practices (2-3 sentences)

**Malay Traditional Practices**
Traditional Malay/Southeast Asian customs (2-3 sentences)

**Common Ground**
What all perspectives agree on (1-2 sentences)

IMPORTANT RULES:
1. Use English section headers
2. Content can be in ${locale === 'zh' ? 'Chinese' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}
3. Keep each section SHORT (2-3 sentences max)
4. Be respectful of all cultural practices
5. Include a disclaimer that this is educational only`;
  
  const userMessage = `Discuss this postpartum topic from multiple cultural perspectives: ${topic}

Include a brief disclaimer at the end that this is for educational purposes and should complement, not replace, advice from healthcare providers.`;
  
  const discussion = await callBedrock([
    { role: 'user', content: userMessage }
  ], systemPrompt);
  
  return { discussion };
}

async function handleDaySummary(body) {
  const { healthData, dayNumber, profile, locale } = body;
  
  const systemPrompt = `You are MumCare AI analyzing a specific day in postpartum recovery. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Malaysia' : 'English'}.

Generate a brief 2-3 sentence summary of this day's wellness, highlighting:
1. Overall status (good/moderate/concerning)
2. Key observation (what stood out most)
3. One actionable insight or encouragement

Keep it SHORT, warm, and supportive. NO markdown formatting.`;
  
  const userMessage = `Day ${dayNumber} postpartum:
- Sleep: ${healthData.sleepHours}h
- Pain: ${healthData.painLevel}/10
- Mood: ${healthData.mood}
- Stress: ${healthData.stressLevel}/10
${healthData.breastfeedingConcerns ? `- Concerns: ${healthData.breastfeedingConcerns}` : ''}`;
  
  const summary = await callBedrock([
    { role: 'user', content: userMessage }
  ], systemPrompt);
  
  return { summary };
}
