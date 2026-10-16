// Complete Lambda handler with all API endpoints
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SESv2Client, CreateEmailIdentityCommand, GetEmailIdentityCommand } = require('@aws-sdk/client-sesv2');

const AWS_REGION = process.env.AWS_BEDROCK_REGION || 'ap-southeast-1';
const SES_REGION = 'ap-southeast-5'; // where verified emails live
const MODEL_ID = process.env.AWS_BEDROCK_MODEL_ID || 'global.anthropic.claude-sonnet-4-6';
const FROM_EMAIL = 'noreply.mumcareapp@gmail.com';

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
const sesClient = new SESClient({ region: AWS_REGION });
const sesv2Client = new SESv2Client({ region: SES_REGION });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Language name helper
function langName(locale) {
  if (locale === 'zh') return 'Chinese (中文)';
  if (locale === 'ms') return 'Bahasa Melayu';
  return 'English';
}

// All UI labels in 3 languages
const LABELS = {
  en: {
    recoverySummary: 'Recovery Summary',
    todaysPriority: "Today's Priority",
    quickTip: 'Quick Tip',
    weekTheme: 'Week Theme',
    day: 'Day',
    focus: 'Focus',
    activity: 'Activity',
    nutrition: 'Nutrition',
    milestone: 'Milestone',
    quickAnswer: 'Quick Answer',
    whatToDo: 'What to Do',
    whyThisHelps: 'Why This Helps',
    whenToSeekHelp: 'When to Seek Help',
    identifiedFoods: 'Identified Foods',
    nutritionalHighlights: 'Nutritional Highlights',
    postpartumSuitability: 'Postpartum Suitability',
    suggestions: 'Suggestions',
    todaysAchievements: "Today's Achievements",
    progressReflection: 'Progress Reflection',
    tomorrowsFocus: "Tomorrow's Focus",
    westernMedical: 'Western Medical Perspective',
    tcm: 'Traditional Chinese Medicine',
    malayTraditional: 'Malay Traditional Practices',
    commonGround: 'Common Ground',
  },
  zh: {
    recoverySummary: '恢复摘要',
    todaysPriority: '今日重点',
    quickTip: '快速提示',
    weekTheme: '本周主题',
    day: '第',
    focus: '重点',
    activity: '活动',
    nutrition: '营养',
    milestone: '里程碑',
    quickAnswer: '快速回答',
    whatToDo: '该怎么做',
    whyThisHelps: '为什么有帮助',
    whenToSeekHelp: '何时寻求帮助',
    identifiedFoods: '识别的食物',
    nutritionalHighlights: '营养亮点',
    postpartumSuitability: '产后适宜性',
    suggestions: '建议',
    todaysAchievements: '今日成就',
    progressReflection: '进度反思',
    tomorrowsFocus: '明日重点',
    westernMedical: '西医观点',
    tcm: '中医观点',
    malayTraditional: '马来传统习俗',
    commonGround: '共同点',
  },
  ms: {
    recoverySummary: 'Ringkasan Pemulihan',
    todaysPriority: 'Keutamaan Hari Ini',
    quickTip: 'Tip Pantas',
    weekTheme: 'Tema Minggu',
    day: 'Hari',
    focus: 'Fokus',
    activity: 'Aktiviti',
    nutrition: 'Pemakanan',
    milestone: 'Pencapaian',
    quickAnswer: 'Jawapan Pantas',
    whatToDo: 'Apa yang Perlu Dilakukan',
    whyThisHelps: 'Mengapa Ini Membantu',
    whenToSeekHelp: 'Bila Perlu Dapatkan Bantuan',
    identifiedFoods: 'Makanan yang Dikenal Pasti',
    nutritionalHighlights: 'Sorotan Pemakanan',
    postpartumSuitability: 'Kesesuaian Selepas Bersalin',
    suggestions: 'Cadangan',
    todaysAchievements: 'Pencapaian Hari Ini',
    progressReflection: 'Refleksi Kemajuan',
    tomorrowsFocus: 'Fokus Esok',
    westernMedical: 'Perspektif Perubatan Barat',
    tcm: 'Perubatan Tradisional Cina',
    malayTraditional: 'Amalan Tradisional Melayu',
    commonGround: 'Persamaan',
  }
};

