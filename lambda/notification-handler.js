'use strict';

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-southeast-5' });
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply.mumcareapp@gmail.com';

// Twilio config (set these in Lambda environment variables)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox default

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  console.log('Notification event:', JSON.stringify(event));

  if (event.httpMethod === 'OPTIONS' || (event.requestContext && event.requestContext.http && event.requestContext.http.method === 'OPTIONS')) {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    let requestData;
    if (typeof event.body === 'string') {
      requestData = JSON.parse(event.body);
    } else if (event.body) {
      requestData = event.body;
    } else {
      requestData = event;
    }

    const { notificationType, userId, channel, data } = requestData;

    if (!notificationType || !userId || !channel) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: notificationType, userId, channel' })
      };
    }

    let result;
    switch (notificationType) {
      case 'wellness-reminder':
        result = await sendWellnessReminder(data);
        break;
      case 'emergency-alert':
        result = await sendEmergencyAlert(data);
        break;
      case 'milestone-celebration':
        result = await sendMilestoneCelebration(data);
        break;
      case 'ppd-concern':
        result = await sendPPDConcern(data);
        break;
      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: `Unknown notification type: ${notificationType}` })
        };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, messageId: result.messageId, message: 'Notification sent successfully' })
    };

  } catch (error) {
    console.error('Notification error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to send notification', details: error.message })
    };
  }
};

// ── Wellness Reminder ────────────────────────────────────────────────────────
async function sendWellnessReminder(data) {
  const { locale = 'en', motherName, dayNumber, email } = data;

  const msgs = {
    en: {
      subject: '🌸 Time for Your Daily Wellness Check',
      body: `Hi ${motherName},\n\nIt's time for your Day ${dayNumber} wellness check. Taking a few minutes to track your recovery helps us provide better personalised care.\n\nOpen MumCare AI to complete your check-in.\n\nWith care,\nMumCare AI`
    },
    zh: {
      subject: '🌸 每日健康检查时间',
      body: `${motherName}您好，\n\n现在是第${dayNumber}天的健康检查时间。花几分钟记录您的恢复情况。\n\n打开 MumCare AI 完成签到。\n\n关心您的，\nMumCare AI`
    },
    ms: {
      subject: '🌸 Masa untuk Pemeriksaan Kesihatan Harian',
      body: `Hi ${motherName},\n\nMasa untuk pemeriksaan kesihatan Hari ${dayNumber}. Luangkan beberapa minit untuk merekod pemulihan anda.\n\nBuka MumCare AI untuk melengkapkan daftar masuk.\n\nDengan kasih sayang,\nMumCare AI`
    }
  };

  const msg = msgs[locale] || msgs.en;
  return sendEmail(email, msg.subject, msg.body);
}

// ── Emergency Alert ──────────────────────────────────────────────────────────
async function sendEmergencyAlert(data) {
  const { locale = 'en', motherName, symptoms = [], emergencyContacts, email, emergencyContactEmail } = data;
  const hotline = emergencyContacts?.hotline || '999';

  const motherMsgs = {
    en: {
      subject: '🚨 URGENT: Emergency Symptoms Detected',
      body: `URGENT ALERT\n\nYour MumCare AI check-in has flagged symptoms that may need immediate medical attention:\n\n• ${symptoms.join('\n• ')}\n\nPlease call emergency services or go to the nearest hospital immediately.\n\nEmergency: ${hotline}\n\nMumCare AI`
    },
    zh: {
      subject: '🚨 紧急：检测到紧急症状',
      body: `紧急警报\n\n您的 MumCare AI 健康记录显示可能需要立即就医的症状：\n\n• ${symptoms.join('\n• ')}\n\n请立即拨打急救电话或前往最近的医院。\n\n紧急热线：${hotline}\n\nMumCare AI`
    },
    ms: {
      subject: '🚨 SEGERA: Simptom Kecemasan Dikesan',
      body: `AMARAN SEGERA\n\nDaftar masuk MumCare AI anda menunjukkan simptom yang mungkin memerlukan perhatian perubatan segera:\n\n• ${symptoms.join('\n• ')}\n\nSila hubungi perkhidmatan kecemasan atau pergi ke hospital terdekat dengan segera.\n\nKecemasan: ${hotline}\n\nMumCare AI`
    }
  };

  const contactMsgs = {
    en: {
      subject: `🚨 URGENT: ${motherName || 'Your contact'} may need immediate help`,
      body: `URGENT ALERT from MumCare AI\n\n${motherName || 'Someone you care for'} has logged symptoms that may require immediate medical attention:\n\n• ${symptoms.join('\n• ')}\n\nPlease check on them immediately and help them contact emergency services if needed.\n\nEmergency: ${hotline}\n\nMumCare AI`
    },
    zh: {
      subject: `🚨 紧急：${motherName || '您的联系人'}可能需要立即帮助`,
      body: `来自 MumCare AI 的紧急警报\n\n${motherName || '您关心的人'}记录了可能需要立即就医的症状：\n\n• ${symptoms.join('\n• ')}\n\n请立即联系她并在需要时帮助她拨打急救电话。\n\n紧急热线：${hotline}\n\nMumCare AI`
    },
    ms: {
      subject: `🚨 SEGERA: ${motherName || 'Kenalan anda'} mungkin memerlukan bantuan segera`,
      body: `AMARAN SEGERA dari MumCare AI\n\n${motherName || 'Seseorang yang anda sayangi'} telah merekod simptom yang mungkin memerlukan perhatian perubatan segera:\n\n• ${symptoms.join('\n• ')}\n\nSila semak keadaan mereka dengan segera.\n\nKecemasan: ${hotline}\n\nMumCare AI`
    }
  };

  const motherMsg = motherMsgs[locale] || motherMsgs.en;
  const contactMsg = contactMsgs[locale] || contactMsgs.en;

  const results = [];
  if (email) results.push(await sendEmail(email, motherMsg.subject, motherMsg.body, true));
  if (emergencyContactEmail) results.push(await sendEmail(emergencyContactEmail, contactMsg.subject, contactMsg.body, true));

  return results[0] || { messageId: 'emergency-alert-sent' };
}

