import { useState, useEffect, useRef } from 'react';
import type { UserProfile, ChatMessage } from '../types';
import { API_URL } from '../config';
import { sendEmergencyAlert } from '../notifications';
import LoadingDots from './LoadingDots';

interface BreastfeedingChatProps {
  profile: UserProfile;
  recoveryStage: number;
  deviceId: string;
  locale: 'en' | 'zh' | 'ms';
}

interface ParsedResponse {
  quickAnswer?: string;
  whatToDo?: string[];
  whyThisHelps?: string;
  whenToSeekHelp?: string;
  rawText?: string;
}

export default function BreastfeedingChat({ profile, recoveryStage, deviceId, locale }: BreastfeedingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [urgentAlert, setUrgentAlert] = useState<{ symptoms: string[] } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load latest health log to personalise suggestions
  const getLatestLog = () => {
    try {
      const history = JSON.parse(localStorage.getItem(`health_${deviceId}`) || '[]');
      return history[0] || null;
    } catch { return null; }
  };

  const buildQuickQuestions = () => {
    const log = getLatestLog();
    const week = Math.ceil(recoveryStage / 7);

    // Day-aware meal suggestion
    const mealQ = locale === 'en'
      ? `What should I eat today?`
      : locale === 'zh'
      ? `今天我应该吃什么？`
      : `Apa yang patut saya makan hari ini?`;

    // Pump target based on day
    const pumpQ = locale === 'en'
      ? `How much should I pump today on Day ${recoveryStage}?`
      : locale === 'zh'
      ? `第${recoveryStage}天我今天应该泵多少奶？`
      : `Berapa banyak yang perlu saya pam hari ini pada Hari ${recoveryStage}?`;

    // Sleep-aware question
    const sleepQ = log && log.sleepHours < 5
      ? (locale === 'en'
          ? `I only slept ${log.sleepHours}h — how does this affect my milk supply?`
          : locale === 'zh'
          ? `我只睡了${log.sleepHours}小时，这会影响我的奶量吗？`
          : `Saya hanya tidur ${log.sleepHours}j — bagaimana ini mempengaruhi bekalan susu saya?`)
      : (locale === 'en'
          ? 'How to improve latch?'
          : locale === 'zh'
          ? '如何改善含乳？'
          : 'Bagaimana meningkatkan lekatan?');

    // Pain-aware question
    const painQ = log && log.painLevel >= 5
      ? (locale === 'en'
          ? `My pain level is ${log.painLevel}/10 — is it safe to breastfeed?`
          : locale === 'zh'
          ? `我的疼痛程度是${log.painLevel}/10，母乳喂养安全吗？`
          : `Tahap kesakitan saya ${log.painLevel}/10 — adakah selamat untuk menyusu?`)
      : (locale === 'en'
          ? 'Tips for increasing milk supply'
          : locale === 'zh'
          ? '增加奶量的技巧'
          : 'Tips meningkatkan bekalan susu');

    // Mood-aware question
    const moodQ = log && (log.mood === 'anxious' || log.mood === 'overwhelmed' || log.mood === 'sad' || log.mood === 'depressed')
      ? (locale === 'en'
          ? `I'm feeling ${log.mood} — what can I do to feel better today?`
          : locale === 'zh'
          ? `我感到${log.mood === 'anxious' ? '焦虑' : log.mood === 'overwhelmed' ? '不知所措' : log.mood === 'sad' ? '悲伤' : '抑郁'} — 今天我能做什么来改善心情？`
          : `Saya rasa ${log.mood === 'anxious' ? 'cemas' : log.mood === 'overwhelmed' ? 'tertekan' : log.mood === 'sad' ? 'sedih' : 'tertekan'} — apa yang boleh saya lakukan hari ini?`)
      : (locale === 'en'
          ? 'How do I know if my baby is getting enough milk?'
          : locale === 'zh'
          ? '如何知道宝宝是否喝到足够的奶？'
          : 'Bagaimana tahu bayi mendapat susu yang cukup?');

    // Week-specific recovery question
    const recoveryQ = locale === 'en'
      ? `What should I focus on for my recovery in Week ${week}?`
      : locale === 'zh'
      ? `第${week}周我的恢复应该关注什么？`
      : `Apa yang perlu saya fokus untuk pemulihan pada Minggu ${week}?`;

    // Energy-aware question
    const energyQ = log && (log.energyLevel === 'very-tired' || log.energyLevel === 'exhausted')
      ? (locale === 'en'
          ? `I'm exhausted — what are safe ways to boost my energy while breastfeeding?`
          : locale === 'zh'
          ? `我精疲力竭 — 哺乳期间有哪些安全的方法可以补充能量？`
          : `Saya keletihan — apakah cara selamat untuk meningkatkan tenaga semasa menyusu?`)
      : (locale === 'en'
          ? 'What foods help with postpartum recovery?'
          : locale === 'zh'
          ? '哪些食物有助于产后恢复？'
          : 'Makanan apa yang membantu pemulihan selepas bersalin?');

    // Stress-aware question
    const stressQ = log && log.stressLevel >= 7
      ? (locale === 'en'
          ? `My stress is ${log.stressLevel}/10 — can stress affect my milk supply?`
          : locale === 'zh'
          ? `我的压力是${log.stressLevel}/10 — 压力会影响我的奶量吗？`
          : `Tekanan saya ${log.stressLevel}/10 — bolehkah tekanan mempengaruhi bekalan susu saya?`)
      : (locale === 'en'
          ? 'How often should I feed my baby?'
          : locale === 'zh'
          ? '我应该多久喂一次宝宝？'
          : 'Berapa kerap saya perlu menyusu bayi?');

    // C-section specific
    const deliveryQ = profile.deliveryMethod === 'c-section'
      ? (locale === 'en'
          ? `I had a C-section — what should I watch out for on Day ${recoveryStage}?`
          : locale === 'zh'
          ? `我是剖腹产 — 第${recoveryStage}天我应该注意什么？`
          : `Saya bersalin caesar — apa yang perlu saya perhatikan pada Hari ${recoveryStage}?`)
      : (locale === 'en'
          ? 'Is it normal to have breast engorgement?'
          : locale === 'zh'
          ? '乳房胀痛正常吗？'
          : 'Adakah normal untuk mengalami payudara bengkak?');

    return [
      { icon: 'restaurant', text: mealQ },
      { icon: 'water_drop', text: pumpQ },
      { icon: 'bedtime', text: sleepQ },
      { icon: 'healing', text: painQ },
      { icon: 'mood', text: moodQ },
      { icon: 'calendar_month', text: recoveryQ },
      { icon: 'bolt', text: energyQ },
      { icon: 'psychology', text: stressQ },
      { icon: 'medical_services', text: deliveryQ },
    ];
  };

  // Shuffle all questions and pick 4 on mount — different every visit
  const [displayedQuestions] = useState(() => {
    const all = buildQuickQuestions();
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 4);
  });

  const parseResponse = (content: string): ParsedResponse => {
    const parsed: ParsedResponse = {};

    // Match headers in all 3 languages
    const quickAnswerHeaders = ['Quick Answer', '快速回答', 'Jawapan Pantas'];
    const whatToDoHeaders = ['What to Do', '该怎么做', 'Apa yang Perlu Dilakukan'];
    const whyHelpsHeaders = ['Why This Helps', '为什么有帮助', 'Mengapa Ini Membantu'];
    const seekHelpHeaders = ['When to Seek Help', '何时寻求帮助', 'Bila Perlu Dapatkan Bantuan'];

    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const extract = (headers: string[], nextHeaders?: string[]): string | null => {
      const h = headers.map(escape).join('|');
      const pattern = nextHeaders
        ? new RegExp(`\\*\\*(${h})\\*\\*\\s*\\n(.*?)(?=\\n\\*\\*(${nextHeaders.map(escape).join('|')})\\*\\*|$)`, 's')
        : new RegExp(`\\*\\*(${h})\\*\\*\\s*\\n(.*?)$`, 's');
      const m = content.match(pattern);
      return m ? m[2].trim() : null;
    };

    const quickAnswerRaw = extract(quickAnswerHeaders, whatToDoHeaders);
    if (quickAnswerRaw) parsed.quickAnswer = quickAnswerRaw.replace(/\*\*/g, '').trim();

    const whatToDoRaw = extract(whatToDoHeaders, whyHelpsHeaders);
    if (whatToDoRaw) {
      const steps = whatToDoRaw
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map(line => line.replace(/^[•\-]\s*/, '').replace(/\*\*/g, '').trim())
        .filter(line => line.length > 0);
      if (steps.length > 0) parsed.whatToDo = steps;
    }

    const whyHelpsRaw = extract(whyHelpsHeaders, seekHelpHeaders);
    if (whyHelpsRaw) parsed.whyThisHelps = whyHelpsRaw.replace(/\*\*/g, '').trim();

    const seekHelpRaw = extract(seekHelpHeaders);
    if (seekHelpRaw) parsed.whenToSeekHelp = seekHelpRaw.replace(/\*\*/g, '').trim();

    if (!parsed.quickAnswer && !parsed.whatToDo && !parsed.whyThisHelps && !parsed.whenToSeekHelp) {
      parsed.rawText = content;
    }

    return parsed;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/breastfeeding-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10),
          recoveryStage,
          deliveryMethod: profile.deliveryMethod,
          locale: profile.locale
        })
      });

      const data = await response.json();
      const assistantMessage: ChatMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);

      // If AI flagged urgent symptoms, show alert and fire email
      if (data.urgent && data.urgentSymptoms?.length > 0) {
        setUrgentAlert({ symptoms: data.urgentSymptoms });

        // Send emergency alert email if user has email configured
        if (profile.email) {
          sendEmergencyAlert({
            userId: profile.motherName || 'user',
            email: profile.email,
            emergencyContactEmail: profile.emergencyContactEmail,
            motherName: profile.motherName,
            symptoms: data.urgentSymptoms,
            locale: profile.locale,
          });
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-section-margin">
        <h1 className="font-display-lg text-display-lg text-primary mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-5xl">smart_toy</span>
          {locale === 'en' ? 'AI Support' : locale === 'zh' ? 'AI 支持' : 'Sokongan AI'}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {locale === 'en' ? `Personalised advice for Day ${recoveryStage} — ask about feeding, nutrition, pumping, and recovery` : 
           locale === 'zh' ? `第${recoveryStage}天的个性化建议 — 询问喂养、营养、泵奶和恢复` : 
           `Nasihat peribadi untuk Hari ${recoveryStage} — tanya tentang penyusuan, pemakanan, pam, dan pemulihan`}
        </p>
      </div>

      {/* Urgent Medical Alert Banner */}
      {urgentAlert && (
        <div className="mb-4 rounded-xl border-2 border-error bg-error/5 p-4 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
          <span className="material-symbols-outlined text-error text-2xl shrink-0 mt-0.5">emergency</span>
          <div className="flex-1">
            <p className="font-label-sm text-label-sm text-error mb-1">
              {locale === 'en' ? '🚨 Urgent: Seek Medical Attention Now' :
               locale === 'zh' ? '🚨 紧急：请立即就医' :
               '🚨 Segera: Dapatkan Rawatan Perubatan Sekarang'}
            </p>
            <p className="font-body-md text-body-md text-on-surface mb-3">
              {locale === 'en'
                ? 'Your message contains symptoms that may need immediate medical attention. An alert has been sent to your emergency contact.'
                : locale === 'zh'
                ? '您的消息包含可能需要立即就医的症状。已向您的紧急联系人发送警报。'
                : 'Mesej anda mengandungi simptom yang mungkin memerlukan perhatian perubatan segera. Amaran telah dihantar kepada kenalan kecemasan anda.'}
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="tel:999"
                className="flex items-center gap-2 bg-error text-on-error font-label-sm text-label-sm px-4 py-2 rounded-xl"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                {locale === 'en' ? 'Call 999' : locale === 'zh' ? '拨打999' : 'Hubungi 999'}
              </a>
              {profile.emergencyPhone && (
                <a
                  href={`tel:${profile.emergencyPhone}`}
                  className="flex items-center gap-2 bg-surface border-2 border-error text-error font-label-sm text-label-sm px-4 py-2 rounded-xl"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  {locale === 'en' ? `Call ${profile.emergencyContact}` :
                   locale === 'zh' ? `致电 ${profile.emergencyContact}` :
                   `Hubungi ${profile.emergencyContact}`}
                </a>
              )}
              <button
                onClick={() => setUrgentAlert(null)}
                className="ml-auto text-on-surface-variant font-label-sm text-label-sm px-3 py-2 rounded-xl hover:bg-surface-variant transition-colors"
              >
                {locale === 'en' ? 'Dismiss' : locale === 'zh' ? '关闭' : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="glass-card rounded-xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-6xl text-primary mb-4 block">
                smart_toy
              </span>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                {locale === 'en' ? 'Your AI Support is ready' : 
                 locale === 'zh' ? '您的AI支持已准备好' : 
                 'Sokongan AI anda sedia'}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                {locale === 'en' ? `Suggestions based on your Day ${recoveryStage} data — tap one or type your own question.` : 
                 locale === 'zh' ? `基于您第${recoveryStage}天数据的建议 — 点击一个或输入您自己的问题。` : 
                 `Cadangan berdasarkan data Hari ${recoveryStage} anda — ketik satu atau taip soalan anda sendiri.`}
              </p>
              
              {/* Quick Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                {displayedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q.text)}
                    className="p-4 rounded-xl bg-surface-variant text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container hover:border-primary transition-all text-left flex items-center gap-3"
                  >
                    <span className="material-symbols-outlined text-primary">{q.icon}</span>
                    <span className="font-body-md text-body-md">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] p-4 rounded-2xl bg-primary text-on-primary rounded-br-sm">
                    <p className="font-body-md text-body-md whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            } else {
              const parsed = parseResponse(msg.content);
              
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        smart_toy
                      </span>
                      <span className="font-label-sm text-label-sm text-primary">
                        {locale === 'en' ? 'AI Support' : 
                         locale === 'zh' ? 'AI 支持' : 
                         'Sokongan AI'}
                      </span>
                    </div>

                    {/* Quick Answer */}
                    {parsed.quickAnswer && (
                      <div className="glass-card rounded-xl p-4 border-l-4 border-primary">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">
                            lightbulb
                          </span>
                          <div>
                            <h4 className="font-label-sm text-label-sm text-primary mb-1">
                              {locale === 'en' ? 'Quick Answer' : locale === 'zh' ? '快速回答' : 'Jawapan Pantas'}
                            </h4>
                            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                              {parsed.quickAnswer}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* What to Do */}
                    {parsed.whatToDo && parsed.whatToDo.length > 0 && (
                      <div className="glass-card rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-secondary text-xl shrink-0 mt-0.5">
                            checklist
                          </span>
                          <div className="flex-1">
                            <h4 className="font-label-sm text-label-sm text-secondary mb-2">
                              {locale === 'en' ? 'What to Do' : locale === 'zh' ? '该怎么做' : 'Apa yang Perlu Dilakukan'}
                            </h4>
                            <ul className="space-y-2">
                              {parsed.whatToDo.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-secondary mt-1 shrink-0">•</span>
                                  <span className="font-body-md text-body-md text-on-surface">
                                    {step}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Why This Helps */}
                    {parsed.whyThisHelps && (
                      <div className="glass-card rounded-xl p-4 bg-tertiary/5">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-tertiary text-xl shrink-0 mt-0.5">
                            info
                          </span>
                          <div>
                            <h4 className="font-label-sm text-label-sm text-tertiary mb-1">
                              {locale === 'en' ? 'Why This Helps' : locale === 'zh' ? '为什么有帮助' : 'Mengapa Ini Membantu'}
                            </h4>
                            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                              {parsed.whyThisHelps}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* When to Seek Help */}
                    {parsed.whenToSeekHelp && (
                      <div className="glass-card rounded-xl p-4 border-l-4 border-error bg-error/5">
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">
                            warning
                          </span>
                          <div>
                            <h4 className="font-label-sm text-label-sm text-error mb-1">
                              {locale === 'en' ? 'When to Seek Help' : locale === 'zh' ? '何时寻求帮助' : 'Bila Perlu Dapatkan Bantuan'}
                            </h4>
                            <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                              {parsed.whenToSeekHelp}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Raw Text Fallback */}
                    {parsed.rawText && (
                      <div className="glass-card rounded-xl p-4">
                        <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                          {parsed.rawText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-2xl bg-surface-container text-on-surface rounded-bl-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary animate-pulse">
                    smart_toy
                  </span>
                  <span className="font-body-md text-body-md text-on-surface-variant italic flex items-center">
                    {locale === 'en' ? 'Typing' : locale === 'zh' ? '输入中' : 'Menaip'}&nbsp;<LoadingDots />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-outline-variant/30 p-4 bg-surface-container-low">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={locale === 'en' ? 'Ask your question...' : 
                          locale === 'zh' ? '提出您的问题...' : 
                          'Tanya soalan anda...'}
              disabled={loading}
              className="flex-1 p-3 rounded-xl border-2 border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-xl flex items-center gap-2 min-h-touch-target-min disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {locale === 'en' ? 'Sending' : locale === 'zh' ? '发送中' : 'Menghantar'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">send</span>
                  {locale === 'en' ? 'Send' : locale === 'zh' ? '发送' : 'Hantar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 glass-card rounded-xl p-6 border-l-4 border-primary">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-primary text-3xl">info</span>
          <div>
            <h3 className="font-headline-md text-[18px] text-on-surface mb-2">
              {locale === 'en' ? 'AI-Powered Guidance' : 
               locale === 'zh' ? 'AI驱动的指导' : 
               'Panduan Berkuasa AI'}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {locale === 'en' 
                ? 'Suggestions are personalised to your recovery day and recent check-in data. For persistent concerns, consult your healthcare provider.'
                : locale === 'zh'
                ? '建议根据您的恢复天数和最近的健康记录进行个性化。对于持续的问题，请咨询您的医疗保健提供者。'
                : 'Cadangan diperibadikan mengikut hari pemulihan dan data daftar masuk terkini anda. Untuk kebimbangan berterusan, sila rujuk penyedia penjagaan kesihatan anda.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