function L(locale, key) {
  return (LABELS[locale] || LABELS.en)[key] || LABELS.en[key];
}

async function callBedrock(messages, systemPrompt = '') {
  const input = {
    modelId: MODEL_ID,
    messages: messages.map(m => ({
      role: m.role,
      content: [{ text: m.content }]
    })),
    inferenceConfig: {
      maxTokens: 500,
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
    let path = event.requestContext.http.path;
    if (path.startsWith('/prod/')) {
      path = path.substring(5);
    }
    const body = JSON.parse(event.body || '{}');

    // ─── Complete Care Report ───────────────────────────────────────────────
    if (path === '/api/complete-care-report') {
      const { healthData, profile, recoveryStage, weekNumber } = body;
      const locale = profile.locale || 'en';
      const lang = langName(locale);

      const systemPrompt = `You are MumCare AI. Respond ENTIRELY in ${lang}. Do NOT use any other language.

Generate a brief care report using EXACTLY these headers (in ${lang}):

## ${L(locale, 'recoverySummary')}
[1-2 sentences about recovery based on: sleep ${healthData.sleepHours}h, pain ${healthData.painLevel}/10, mood ${healthData.mood}, stress ${healthData.stressLevel}/10]

## ${L(locale, 'todaysPriority')}
[1 specific action for today]

## ${L(locale, 'quickTip')}
[1 practical tip for Day ${recoveryStage}]

RULES:
- Write EVERYTHING in ${lang}
- Use EXACTLY these headers
- Keep each section to 1-2 sentences MAX
- Be warm but concise`;

      const userMessage = `Day ${recoveryStage} postpartum. Sleep ${healthData.sleepHours}h, Pain ${healthData.painLevel}/10, Mood ${healthData.mood}, Stress ${healthData.stressLevel}/10. ${healthData.symptoms?.length > 0 ? `Symptoms: ${healthData.symptoms.join(', ')}. ` : ''}${healthData.routines?.length > 0 ? `Completed routines: ${healthData.routines.length}. ` : ''}Respond in ${lang}.`;
      const response = await callBedrock([{ role: 'user', content: userMessage }], systemPrompt);

      const sections = response.split('\n\n').filter(s => s.trim());
      const recoverySummary = sections.find(s => s.includes(L(locale, 'recoverySummary')))?.replace(/##\s*.+\n/, '').trim() || sections[0] || response;
      const todaysPriority = sections.find(s => s.includes(L(locale, 'todaysPriority')))?.replace(/##\s*.+\n/, '').trim() || sections[1] || '';
      const quickTip = sections.find(s => s.includes(L(locale, 'quickTip')))?.replace(/##\s*.+\n/, '').trim() || sections[2] || '';

      let status = 'recovering-well';
      if (healthData.painLevel > 6 || healthData.stressLevel > 7 || (healthData.symptoms && healthData.symptoms.length > 3)) {
        status = 'seek-immediate-care';
      } else if (healthData.painLevel > 3 || healthData.stressLevel > 5 || (healthData.symptoms && healthData.symptoms.length > 0)) {
        status = 'monitor-closely';
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: {
            recoverySummary: { status, message: recoverySummary },
            todaysPriority,
            quickTip
          }
        })
      };
    }

    // ─── Breastfeeding Chat ─────────────────────────────────────────────────
    if (path === '/api/breastfeeding-chat') {
      const { message, history, locale } = body;
      const lang = langName(locale);

      const systemPrompt = `You are a lactation consultant. Respond ENTIRELY in ${lang}. Do NOT use any other language.

Format EXACTLY as follows using these headers (in ${lang}):

**${L(locale, 'quickAnswer')}**
[1-2 sentences answering their question directly]

**${L(locale, 'whatToDo')}**
• [Step 1]
• [Step 2]
• [Step 3]

**${L(locale, 'whyThisHelps')}**
[1-2 sentences explaining why]

**${L(locale, 'whenToSeekHelp')}**
[1 sentence on warning signs]

RULES:
- Write EVERYTHING in ${lang}
- Use EXACTLY these headers with ** markers
- Keep each section brief and actionable
- Maximum 3 steps
- IMPORTANT: If the user describes symptoms that require IMMEDIATE medical attention (e.g. high fever, mastitis with red streaks, severe chest pain, difficulty breathing, heavy bleeding, signs of sepsis, severe infection, postpartum psychosis, thoughts of self-harm), you MUST include the exact marker "URGENT_MEDICAL_ATTENTION" on its own line at the very end of your response, followed by a comma-separated list of the urgent symptoms detected. Example: URGENT_MEDICAL_ATTENTION: fever,mastitis,chest pain`;

      const messages = [...history.map((h) => ({ role: h.role, content: h.content })), { role: 'user', content: `${message} (Please respond in ${lang})` }];
      const response = await callBedrock(messages, systemPrompt);

      // Detect urgent flag inserted by the AI
      const urgentMatch = response.match(/URGENT_MEDICAL_ATTENTION:\s*(.+)/i);
      const urgent = !!urgentMatch;
      const urgentSymptoms = urgentMatch
        ? urgentMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      // Strip the marker from the response shown to the user
      const cleanResponse = response.replace(/\n?URGENT_MEDICAL_ATTENTION:.*$/i, '').trim();

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: cleanResponse, urgent, urgentSymptoms })
      };
    }

    // ─── Recovery Plan ──────────────────────────────────────────────────────
    if (path === '/api/recovery-plan') {
      const { recoveryStage, deliveryMethod, locale, healthData } = body;
      const weekNumber = Math.ceil(recoveryStage / 7);
      const lang = langName(locale);

      let healthContext = '';
      if (healthData) {
        const concerns = [];
        if (healthData.sleepHours < 6) concerns.push(`low sleep (${healthData.sleepHours}h)`);
        if (healthData.painLevel > 4) concerns.push(`pain level ${healthData.painLevel}/10`);
        if (healthData.stressLevel > 5) concerns.push(`stress level ${healthData.stressLevel}/10`);
        if (healthData.symptoms && healthData.symptoms.length > 0) concerns.push(`symptoms: ${healthData.symptoms.slice(0, 3).join(', ')}`);
        const strengths = [];
        if (healthData.sleepHours >= 7) strengths.push('good sleep');
        if (healthData.painLevel <= 2) strengths.push('low pain');
        if (healthData.stressLevel <= 3) strengths.push('managing stress well');
        if (healthData.routines && healthData.routines.length >= 5) strengths.push(`maintaining ${healthData.routines.length} routines`);
        healthContext = `Current status: ${concerns.length > 0 ? 'Focus on ' + concerns.join(', ') : strengths.join(', ')}. `;
      }

      // Build day labels
      const dayLines = Array.from({ length: 7 }, (_, i) => {
        const d = i + 1;
        const dayLabel = locale === 'zh' ? `第${d}天` : locale === 'ms' ? `Hari ${d}` : `Day ${d}`;
        return `## ${dayLabel}
**${L(locale, 'focus')}:** [one focused goal]
**${L(locale, 'activity')}:** [one realistic activity]
**${L(locale, 'nutrition')}:** [one food tip]${d === 7 ? `\n**${L(locale, 'milestone')}:** [optional milestone]` : ''}`;
      }).join('\n\n');

      const weekLabel = locale === 'zh' ? `第${weekNumber}周主题` : locale === 'ms' ? `Tema Minggu ${weekNumber}` : `Week ${weekNumber} Theme`;

      const systemPrompt = `Create a personalized weekly recovery plan. Respond ENTIRELY in ${lang}. Do NOT use any other language.

${healthContext}Week ${weekNumber}, Day ${recoveryStage}, ${deliveryMethod} delivery.

Format EXACTLY as shown (all text in ${lang}):

## ${weekLabel}
[One short phrase based on their current needs]

${dayLines}

RULES:
- Write EVERYTHING in ${lang}
- Use EXACTLY these headers
- Keep each item to 1 SHORT sentence
- PERSONALIZE based on health data
- Include breastfeeding guidance in the plan: mention feeding frequency, latch tips, milk supply foods, and any breastfeeding symptoms to watch for (engorgement, mastitis signs, nipple pain) where relevant to the recovery stage`;

      const userMessage = `Create a personalized 7-day plan for Week ${weekNumber}, Day ${recoveryStage}. Respond in ${lang}.`;
      const response = await callBedrock([{ role: 'user', content: userMessage }], systemPrompt);

      try {
        // Match week theme - any ## header before first day
        const weekThemeMatch = response.match(/##\s*[^\n]+\n(.*?)(?=\n##)/s);
        const weekTheme = weekThemeMatch ? weekThemeMatch[1].trim() : '';

        const days = [];
        for (let i = 1; i <= 7; i++) {
          // Match day header in all 3 languages
          const dayPatterns = [
            new RegExp(`##\\s*Day ${i}\\s*\\n(.*?)(?=\\n##|$)`, 's'),
            new RegExp(`##\\s*第${i}天\\s*\\n(.*?)(?=\\n##|$)`, 's'),
            new RegExp(`##\\s*Hari ${i}\\s*\\n(.*?)(?=\\n##|$)`, 's'),
          ];

          let dayContent = null;
          for (const pat of dayPatterns) {
            const m = response.match(pat);
            if (m) { dayContent = m[1]; break; }
          }

          if (dayContent) {
            // Match bold labels in any language
            const focusMatch = dayContent.match(/\*\*[^*]+\*\*:?\s*(.*?)(?=\n|$)/);
            const activityMatch = dayContent.match(/\*\*[^*]+\*\*:?\s*(.*?)(?=\n|$)/g);
            const nutritionMatch = activityMatch && activityMatch[2] ? activityMatch[2].replace(/\*\*[^*]+\*\*:?\s*/, '').trim() : '';
            const milestoneMatch = activityMatch && activityMatch[3] ? activityMatch[3].replace(/\*\*[^*]+\*\*:?\s*/, '').trim() : undefined;

            days.push({
              day: i,
              focus: focusMatch ? focusMatch[1].trim() : '',
              activities: activityMatch && activityMatch[1] ? [activityMatch[1].replace(/\*\*[^*]+\*\*:?\s*/, '').trim()] : [],
              nutrition: nutritionMatch,
              selfCare: '',
              milestone: milestoneMatch || undefined
            });
          }
        }

        if (days.length > 0) {
          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: { weekTheme, days } })
          };
        }
      } catch (parseError) {
        console.error('Failed to parse recovery plan:', parseError);
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: { text: response } })
      };
    }

    // ─── Community Discussion ───────────────────────────────────────────────
    if (path === '/api/community-discussion') {
      const { topic, locale } = body;
      const lang = langName(locale);

      const systemPrompt = `You are a culturally-sensitive postpartum care advisor. Respond ENTIRELY in ${lang}. Do NOT use any other language.

Discuss "${topic}" from multiple cultural perspectives using EXACTLY these headers (in ${lang}):

**${L(locale, 'westernMedical')}**
[1-2 sentences on modern medical approach]

**${L(locale, 'tcm')}**
[1-2 sentences on TCM approach]

**${L(locale, 'malayTraditional')}**
[1-2 sentences on Malay traditions]

**${L(locale, 'commonGround')}**
[1-2 sentences on what's universal]

RULES:
- Write EVERYTHING in ${lang}
- Use EXACTLY the headers shown above
- Keep each section to 1-2 sentences MAX
- Be specific and respectful`;

      const response = await callBedrock([{ role: 'user', content: `Discuss "${topic}" for postpartum mothers. Respond entirely in ${lang}.` }], systemPrompt);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ discussion: response })
      };
    }

    // ─── Day Summary ────────────────────────────────────────────────────────
    if (path === '/api/day-summary') {
      const { dayNumber, healthData, profile, locale } = body;
      const lang = langName(locale);
      const activities = healthData?.routines || [];

      const systemPrompt = `Generate a daily summary. Respond ENTIRELY in ${lang}. Do NOT use any other language.

Format EXACTLY as follows (all text in ${lang}):

**${L(locale, 'todaysAchievements')}**
[1-2 sentences celebrating the day]

**${L(locale, 'progressReflection')}**
[1 sentence on Day ${dayNumber} progress]

**${L(locale, 'tomorrowsFocus')}**
[1 sentence on tomorrow]

RULES:
- Write EVERYTHING in ${lang}
- Use EXACTLY these headers with ** markers
- Keep each section to 1-2 sentences MAX
- Be warm and specific`;

      const userMessage = `Day ${dayNumber}. ${activities.length > 0 ? `Completed: ${activities.join(', ')}.` : ''} ${healthData ? `Sleep: ${healthData.sleepHours}h, Pain: ${healthData.painLevel}/10, Mood: ${healthData.mood}.` : ''} Create an encouraging summary in ${lang}.`;
      const response = await callBedrock([{ role: 'user', content: userMessage }], systemPrompt);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: response })
      };
    }

    // ─── Meal Analysis ──────────────────────────────────────────────────────
    if (path === '/api/meal-analysis') {
      const { imageBase64, locale, recoveryStage, deliveryMethod } = body;
      const lang = langName(locale);

      if (!imageBase64) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Image data is required' })
        };
      }

      const base64Data = imageBase64.split(',')[1] || imageBase64;
      const imageFormat = imageBase64.includes('image/jpeg') ? 'jpeg' :
                         imageBase64.includes('image/png') ? 'png' :
                         imageBase64.includes('image/webp') ? 'webp' : 'jpeg';

      const systemPrompt = `Analyze this meal for postpartum nutrition. Respond ENTIRELY in ${lang}. Do NOT use any other language.

Format EXACTLY as shown (all text in ${lang}):

**${L(locale, 'identifiedFoods')}**
• [Food 1]
• [Food 2]
• [Food 3]

**${L(locale, 'nutritionalHighlights')}**
• [Nutrient 1]: [Brief benefit]
• [Nutrient 2]: [Brief benefit]
• [Nutrient 3]: [Brief benefit]

**${L(locale, 'postpartumSuitability')}**
Good: [1 sentence why suitable for Day ${recoveryStage} ${deliveryMethod}]

**${L(locale, 'suggestions')}**
• [Suggestion 1]
• [Suggestion 2]
• [Suggestion 3]

RULES:
- Write EVERYTHING in ${lang}
- Use EXACTLY these headers with ** markers
- Keep each point to 1 SHORT sentence
- Start Suitability with "Good:", "Moderate:", or "Caution:" (keep these 3 words in English for parsing, rest in ${lang})`;

      const input = {
        modelId: MODEL_ID,
        messages: [{
          role: 'user',
          content: [
            {
              image: {
                format: imageFormat,
                source: { bytes: Buffer.from(base64Data, 'base64') }
              }
            },
            {
              text: `Analyze this meal for a postpartum mother on Day ${recoveryStage} after ${deliveryMethod} delivery. Respond entirely in ${lang}.`
            }
          ]
        }],
        inferenceConfig: {
          maxTokens: 600,
          temperature: 0.5
        },
        system: [{ text: systemPrompt }]
      };

      const command = new ConverseCommand(input);
      const response = await bedrockClient.send(command);
      const analysis = response.output.message.content[0].text;

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis })
      };
    }

    // ─── Email Verification ─────────────────────────────────────────────
    if (path === '/api/verify-email') {
      const { email } = body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Valid email address is required' })
        };
      }

      // Check if already verified
      try {
        const getCmd = new GetEmailIdentityCommand({ EmailIdentity: email });
        const identity = await sesv2Client.send(getCmd);
        if (identity.VerifiedForSendingStatus === true) {
          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'already_verified' })
          };
        }
      } catch (_) {
        // Not found — proceed to create
      }

      // Trigger AWS verification email to the user
      const createCmd = new CreateEmailIdentityCommand({ EmailIdentity: email });
      await sesv2Client.send(createCmd);

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verification_sent' })
      };
    }

    // ─── Check Verification Status ──────────────────────────────────────
    if (path === '/api/check-email-verified') {
      const { email } = body;
      if (!email) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Email required' })
        };
      }

      try {
        const getCmd = new GetEmailIdentityCommand({ EmailIdentity: email });
        const identity = await sesv2Client.send(getCmd);
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ verified: identity.VerifiedForSendingStatus === true })
        };
      } catch (_) {
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ verified: false })
        };
      }
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