// ── Milestone Celebration ────────────────────────────────────────────────────
async function sendMilestoneCelebration(data) {
  const { locale = 'en', motherName, milestone, dayNumber, email } = data;

  const msgs = {
    en: {
      subject: '🎉 Congratulations on Your Recovery Milestone!',
      body: `Dear ${motherName},\n\n🎉 Congratulations! You've reached Day ${dayNumber} of your postpartum recovery!\n\n${milestone}\n\nYou're doing an amazing job. Every day is progress.\n\nWith pride,\nMumCare AI`
    },
    zh: {
      subject: '🎉 恭喜您达到恢复里程碑！',
      body: `亲爱的${motherName}，\n\n🎉 恭喜！您已完成产后恢复的第${dayNumber}天！\n\n${milestone}\n\n您做得非常棒，每一天都是进步。\n\n为您骄傲，\nMumCare AI`
    },
    ms: {
      subject: '🎉 Tahniah atas Pencapaian Pemulihan Anda!',
      body: `${motherName} yang dihormati,\n\n🎉 Tahniah! Anda telah mencapai Hari ${dayNumber} pemulihan selepas bersalin!\n\n${milestone}\n\nAnda melakukannya dengan hebat.\n\nDengan bangga,\nMumCare AI`
    }
  };

  const msg = msgs[locale] || msgs.en;
  return sendEmail(email, msg.subject, msg.body);
}

// ── PPD Concern ──────────────────────────────────────────────────────────────
async function sendPPDConcern(data) {
  const { locale = 'en', motherName, email, emergencyContactEmail } = data;

  const motherMsgs = {
    en: {
      subject: '💜 We\'re Here to Support You',
      body: `Dear ${motherName},\n\nWe've noticed some patterns in your wellness checks that suggest you might be experiencing postpartum depression symptoms.\n\nYou're not alone. Please consider:\n\n• Talking to your healthcare provider\n• Calling a postpartum support helpline\n• Reaching out to a trusted friend or family member\n\nYour mental health matters.\n\nWith care,\nMumCare AI`
    },
    zh: {
      subject: '💜 我们在这里支持您',
      body: `亲爱的${motherName}，\n\n我们注意到您的健康记录显示可能有产后抑郁的迹象。\n\n您并不孤单。请考虑：\n\n• 与您的医疗服务提供者交谈\n• 拨打产后支持热线\n• 联系值得信赖的朋友或家人\n\n您的心理健康很重要。\n\n关心您的，\nMumCare AI`
    },
    ms: {
      subject: '💜 Kami Di Sini Untuk Menyokong Anda',
      body: `${motherName} yang dihormati,\n\nKami perasan beberapa corak yang menunjukkan anda mungkin mengalami gejala kemurungan selepas bersalin.\n\nAnda tidak bersendirian. Sila pertimbangkan:\n\n• Bercakap dengan penyedia penjagaan kesihatan\n• Menghubungi talian sokongan\n• Berhubung dengan rakan atau keluarga\n\nKesihatan mental anda penting.\n\nDengan kasih sayang,\nMumCare AI`
    }
  };

  const contactMsgs = {
    en: {
      subject: `💜 ${motherName || 'Your contact'} may need emotional support`,
      body: `A gentle heads-up from MumCare AI\n\n${motherName || 'Someone you care for'} has been showing signs that may indicate postpartum depression.\n\nYour support can make a real difference:\n\n• Check in with them today\n• Offer to help with daily tasks\n• Encourage them to speak with a healthcare provider\n\nThank you for being part of their support network.\n\nMumCare AI`
    },
    zh: {
      subject: `💜 ${motherName || '您的联系人'}可能需要情感支持`,
      body: `来自 MumCare AI 的温馨提示\n\n${motherName || '您关心的人'}最近的健康记录显示可能有产后抑郁的迹象。\n\n您的支持可以带来很大的不同：\n\n• 今天联系她\n• 提供日常帮助\n• 鼓励她咨询医疗专业人员\n\nMumCare AI`
    },
    ms: {
      subject: `💜 ${motherName || 'Kenalan anda'} mungkin memerlukan sokongan emosi`,
      body: `Peringatan lembut dari MumCare AI\n\n${motherName || 'Seseorang yang anda sayangi'} menunjukkan tanda-tanda kemurungan selepas bersalin.\n\nSokongan anda boleh membuat perbezaan:\n\n• Hubungi mereka hari ini\n• Tawarkan bantuan\n• Galakkan mereka berjumpa doktor\n\nMumCare AI`
    }
  };

  const motherMsg = motherMsgs[locale] || motherMsgs.en;
  const contactMsg = contactMsgs[locale] || contactMsgs.en;

  const results = [];
  if (email) results.push(await sendEmail(email, motherMsg.subject, motherMsg.body));
  if (emergencyContactEmail) results.push(await sendEmail(emergencyContactEmail, contactMsg.subject, contactMsg.body));

  return results[0] || { messageId: 'ppd-concern-sent' };
}

// ── SES Email Helper ─────────────────────────────────────────────────────────
async function sendEmail(toEmail, subject, body, isUrgent = false) {
  const params = {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: { Text: { Data: body, Charset: 'UTF-8' } }
    }
  };

  const command = new SendEmailCommand(params);
  const result = await sesClient.send(command);
  return { messageId: result.MessageId, channel: 'email' };
}
