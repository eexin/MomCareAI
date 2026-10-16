import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const AWS_BEDROCK_API_KEY = process.env.AWS_BEDROCK_API_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';
const MODEL_ID = process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

// Helper to call Bedrock using long-term API key with Bearer token
async function callBedrock(messages, systemPrompt = '') {
  const requestBody = {
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
    requestBody.system = [{ text: systemPrompt }];
  }

  console.log('Calling Bedrock API:', `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${MODEL_ID}/converse`);

  const response = await fetch(`https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${MODEL_ID}/converse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AWS_BEDROCK_API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Bedrock API error:', response.status, errorText);
    throw new Error(`Bedrock API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Bedrock response received successfully');
  return data.output.message.content[0].text;
}

// Complete Care Report - 6 sections
app.post('/api/complete-care-report', async (req, res) => {
  try {
    const { healthData, profile, recoveryStage, weekNumber } = req.body;
    
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
    
    // Parse the response into sections
    const sections = response.split('\n\n').filter(s => s.trim());
    
    const report = {
      recoverySummary: { 
        status: healthData.painLevel > 7 || healthData.sleepHours < 3 || (healthData.symptoms && healthData.symptoms.length > 3) ? 'monitor-closely' : 'recovering-well', 
        message: sections[0] || response 
      },
      todaysPriority: sections[1] || '',
      quickTip: sections[2] || ''
    };
    
    res.json({ report });
  } catch (error) {
    console.error('Complete care report error:', error);
    res.status(500).json({ error: 'Failed to generate care report' });
  }
});

// Daily Wellness Check (legacy endpoint)
app.post('/api/wellness-check', async (req, res) => {
  try {
    const { responses, recoveryStage, deliveryMethod, locale } = req.body;
    
    const systemPrompt = `You are a postpartum care assistant. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}. Maximum 100 words. Identify the postpartum day, highlight ONE concern, give ONE action.`;
    
    const userMessage = `Recovery stage: Day ${recoveryStage}. Delivery: ${deliveryMethod}. Wellness data: ${JSON.stringify(responses)}`;
    
    const report = await callBedrock([
      { role: 'user', content: userMessage }
    ], systemPrompt);
    
    res.json({ report });
  } catch (error) {
    console.error('Wellness check error:', error);
    res.status(500).json({ error: 'Failed to generate wellness report' });
  }
});

// Breastfeeding Support Chat
app.post('/api/breastfeeding-chat', async (req, res) => {
  try {
    const { message, history, recoveryStage, deliveryMethod, locale } = req.body;
    
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

If the question is simple, just give a Quick Answer. Only use multiple sections for complex topics.

Example for Chinese:
**Quick Answer**
确保宝宝含住整个乳晕，不仅仅是乳头。

**What to Do**
• 让宝宝张大嘴巴
• 将乳头对准宝宝的鼻子
• 等宝宝嘴巴张大时快速贴近

**Why This Helps**
正确的含乳可以防止乳头疼痛并确保宝宝获得足够的乳汁。`;
    
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];
    
    const response = await callBedrock(messages, systemPrompt);
    
    res.json({ response });
  } catch (error) {
    console.error('Breastfeeding chat error:', error);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

// Meal Photo Analyzer
app.post('/api/meal-analysis', async (req, res) => {
  try {
    const { imageBase64, recoveryStage, deliveryMethod, locale } = req.body;
    
    // Extract base64 data and detect format
    let base64Data = imageBase64;
    let imageFormat = 'jpeg'; // default
    
    if (imageBase64.includes('base64,')) {
      const parts = imageBase64.split('base64,');
      base64Data = parts[1];
      
      // Detect image format from data URL
      if (parts[0].includes('image/png')) {
        imageFormat = 'png';
      } else if (parts[0].includes('image/webp')) {
        imageFormat = 'webp';
      } else if (parts[0].includes('image/gif')) {
        imageFormat = 'gif';
      } else {
        imageFormat = 'jpeg';
      }
    }
    
    console.log(`Processing image with format: ${imageFormat}`);
    
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

ALL 4 SECTIONS ARE REQUIRED. Do not skip any section.

Example for Chinese:
**Identified Foods**
• 米饭
• 鸡肉
• 西兰花

**Nutritional Highlights**
• 蛋白质：支持组织愈合
• 铁：预防贫血

**Postpartum Suitability**
Good - 均衡营养，适合产后恢复

**Suggestions**
• 增加绿叶蔬菜
• 多喝水`;

    // Prepare the request with image
    const requestBody = {
      modelId: MODEL_ID,
      messages: [{
        role: 'user',
        content: [
          {
            image: {
              format: imageFormat,
              source: {
                bytes: base64Data
              }
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

    console.log('Calling Bedrock API with image...');

    const response = await fetch(`https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${MODEL_ID}/converse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AWS_BEDROCK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bedrock API error:', response.status, errorText);
      throw new Error(`Bedrock API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Bedrock response received:', JSON.stringify(data).substring(0, 200));
    
    const analysis = data.output.message.content[0].text;
    
    res.json({ analysis });
  } catch (error) {
    console.error('Meal analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze meal' });
  }
});

// Weekly Recovery Plan
app.post('/api/recovery-plan', async (req, res) => {
  try {
    const { recoveryStage, deliveryMethod, locale } = req.body;
    
    const systemPrompt = `You are a postpartum recovery planner. Respond in ${locale === 'zh' ? 'Chinese (中文, include TCM practices)' : locale === 'ms' ? 'Bahasa Melayu (halal-compliant)' : 'English'}.

Generate a SIMPLE 7-day recovery plan in STRICT JSON format. Keep it MINIMAL - new mothers are overwhelmed.

Each day should have:
- day: number (1-7)
- focus: ONE word or short phrase (e.g., "Rest", "Gentle Movement")
- activities: array with ONLY 1 activity (the most important one, max 5 words)
- nutrition: ONE simple food suggestion (max 5 words, e.g., "Protein & leafy greens")
- selfCare: REMOVED (too much info)
- milestone: optional achievement ONLY for special days (day 1, 7, 14, etc.)

CRITICAL: Keep everything SHORT. One activity per day. Simple language. No overwhelming lists.

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
    
    // Try to parse JSON, fallback to text if it fails
    let plan;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { weekTheme: 'Recovery Week', days: [] };
    } catch (e) {
      // Fallback to text format
      plan = { text: response };
    }
    
    res.json({ plan });
  } catch (error) {
    console.error('Recovery plan error:', error);
    res.status(500).json({ error: 'Failed to generate recovery plan' });
  }
});

// Recovery Progress Tracker
app.post('/api/progress-analysis', async (req, res) => {
  try {
    const { entries, recoveryStage, deliveryMethod, locale } = req.body;
    
    const systemPrompt = `You are a postpartum recovery analyst. Respond in ${locale === 'zh' ? 'Chinese (中文)' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}. Analyze journal entries for physical and emotional trends. Flag PPD indicators if present.`;
    
    const userMessage = `Analyze these journal entries from a mother on day ${recoveryStage} postpartum (${deliveryMethod}): ${JSON.stringify(entries)}`;
    
    const analysis = await callBedrock([
      { role: 'user', content: userMessage }
    ], systemPrompt);
    
    res.json({ analysis });
  } catch (error) {
    console.error('Progress analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze progress' });
  }
});

// Community Space
app.post('/api/community-discussion', async (req, res) => {
  try {
    const { topic, locale } = req.body;
    
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
1. Use English section headers: **Western Medical Perspective**, **Traditional Chinese Medicine**, **Malay Traditional Practices**, **Common Ground**
2. Content can be in ${locale === 'zh' ? 'Chinese' : locale === 'ms' ? 'Bahasa Melayu' : 'English'}
3. Keep each section SHORT (2-3 sentences max)
4. Be respectful of all cultural practices
5. NO markdown formatting in content (no **, ##, #)
6. Include a disclaimer that this is educational only

Example for Chinese:
**Western Medical Perspective**
现代医学建议产后6-8周内避免剧烈运动。

**Traditional Chinese Medicine**
中医强调"坐月子"期间要保暖和休息。

**Malay Traditional Practices**
马来传统建议产后按摩和特殊饮食。

**Common Ground**
所有文化都强调产后休息和营养的重要性。`;
    
    const userMessage = `Discuss this postpartum topic from multiple cultural perspectives: ${topic}

Include a brief disclaimer at the end that this is for educational purposes and should complement, not replace, advice from healthcare providers.`;
    
    const discussion = await callBedrock([
      { role: 'user', content: userMessage }
    ], systemPrompt);
    
    res.json({ discussion });
  } catch (error) {
    console.error('Community discussion error:', error);
    res.status(500).json({ error: 'Failed to generate discussion' });
  }
});

// Day Summary for Calendar
app.post('/api/day-summary', async (req, res) => {
  try {
    const { healthData, dayNumber, profile, locale } = req.body;
    
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
    
    res.json({ summary });
  } catch (error) {
    console.error('Day summary error:', error);
    res.status(500).json({ error: 'Failed to generate day summary' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌸 Postpartum Recovery API running on port ${PORT}`);
});
