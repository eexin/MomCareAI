import { useState, useEffect, useRef } from 'react';
import type { UserProfile, HealthCheckData } from '../types';
import { t, type Locale } from '../translations';
import { API_URL } from '../config';
import { sendEmergencyAlert, sendMilestoneCelebration, sendPPDConcern } from '../notifications';
import LoadingDots from './LoadingDots';

interface WellnessCheckProps {
  profile: UserProfile;
  recoveryStage: number;
  deviceId: string;
  locale: Locale;
  onNavigate?: (view: string) => void;
}

export default function WellnessCheck({ profile, recoveryStage, deviceId, locale, onNavigate }: WellnessCheckProps) {
  const getLastEntry = () => {
    const history = JSON.parse(localStorage.getItem(`health_${deviceId}`) || '[]');
    return history[0] || null;
  };

  const lastEntry = getLastEntry();
  
  const [formData, setFormData] = useState<HealthCheckData>({
    sleepHours: lastEntry?.sleepHours || 8,
    painLevel: lastEntry?.painLevel || 0,
    bleedingLevel: lastEntry?.bleedingLevel || 'moderate',
    energyLevel: lastEntry?.energyLevel || 'tired',
    breastPainSwelling: lastEntry?.breastPainSwelling || 'none',
    mood: lastEntry?.mood || 'calm',
    stressLevel: lastEntry?.stressLevel || 0,
    babyFeedingStatus: lastEntry?.babyFeedingStatus || 'feeding-well',
    appetite: lastEntry?.appetite || 'good',
    breastfeedingConcerns: '',
    timestamp: new Date().toISOString()
  });
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSaved, setAutoSaved] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showMedicalAlert, setShowMedicalAlert] = useState(false);
  const [alertLevel, setAlertLevel] = useState<'seek-immediate-care' | 'monitor-closely' | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const weekNumber = Math.ceil(recoveryStage / 7);

  // Auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = { ...formData, timestamp: new Date().toISOString() };
      localStorage.setItem(`health_draft_${deviceId}`, JSON.stringify(draft));
      setAutoSaved(true);
      setTimeout(() => setAutoSaved(false), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, deviceId]);

  // Unused for now - may be needed for future quick log feature
  // const _handleQuickLog = (actionLabel: string) => {
  //   // Save to localStorage
  //   const quickLogs = JSON.parse(localStorage.getItem(`quick_logs_${deviceId}`) || '[]');
  //   const newLog = {
  //     action: actionLabel,
  //     timestamp: new Date().toISOString(),
  //     date: new Date().toLocaleDateString()
  //   };
  //   const updatedLogs = [newLog, ...quickLogs].slice(0, 100);
  //   localStorage.setItem(`quick_logs_${deviceId}`, JSON.stringify(updatedLogs));

  //   // Show auto-save indicator
  //   setAutoSaved(true);
  //   setTimeout(() => setAutoSaved(false), 2000);
  // };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const dataWithTimestamp = { 
        ...formData, 
        timestamp: new Date().toISOString(),
        notes: notes,
        symptoms: selectedSymptoms,
        routines: selectedRoutines
      };
      
      const response = await fetch(`${API_URL}/api/complete-care-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthData: dataWithTimestamp,
          profile,
          recoveryStage,
          weekNumber
        })
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const data = await response.json();
      setReport(data.report);
      
      // Trigger medical alert if status warrants it
      const status = data.report?.recoverySummary?.status;
      if (status === 'seek-immediate-care' || status === 'monitor-closely') {
        setAlertLevel(status);
        setShowMedicalAlert(true);

        // Send email notification if user has notifications enabled
        const notifSettings = profile.notificationSettings;
        if (notifSettings?.enabled && notifSettings?.emergencyAlerts !== false && profile.email) {
          const userId = profile.motherName || 'user';

          if (status === 'seek-immediate-care') {
            // Emergency alert email — also CC emergency contact
            sendEmergencyAlert({
              userId,
              email: profile.email,
              emergencyContactEmail: profile.emergencyContactEmail,
              motherName: profile.motherName || '',
              symptoms: dataWithTimestamp.symptoms || [],
              locale: profile.locale || 'en',
            });
          } else {
            // PPD / monitor concern email — also CC emergency contact
            sendPPDConcern({
              userId,
              email: profile.email,
              emergencyContactEmail: profile.emergencyContactEmail,
              motherName: profile.motherName || '',
              locale: profile.locale || 'en',
            });
          }
        }
      }

      // Milestone celebration email (every 7 days)
      if (recoveryStage > 0 && recoveryStage % 7 === 0) {
        const notifSettings = profile.notificationSettings;
        if (notifSettings?.enabled && profile.email) {
          const weekNum = Math.ceil(recoveryStage / 7);
          const milestoneText =
            profile.locale === 'zh' ? `您已完成产后恢复第${weekNum}周！` :
            profile.locale === 'ms' ? `Anda telah melengkapkan Minggu ${weekNum} pemulihan!` :
            `You've completed Week ${weekNum} of your recovery!`;
          sendMilestoneCelebration({
            userId: profile.motherName || 'user',
            email: profile.email,
            motherName: profile.motherName || '',
            dayNumber: recoveryStage,
            milestone: milestoneText,
            locale: profile.locale || 'en',
          });
        }
      }
      
      // Save to history
      const history = JSON.parse(localStorage.getItem(`health_${deviceId}`) || '[]');
      const updatedHistory = [dataWithTimestamp, ...history].slice(0, 30);
      localStorage.setItem(`health_${deviceId}`, JSON.stringify(updatedHistory));
      localStorage.removeItem(`health_draft_${deviceId}`);
      
      // Auto-scroll to report after a brief delay
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError('Failed to generate care report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateMetric = (field: keyof HealthCheckData, delta: number) => {
    const currentValue = formData[field] as number;
    let newValue = currentValue + delta;
    
    // Set bounds based on field
    if (field === 'sleepHours') {
      newValue = Math.max(0, Math.min(12, newValue));
    } else {
      newValue = Math.max(1, Math.min(10, newValue));
    }
    
    setFormData({ ...formData, [field]: newValue });
  };

  const moods = [
    { value: 'happy', emoji: '😊', label: t(locale, 'great') },
    { value: 'calm', emoji: '😌', label: t(locale, 'okay') },
    { value: 'anxious', emoji: '🥱', label: t(locale, 'tired') },
    { value: 'worried', emoji: '😟', label: t(locale, 'worried') },
    { value: 'sad', emoji: '😢', label: t(locale, 'sad') },
    { value: 'stressed', emoji: '😰', label: t(locale, 'stressed') },
    { value: 'energetic', emoji: '🤗', label: t(locale, 'energetic') },
    { value: 'grateful', emoji: '🙏', label: t(locale, 'grateful') }
  ];

  const symptoms = [
    { icon: '🩸', label: t(locale, 'heavyBleeding'), value: 'heavy-bleeding' },
    { icon: '🤕', label: t(locale, 'severeHeadache'), value: 'severe-headache' },
    { icon: '🌡️', label: t(locale, 'fever'), value: 'fever' },
    { icon: '😵', label: t(locale, 'dizziness'), value: 'dizziness' },
    { icon: '💔', label: t(locale, 'chestPain'), value: 'chest-pain' },
    { icon: '🤢', label: t(locale, 'nausea'), value: 'nausea' },
    { icon: '😰', label: t(locale, 'anxiety'), value: 'anxiety' },
    { icon: '😢', label: t(locale, 'crying'), value: 'crying' },
    { icon: '🦵', label: t(locale, 'legPain'), value: 'leg-pain' },
    { icon: '🤒', label: t(locale, 'chills'), value: 'chills' },
    { icon: '💊', label: t(locale, 'incisionPain'), value: 'incision-pain' },
    { icon: '🤱', label: t(locale, 'breastPain'), value: 'breast-pain' },
    { icon: '😴', label: t(locale, 'insomnia'), value: 'insomnia' },
    { icon: '🫀', label: t(locale, 'rapidHeartbeat'), value: 'rapid-heartbeat' },
    { icon: '😣', label: t(locale, 'backPain'), value: 'back-pain' },
    { icon: '🌀', label: t(locale, 'confusion'), value: 'confusion' }
  ];

  const routines = [
    { icon: '🚿', label: t(locale, 'showered'), value: 'showered' },
    { icon: '🍽️', label: t(locale, 'ateThreeMeals'), value: 'ate-meals' },
    { icon: '💊', label: t(locale, 'tookMedication'), value: 'took-medication' },
    { icon: '🚶', label: t(locale, 'walkedOutside'), value: 'walked-outside' },
    { icon: '🧘', label: t(locale, 'stretchedExercised'), value: 'stretched' },
    { icon: '📱', label: t(locale, 'calledSupport'), value: 'called-support' },
    { icon: '🛏️', label: t(locale, 'restedWell'), value: 'rested-well' },
    { icon: '🤱', label: t(locale, 'bondedWithBaby'), value: 'bonded-baby' },
    { icon: '💧', label: t(locale, 'drankWater'), value: 'drank-water' },
    { icon: '🧴', label: t(locale, 'skinCare'), value: 'skin-care' },
    { icon: '📖', label: t(locale, 'readRelaxed'), value: 'read-relaxed' },
    { icon: '🧘‍♀️', label: t(locale, 'meditated'), value: 'meditated' },
    { icon: '👗', label: t(locale, 'changedClothes'), value: 'changed-clothes' },
    { icon: '🍎', label: t(locale, 'ateHealthy'), value: 'ate-healthy' },
    { icon: '😴', label: t(locale, 'napped'), value: 'napped' },
    { icon: '🏥', label: t(locale, 'attendedAppointment'), value: 'attended-appointment' }
  ];

  const toggleSymptom = (value: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  const toggleRoutine = (value: string) => {
    setSelectedRoutines(prev =>
      prev.includes(value) ? prev.filter(r => r !== value) : [...prev, value]
    );
  };

  return (
    <div className="max-w-6xl mx-auto relative pb-24 md:pb-0">

      {/* ── Medical Alert Modal ─────────────────────────────────────────── */}
      {showMedicalAlert && alertLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
            alertLevel === 'seek-immediate-care' ? 'bg-error-container' : ''
          }`} style={alertLevel !== 'seek-immediate-care' ? { backgroundColor: '#fdf7ff' } : {}}>
            {/* Top bar */}
            <div className={`px-6 py-4 flex items-center gap-3 ${
              alertLevel === 'seek-immediate-care' ? 'bg-error' : 'bg-tertiary'
            }`}>
              <span className="material-symbols-outlined text-on-error text-3xl">
                {alertLevel === 'seek-immediate-care' ? 'emergency' : 'health_and_safety'}
              </span>
              <h2 className="font-headline-md text-headline-md text-on-error flex-1">
                {alertLevel === 'seek-immediate-care'
                  ? (locale === 'en' ? 'Seek Medical Attention Now' : locale === 'zh' ? '请立即就医' : 'Dapatkan Rawatan Segera')
                  : (locale === 'en' ? 'Monitor Your Symptoms' : locale === 'zh' ? '请关注您的症状' : 'Pantau Simptom Anda')}
              </h2>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {alertLevel === 'seek-immediate-care' ? (
                <>
                  <p className="font-body-lg text-body-lg text-on-surface mb-5">
                    {locale === 'en'
                      ? 'Based on your check-in, your symptoms may need immediate medical attention. Please call an ambulance or go to the nearest hospital right away.'
                      : locale === 'zh'
                      ? '根据您的健康记录，您的症状可能需要立即就医。请立即拨打救护车或前往最近的医院。'
                      : 'Berdasarkan daftar masuk anda, simptom anda mungkin memerlukan perhatian perubatan segera. Sila hubungi ambulans atau pergi ke hospital terdekat sekarang.'}
                  </p>

                  {/* Ambulance call button */}
                  <a
                    href="tel:999"
                    className="w-full mb-3 flex items-center justify-center gap-3 bg-error text-on-error font-headline-md text-headline-md px-6 py-4 rounded-xl hover:shadow-lg transition-shadow"
                  >
                    <span className="material-symbols-outlined text-3xl">ambulance</span>
                    {locale === 'en' ? 'Call Ambulance — 999' : locale === 'zh' ? '拨打救护车 — 999' : 'Hubungi Ambulans — 999'}
                  </a>

                  {/* Emergency contact if set */}
                  {profile.emergencyContact && profile.emergencyPhone && (
                    <a
                      href={`tel:${profile.emergencyPhone}`}
                      className="w-full mb-3 flex items-center justify-center gap-3 bg-primary text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-xl hover:shadow-lg transition-shadow"
                    >
                      <span className="material-symbols-outlined">call</span>
                      {locale === 'en' ? 'Call' : locale === 'zh' ? '致电' : 'Hubungi'} {profile.emergencyContact} — {profile.emergencyPhone}
                    </a>
                  )}

                  {/* Go to emergency resources */}
                  {onNavigate && (
                    <button
                      onClick={() => { setShowMedicalAlert(false); onNavigate('emergency'); }}
                      className="w-full mb-3 flex items-center justify-center gap-2 bg-surface border-2 border-error text-error font-label-sm text-label-sm px-6 py-3 rounded-xl hover:bg-error/5 transition-colors"
                    >
                      <span className="material-symbols-outlined">emergency</span>
                      {locale === 'en' ? 'View Emergency Resources' : locale === 'zh' ? '查看紧急资源' : 'Lihat Sumber Kecemasan'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="font-body-lg text-body-lg text-on-surface mb-5">
                    {locale === 'en'
                      ? 'Your check-in shows some symptoms that need monitoring. Please contact your doctor or midwife today if symptoms worsen.'
                      : locale === 'zh'
                      ? '您的健康记录显示一些需要关注的症状。如果症状加重，请今天联系您的医生或助产士。'
                      : 'Daftar masuk anda menunjukkan beberapa simptom yang perlu dipantau. Sila hubungi doktor atau bidan anda hari ini jika simptom bertambah teruk.'}
                  </p>

                  {profile.emergencyContact && profile.emergencyPhone && (
                    <a
                      href={`tel:${profile.emergencyPhone}`}
                      className="w-full mb-3 flex items-center justify-center gap-3 bg-primary text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-xl hover:shadow-lg transition-shadow"
                    >
                      <span className="material-symbols-outlined">call</span>
                      {locale === 'en' ? 'Call' : locale === 'zh' ? '致电' : 'Hubungi'} {profile.emergencyContact}
                    </a>
                  )}

                  {onNavigate && (
                    <button
                      onClick={() => { setShowMedicalAlert(false); onNavigate('emergency'); }}
                      className="w-full mb-3 flex items-center justify-center gap-2 bg-surface border-2 border-tertiary text-tertiary font-label-sm text-label-sm px-6 py-3 rounded-xl hover:bg-tertiary/5 transition-colors"
                    >
                      <span className="material-symbols-outlined">health_and_safety</span>
                      {locale === 'en' ? 'View Emergency Resources' : locale === 'zh' ? '查看紧急资源' : 'Lihat Sumber Kecemasan'}
                    </button>
                  )}
                </>
              )}

              {/* Dismiss */}
              <button
                onClick={() => setShowMedicalAlert(false)}
                className="w-full text-center font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors py-2"
              >
                {locale === 'en' ? 'I understand, view my report' : locale === 'zh' ? '我已了解，查看报告' : 'Saya faham, lihat laporan saya'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Auto-saved Indicator */}
      {autoSaved && (
        <div className="fixed top-20 right-4 md:absolute md:top-0 md:right-container-padding flex items-center gap-2 text-primary bg-primary/10 px-3 py-1.5 rounded-full font-label-sm text-label-sm stagger-1 z-50 shadow-lg">
          <span className="material-symbols-outlined text-[16px]">cloud_done</span>
          {t(locale, 'autoSaved')}
        </div>
      )}

      <div className="mb-section-margin mt-8 stagger-1">
        <h2 className="font-display-lg text-display-lg text-on-surface mb-2">{t(locale, 'howAreYouFeeling')}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t(locale, 'logDailyWellness')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Mood & Symptoms */}
        <div className="flex flex-col gap-8">
          {/* Mood Selection */}
          <section className="glass-card gradient-border p-6 stagger-2 rounded-xl">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4">{t(locale, 'currentMood')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setFormData({ ...formData, mood: mood.value as any })}
                  className={`flex flex-col items-center justify-center px-2 py-3 rounded-xl border min-h-[88px] transition-colors ${
                    formData.mood === mood.value
                      ? 'border-secondary bg-secondary/10 shadow-[inset_0_0_0_1px_theme(colors.secondary)]'
                      : 'border-outline-variant bg-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="text-3xl mb-2">{mood.emoji}</span>
                  <span className={`font-label-sm text-label-sm text-center whitespace-nowrap ${
                    formData.mood === mood.value ? 'text-secondary' : 'text-on-surface'
                  }`}>
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Symptoms */}
          <section className="glass-card gradient-border p-6 stagger-3 rounded-xl">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{t(locale, 'symptoms')}</h3>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-4">
              {t(locale, 'symptomsDesc')}
            </p>
            <div className="flex flex-wrap gap-3">
              {symptoms.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom.value);
                return (
                  <button
                    key={symptom.value}
                    onClick={() => toggleSymptom(symptom.value)}
                    className={`font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min transition-all ${
                      isSelected
                        ? 'bg-error/10 text-error border-2 border-error'
                        : 'bg-surface-variant text-on-surface-variant hover:bg-outline-variant/50 border border-outline-variant/30'
                    }`}
                  >
                    <span>{symptom.icon}</span> {symptom.label}
                    {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </button>
                );
              })}
            </div>
            {selectedSymptoms.length > 0 && (
              <p className="mt-3 font-body-md text-[13px] text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                {t(locale, 'selectedSymptoms', { count: String(selectedSymptoms.length) })}
              </p>
            )}
          </section>

          {/* Routines */}
          <section className="glass-card gradient-border p-6 stagger-4 rounded-xl">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{t(locale, 'routines')}</h3>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-4">
              {t(locale, 'routinesDesc')}
            </p>
            <div className="flex flex-wrap gap-3">
              {routines.map((routine) => {
                const isSelected = selectedRoutines.includes(routine.value);
                return (
                  <button
                    key={routine.value}
                    onClick={() => toggleRoutine(routine.value)}
                    className={`font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min transition-all ${
                      isSelected
                        ? 'btn-3d text-on-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]'
                        : 'bg-surface-variant text-on-surface-variant hover:bg-outline-variant/50 border border-outline-variant/30'
                    }`}
                  >
                    <span>{routine.icon}</span> {routine.label}
                    {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </button>
                );
              })}
            </div>
            {selectedRoutines.length > 0 && (
              <p className="mt-3 font-body-md text-[13px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {t(locale, 'completedRoutines', { count: String(selectedRoutines.length) })}
              </p>
            )}
          </section>
        </div>

        {/* Right Side: Health Metrics */}
        <div className="flex flex-col gap-6">
          <section className="glass-card gradient-border p-6 stagger-4 rounded-xl">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-6">{t(locale, 'dailyMetrics')}</h3>
            <div className="flex flex-col gap-stack-gap">
              {/* Sleep Metric */}
              <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">bedtime</span>
                  </div>
                  <div>
                    <h4 className="font-label-sm text-label-sm text-on-surface">{t(locale, 'sleep')}</h4>
                    <p className="font-body-md text-[13px] text-on-surface-variant">{t(locale, 'hoursLastNight')}</p>
                  </div>
                </div>
                <div className="flex items-center bg-surface-variant rounded-full p-1">
                  <button
                    onClick={() => updateMetric('sleepHours', -0.5)}
                    className="w-8 h-8 rounded-full bg-surface shadow-sm flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="font-headline-md text-headline-md w-12 text-center text-primary">
                    {formData.sleepHours}
                  </span>
                  <button
                    onClick={() => updateMetric('sleepHours', 0.5)}
                    className="w-8 h-8 rounded-full bg-surface shadow-sm flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>

              {/* Pain Level Metric */}
              <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center">
                    <span className="material-symbols-outlined">healing</span>
                  </div>
                  <div>
                    <h4 className="font-label-sm text-label-sm text-on-surface">{t(locale, 'physicalPain')}</h4>
                    <p className="font-body-md text-[13px] text-on-surface-variant">{t(locale, 'scale')}</p>
                  </div>
                </div>
                <div className="flex items-center bg-surface-variant rounded-full p-1">
                  <button
                    onClick={() => updateMetric('painLevel', -1)}
                    className="w-8 h-8 rounded-full bg-surface shadow-sm flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="font-headline-md text-headline-md w-12 text-center text-error">
                    {formData.painLevel}
                  </span>
                  <button
                    onClick={() => updateMetric('painLevel', 1)}
                    className="w-8 h-8 rounded-full bg-surface shadow-sm flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>

              {/* Stress Level Metric */}
              <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined">psychology</span>
                  </div>
                  <div>
                    <h4 className="font-label-sm text-label-sm text-on-surface">{t(locale, 'stressLevel')}</h4>
                    <p className="font-body-md text-[13px] text-on-surface-variant">{t(locale, 'scale')}</p>
                  </div>
                </div>
                <div className="flex items-center bg-surface-variant rounded-full p-1">
                  <button
                    onClick={() => updateMetric('stressLevel', -1)}
                    className="w-8 h-8 rounded-full bg-surface shadow-sm flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="font-headline-md text-headline-md w-12 text-center text-secondary">
                    {formData.stressLevel}
                  </span>
                  <button
                    onClick={() => updateMetric('stressLevel', 1)}
                    className="w-8 h-8 rounded-full bg-surface shadow-sm flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mt-6">
              <label className="block mb-2">
                <span className="font-label-sm text-label-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                  {t(locale, 'notesOptional')}
                </span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(locale, 'notesPlaceholder')}
                className="w-full p-4 rounded-xl bg-surface border border-outline-variant/30 text-on-surface font-body-md text-body-md resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                rows={4}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-3d text-on-primary font-label-sm text-label-sm px-8 py-3 rounded-full flex items-center justify-center gap-2 min-h-touch-target-min w-full sm:w-auto disabled:opacity-50"
              >
                {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {t(locale, 'generating')}<LoadingDots />
                </>
              ) : (
                t(locale, 'saveCheckIn')
              )}
              </button>
            </div>
          </section>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-error-container text-on-error-container rounded-xl border-l-4 border-error">
          {error}
        </div>
      )}

      {report && (
        <div ref={reportRef} className="mt-8 space-y-4">
          {/* Main Recovery Summary */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                report.recoverySummary?.status === 'recovering-well'
                  ? 'bg-primary/10'
                  : report.recoverySummary?.status === 'monitor-closely'
                  ? 'bg-tertiary/10'
                  : 'bg-error/10'
              }`}>
                <span className={`material-symbols-outlined text-2xl ${
                  report.recoverySummary?.status === 'recovering-well'
                    ? 'text-primary'
                    : report.recoverySummary?.status === 'monitor-closely'
                    ? 'text-tertiary'
                    : 'text-error'
                }`}>
                  {report.recoverySummary?.status === 'recovering-well' ? 'check_circle' : 
                   report.recoverySummary?.status === 'monitor-closely' ? 'info' : 'warning'}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                  {report.recoverySummary?.status === 'recovering-well' && t(locale, 'youreDoingGreat')}
                  {report.recoverySummary?.status === 'monitor-closely' && t(locale, 'letsMonitorThis')}
                  {report.recoverySummary?.status === 'seek-immediate-care' && t(locale, 'pleaseSeekCare')}
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  {(report.recoverySummary?.message || report.recoverySummary)
                    .replace(/\*\*/g, '')
                    .replace(/##\s*/g, '')
                    .replace(/#\s*/g, '')
                    .replace(/💙|💚|💛|💜|❤️|🧡/g, '')
                    .replace(/Your Care Report.*?Day \d+/gi, '')
                    .trim()}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Priority */}
          {report.todaysPriority && (
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-secondary text-2xl">flag</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{t(locale, 'todaysPriority')}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {report.todaysPriority
                      .replace(/\*\*/g, '')
                      .replace(/##\s*/g, '')
                      .replace(/Today's Priority:?\s*/gi, '')
                      .replace(/今日重点:?\s*/g, '')
                      .replace(/Keutamaan Hari Ini:?\s*/gi, '')
                      .trim()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Tip */}
          {report.quickTip && (
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-tertiary text-2xl">lightbulb</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{t(locale, 'quickTip')}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    {report.quickTip
                      .replace(/\*\*/g, '')
                      .replace(/##\s*/g, '')
                      .replace(/Quick Tip:?\s*/gi, '')
                      .replace(/快速提示:?\s*/g, '')
                      .replace(/Petua Pantas:?\s*/gi, '')
                      .trim()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact (if status is concerning) */}
          {report.recoverySummary?.status !== 'recovering-well' && profile.emergencyContact && (
            <div className="glass-card rounded-xl p-6 border-l-4 border-error">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-error text-2xl">emergency</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{t(locale, 'yourEmergencyContact')}</h3>
                  <p className="font-body-md text-body-md text-on-surface">
                    {profile.emergencyContact} - <a href={`tel:${profile.emergencyPhone}`} className="text-primary hover:underline font-medium">{profile.emergencyPhone}</a>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Have Questions Box */}
          <div className="glass-card rounded-xl p-6 bg-gradient-to-r from-secondary/5 to-tertiary/5 border-l-4 border-secondary">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-secondary text-3xl">help</span>
              <div className="flex-1">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{t(locale, 'haveQuestions')}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  {t(locale, 'haveQuestionsDesc')}
                </p>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('community')}
                    className="btn-3d-secondary text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min"
                  >
                    <span className="material-symbols-outlined">groups</span>
                    {t(locale, 'visitCommunitySpace')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
