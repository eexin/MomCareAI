import { useState, useEffect, useRef } from 'react';
import type { UserProfile, HealthCheckData } from '../types';
import { translateValue, t } from '../translations';
import { API_URL } from '../config';
import LoadingDots from './LoadingDots';

interface RecoveryPlanProps {
  profile: UserProfile;
  recoveryStage: number;
  deviceId: string;
  locale: 'en' | 'zh' | 'ms';
}

interface DayPlan {
  day: number;
  focus: string;
  activities: string[];
  nutrition: string;
  selfCare: string;
  milestone?: string;
}

interface WeeklyPlan {
  weekTheme?: string;
  days?: DayPlan[];
  text?: string;
}

interface DayData {
  date: Date;
  dayNumber: number;
  hasCheckIn: boolean;
  healthData?: HealthCheckData;
  status?: 'good' | 'moderate' | 'concerning' | 'no-data';
}

export default function RecoveryPlan({ profile, recoveryStage, deviceId, locale }: RecoveryPlanProps) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayDetails, setDayDetails] = useState<any>(null);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);
  const dayDetailsRef = useRef<HTMLDivElement>(null);

  const weekNumber = Math.ceil(recoveryStage / 7);

  // Helper to translate symptom/routine values
  const translateSymptomRoutine = (value: string): string => {
    // Map stored values to translation keys
    const valueMap: { [key: string]: string } = {
      // Symptoms
      'heavy-bleeding': 'heavyBleeding',
      'severe-headache': 'severeHeadache',
      'fever': 'fever',
      'dizziness': 'dizziness',
      'chest-pain': 'chestPain',
      'nausea': 'nausea',
      'anxiety': 'anxiety',
      'crying': 'crying',
      'leg-pain': 'legPain',
      'chills': 'chills',
      'incision-pain': 'incisionPain',
      'breast-pain': 'breastPain',
      'insomnia': 'insomnia',
      'rapid-heartbeat': 'rapidHeartbeat',
      'back-pain': 'backPain',
      'confusion': 'confusion',
      // Routines
      'showered': 'showered',
      'ate-meals': 'ateThreeMeals',
      'took-medication': 'tookMedication',
      'walked-outside': 'walkedOutside',
      'stretched': 'stretchedExercised',
      'called-support': 'calledSupport',
      'rested-well': 'restedWell',
      'bonded-baby': 'bondedWithBaby',
      'drank-water': 'drankWater',
      'skin-care': 'skinCare',
      'read-relaxed': 'readRelaxed',
      'meditated': 'meditated',
      'changed-clothes': 'changedClothes',
      'ate-healthy': 'ateHealthy',
      'napped': 'napped',
      'attended-appointment': 'attendedAppointment'
    };
    
    const translationKey = valueMap[value];
    return translationKey ? t(locale, translationKey as any) : value;
  };

  const generatePlan = async () => {
    // Check for health logs first — no data means no personalised plan
    const healthHistory = JSON.parse(localStorage.getItem(`health_${deviceId}`) || '[]');
    if (healthHistory.length === 0) {
      setLoading(false);
      return; // Let the UI show the no-data prompt
    }

    setLoading(true);
    setError('');

    try {
      const latestHealthData = healthHistory[0] || null;
      
      const response = await fetch(`${API_URL}/api/recovery-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryStage,
          deliveryMethod: profile.deliveryMethod,
          locale: profile.locale,
          healthData: latestHealthData // Include latest check-in data
        })
      });

      const data = await response.json();
      setPlan(data.plan);
    } catch (err) {
      setError('Failed to generate recovery plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get 42-day calendar data
  const getCalendarData = (): DayData[] => {
    const birthDate = new Date(profile.babyBirthDate);
    const healthHistory = JSON.parse(localStorage.getItem(`health_${deviceId}`) || '[]');
    const calendarDays: DayData[] = [];

    for (let i = 1; i <= 42; i++) {
      const dayDate = new Date(birthDate);
      dayDate.setDate(birthDate.getDate() + i - 1);
      
      // Find health check for this day
      const dayCheckIn = healthHistory.find((entry: HealthCheckData) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate.toDateString() === dayDate.toDateString();
      });

      let status: 'good' | 'moderate' | 'concerning' | 'no-data' = 'no-data';
      if (dayCheckIn) {
        // Determine status based on metrics
        const avgScore = (
          (12 - dayCheckIn.sleepHours) + 
          dayCheckIn.painLevel + 
          dayCheckIn.stressLevel
        ) / 3;
        
        if (avgScore <= 4) status = 'good';
        else if (avgScore <= 7) status = 'moderate';
        else status = 'concerning';
      }

      calendarDays.push({
        date: dayDate,
        dayNumber: i,
        hasCheckIn: !!dayCheckIn,
        healthData: dayCheckIn,
        status
      });
    }

    return calendarDays;
  };

  const handleDayClick = async (day: DayData) => {
    if (!day.hasCheckIn) {
      setSelectedDay(day.dayNumber);
      setDayDetails(null);
      setTimeout(() => {
        dayDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }

    setSelectedDay(day.dayNumber);
    setLoadingDayDetails(true);
    setTimeout(() => {
      dayDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    try {
      // Generate AI summary for this day
      const response = await fetch(`${API_URL}/api/day-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthData: day.healthData,
          dayNumber: day.dayNumber,
          profile,
          locale
        })
      });

      const data = await response.json();
      setDayDetails(data.summary);
    } catch (err) {
      setDayDetails({ error: 'Failed to load day details' });
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const calendarData = getCalendarData();

  useEffect(() => {
    generatePlan();
  }, []);

  const milestones = [
    { week: 1, icon: 'healing', label: locale === 'en' ? 'Initial Recovery' : locale === 'zh' ? '初期恢复' : 'Pemulihan Awal', color: 'error' },
    { week: 2, icon: 'favorite', label: locale === 'en' ? 'Healing Progress' : locale === 'zh' ? '愈合进展' : 'Kemajuan Penyembuhan', color: 'tertiary' },
    { week: 6, icon: 'check_circle', label: locale === 'en' ? 'Checkup Time' : locale === 'zh' ? '检查时间' : 'Masa Pemeriksaan', color: 'primary' },
    { week: 12, icon: 'celebration', label: locale === 'en' ? 'Major Milestone' : locale === 'zh' ? '重要里程碑' : 'Pencapaian Utama', color: 'secondary' }
  ];

  const getDayColor = (dayNum: number) => {
    const colors = ['primary', 'secondary', 'tertiary', 'primary', 'secondary', 'tertiary', 'primary'];
    return colors[dayNum - 1] || 'primary';
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-section-margin">
        <h1 className="font-display-lg text-display-lg text-primary mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-5xl">calendar_month</span>
          {locale === 'en' ? 'Weekly Recovery Plan' : locale === 'zh' ? '每周恢复计划' : 'Pelan Pemulihan Mingguan'}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {locale === 'en' ? `Personalized for Week ${weekNumber}, Day ${recoveryStage}` : 
           locale === 'zh' ? `为第${weekNumber}周第${recoveryStage}天定制` : 
           `Diperibadikan untuk Minggu ${weekNumber}, Hari ${recoveryStage}`}
          {' • '}
          {profile.deliveryMethod === 'vaginal' ? 
            (locale === 'en' ? 'Vaginal' : locale === 'zh' ? '顺产' : 'Normal') : 
            (locale === 'en' ? 'C-Section' : locale === 'zh' ? '剖腹产' : 'Pembedahan')}
          {' '}
          {locale === 'en' ? 'Delivery' : locale === 'zh' ? '分娩' : 'Bersalin'}
        </p>
      </div>

      {/* Connected Devices */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined">devices</span>
            {locale === 'en' ? 'Connected Devices' : locale === 'zh' ? '连接设备' : 'Peranti Disambung'}
          </h2>
          <span className="text-[11px] font-label-sm text-on-surface-variant bg-surface-variant px-3 py-1 rounded-full">
            {locale === 'en' ? 'Coming Soon' : locale === 'zh' ? '即将推出' : 'Akan Datang'}
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mb-5">
          {locale === 'en'
            ? 'Connect your wearable or health device to automatically sync vitals into your recovery plan.'
            : locale === 'zh'
            ? '连接您的可穿戴设备或健康设备，自动将生命体征同步到您的恢复计划中。'
            : 'Sambungkan peranti boleh pakai atau peranti kesihatan anda untuk menyegerakkan tanda vital secara automatik ke dalam pelan pemulihan anda.'}
        </p>

        {/* Device metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {[
            { icon: 'favorite', color: 'text-error', label: locale === 'en' ? 'Blood Pressure' : locale === 'zh' ? '血压' : 'Tekanan Darah', unit: 'mmHg' },
            { icon: 'water_drop', color: 'text-secondary', label: locale === 'en' ? 'Blood Sugar' : locale === 'zh' ? '血糖' : 'Gula Darah', unit: 'mmol/L' },
            { icon: 'bedtime', color: 'text-primary', label: locale === 'en' ? 'Sleep Quality' : locale === 'zh' ? '睡眠质量' : 'Kualiti Tidur', unit: '%' },
            { icon: 'local_fire_department', color: 'text-tertiary', label: locale === 'en' ? 'Calories Burned' : locale === 'zh' ? '消耗卡路里' : 'Kalori Dibakar', unit: 'kcal' },
            { icon: 'directions_walk', color: 'text-primary', label: locale === 'en' ? 'Steps' : locale === 'zh' ? '步数' : 'Langkah', unit: 'steps' },
            { icon: 'monitor_heart', color: 'text-error', label: locale === 'en' ? 'Heart Rate' : locale === 'zh' ? '心率' : 'Kadar Jantung', unit: 'bpm' },
            { icon: 'thermostat', color: 'text-tertiary', label: locale === 'en' ? 'Body Temp' : locale === 'zh' ? '体温' : 'Suhu Badan', unit: '°C' },
            { icon: 'air', color: 'text-secondary', label: locale === 'en' ? 'SpO₂' : locale === 'zh' ? '血氧' : 'SpO₂', unit: '%' },
            { icon: 'scale', color: 'text-on-surface-variant', label: locale === 'en' ? 'Weight' : locale === 'zh' ? '体重' : 'Berat', unit: 'kg' },
          ].map((metric, i) => (
            <div key={i} className="bg-surface-variant/40 rounded-xl p-4 border border-outline-variant/20 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className={`material-symbols-outlined text-[20px] ${metric.color} opacity-40`}>{metric.icon}</span>
                <span className="font-label-sm text-[11px] text-on-surface-variant">{metric.label}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="font-headline-md text-[22px] text-on-surface-variant/30 font-bold">--</span>
                <span className="font-body-sm text-[11px] text-on-surface-variant/40 mb-0.5">{metric.unit}</span>
              </div>
              {/* No-data overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant/20">link_off</span>
              </div>
            </div>
          ))}
        </div>

        {/* Connect button (fake) */}
        <button
          disabled
          className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-outline-variant text-on-surface-variant font-label-sm text-label-sm flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          {locale === 'en' ? 'Connect a Device' : locale === 'zh' ? '连接设备' : 'Sambung Peranti'}
        </button>
      </div>

      {/* Recovery Timeline */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">timeline</span>
          {locale === 'en' ? 'Recovery Milestones' : locale === 'zh' ? '恢复里程碑' : 'Pencapaian Pemulihan'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {milestones.map((milestone) => (
            <div
              key={milestone.week}
              className={`p-4 rounded-xl text-center transition-all ${
                weekNumber >= milestone.week
                  ? `bg-${milestone.color}/10 border-2 border-${milestone.color}`
                  : 'bg-surface-variant border-2 border-outline-variant/30'
              }`}
            >
              <span
                className={`material-symbols-outlined text-3xl mb-2 block ${
                  weekNumber >= milestone.week ? `text-${milestone.color}` : 'text-on-surface-variant'
                }`}
                style={weekNumber >= milestone.week ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {milestone.icon}
              </span>
              <div className="font-label-sm text-label-sm text-on-surface mb-1">
                {locale === 'en' ? 'Week' : locale === 'zh' ? '周' : 'Minggu'} {milestone.week}
              </div>
              <div className="font-body-md text-[12px] text-on-surface-variant">
                {milestone.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 42-Day Calendar */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">calendar_view_month</span>
          {locale === 'en' ? '42-Day Recovery Calendar' : locale === 'zh' ? '42天恢复日历' : 'Kalendar Pemulihan 42 Hari'}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">
          {locale === 'en' 
            ? 'Click on any day to view your wellness check-in and AI insights for that day.'
            : locale === 'zh'
            ? '点击任何一天查看您的健康签到和该天的AI见解。'
            : 'Klik pada mana-mana hari untuk melihat daftar masuk kesihatan dan pandangan AI untuk hari tersebut.'}
        </p>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {calendarData.map((day) => {
            const isSelected = selectedDay === day.dayNumber;
            
            return (
              <button
                key={day.dayNumber}
                onClick={() => handleDayClick(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all hover:scale-105 relative
                  ${day.status === 'good' ? 'bg-primary/10 hover:bg-primary/20' : ''}
                  ${day.status === 'moderate' ? 'bg-tertiary/10 hover:bg-tertiary/20' : ''}
                  ${day.status === 'concerning' ? 'bg-error/10 hover:bg-error/20' : ''}
                  ${day.status === 'no-data' ? 'bg-surface-variant hover:bg-surface-variant/80' : ''}
                  ${isSelected ? 'scale-105 shadow-lg ring-2 ring-secondary' : ''}
                `}
              >
                {/* Day Number */}
                <span className={`font-headline-sm text-[16px] font-bold mb-1
                  ${day.status === 'good' ? 'text-primary' : ''}
                  ${day.status === 'moderate' ? 'text-tertiary' : ''}
                  ${day.status === 'concerning' ? 'text-error' : ''}
                  ${day.status === 'no-data' ? 'text-on-surface-variant' : ''}
                `}>
                  {day.dayNumber}
                </span>
                
                {/* Check Icon for days with data */}
                {day.hasCheckIn && (
                  <span 
                    className={`material-symbols-outlined text-[14px]
                      ${day.status === 'good' ? 'text-primary' : ''}
                      ${day.status === 'moderate' ? 'text-tertiary' : ''}
                      ${day.status === 'concerning' ? 'text-error' : ''}
                    `}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[13px] font-body-md">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/10 border-2 border-primary"></div>
            <span className="text-on-surface-variant">
              {locale === 'en' ? 'Good Day' : locale === 'zh' ? '良好' : 'Hari Baik'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-tertiary/10 border-2 border-tertiary"></div>
            <span className="text-on-surface-variant">
              {locale === 'en' ? 'Moderate' : locale === 'zh' ? '中等' : 'Sederhana'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-error/10 border-2 border-error"></div>
            <span className="text-on-surface-variant">
              {locale === 'en' ? 'Needs Attention' : locale === 'zh' ? '需关注' : 'Perlu Perhatian'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-surface-variant border-2 border-outline-variant"></div>
            <span className="text-on-surface-variant">
              {locale === 'en' ? 'No Check-in' : locale === 'zh' ? '无数据' : 'Tiada Data'}
            </span>
          </div>
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div ref={dayDetailsRef} className="glass-card rounded-xl p-6 mb-6 border-l-4 border-secondary">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">event</span>
              {locale === 'en' ? 'Day' : locale === 'zh' ? '第' : 'Hari'} {selectedDay}
              {selectedDay === recoveryStage && (
                <span className="text-[14px] font-body-md text-secondary ml-2">
                  ({locale === 'en' ? 'Today' : locale === 'zh' ? '今天' : 'Hari Ini'})
                </span>
              )}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {loadingDayDetails ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
                psychology
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2 flex items-center justify-center">
                {locale === 'en' ? 'Analyzing day' : locale === 'zh' ? '分析中' : 'Menganalisis'}&nbsp;<LoadingDots />
              </p>
            </div>
          ) : calendarData[selectedDay - 1]?.hasCheckIn ? (
            <div className="space-y-4">
              {/* Health Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-[18px]">bedtime</span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      {locale === 'en' ? 'Sleep' : locale === 'zh' ? '睡眠' : 'Tidur'}
                    </span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    {calendarData[selectedDay - 1]?.healthData?.sleepHours}h
                  </span>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-error text-[18px]">healing</span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      {locale === 'en' ? 'Pain' : locale === 'zh' ? '疼痛' : 'Kesakitan'}
                    </span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    {calendarData[selectedDay - 1]?.healthData?.painLevel}/10
                  </span>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-secondary text-[18px]">psychology</span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      {locale === 'en' ? 'Stress' : locale === 'zh' ? '压力' : 'Tekanan'}
                    </span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    {calendarData[selectedDay - 1]?.healthData?.stressLevel}/10
                  </span>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">mood</span>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">
                      {locale === 'en' ? 'Mood' : locale === 'zh' ? '心情' : 'Mood'}
                    </span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface">
                    {translateValue(locale, calendarData[selectedDay - 1]?.healthData?.mood || '')}
                  </span>
                </div>
              </div>

              {/* Symptoms */}
              {calendarData[selectedDay - 1]?.healthData?.symptoms && 
               (calendarData[selectedDay - 1]?.healthData?.symptoms as string[]).length > 0 && (
                <div className="bg-error/5 p-4 rounded-lg border border-error/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                    <span className="font-label-sm text-label-sm text-error">
                      {locale === 'en' ? 'Symptoms' : locale === 'zh' ? '症状' : 'Gejala'} ({(calendarData[selectedDay - 1]?.healthData?.symptoms as string[]).length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(calendarData[selectedDay - 1]?.healthData?.symptoms as string[]).map((symptom: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1.5 rounded-full bg-error/10 text-error border border-error/30 font-label-sm text-[12px]"
                      >
                        {translateSymptomRoutine(symptom)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Routines */}
              {calendarData[selectedDay - 1]?.healthData?.routines && 
               (calendarData[selectedDay - 1]?.healthData?.routines as string[]).length > 0 && (
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    <span className="font-label-sm text-label-sm text-primary">
                      {locale === 'en' ? 'Routines' : locale === 'zh' ? '日常' : 'Rutin'} ({(calendarData[selectedDay - 1]?.healthData?.routines as string[]).length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(calendarData[selectedDay - 1]?.healthData?.routines as string[]).map((routine: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-label-sm text-[12px]"
                      >
                        {translateSymptomRoutine(routine)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {calendarData[selectedDay - 1]?.healthData?.notes && (
                <div className="bg-surface-container-low p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">edit_note</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {locale === 'en' ? 'Notes' : locale === 'zh' ? '笔记' : 'Nota'}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface">
                    {calendarData[selectedDay - 1]?.healthData?.notes as string}
                  </p>
                </div>
              )}

              {/* AI Summary */}
              {dayDetails && !dayDetails.error && (() => {
                // Parse the structured day summary response
                const clean = (s: string) => s
                  .replace(/\*\*/g, '')
                  .replace(/\*/g, '')
                  .replace(/^#+\s*/gm, '')
                  .replace(/^[-–—]\s*/gm, '')
                  .trim();

                // Match bold headers in all 3 languages
                const achievementsHeaders = ["Today's Achievements", '今日成就', 'Pencapaian Hari Ini'];
                const reflectionHeaders = ['Progress Reflection', '进度反思', 'Refleksi Kemajuan'];
                const tomorrowHeaders = ["Tomorrow's Focus", '明日重点', 'Fokus Esok'];

                const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                const extract = (headers: string[], nextHeaders?: string[]): string => {
                  const h = headers.map(escape).join('|');
                  const pattern = nextHeaders
                    ? new RegExp(`\\*\\*(${h})\\*\\*\\s*\\n(.*?)(?=\\n\\*\\*(${nextHeaders.map(escape).join('|')})\\*\\*|$)`, 's')
                    : new RegExp(`\\*\\*(${h})\\*\\*\\s*\\n(.*?)$`, 's');
                  const m = (dayDetails as string).match(pattern);
                  return m ? clean(m[2]) : '';
                };

                const achievements = extract(achievementsHeaders, reflectionHeaders);
                const reflection = extract(reflectionHeaders, tomorrowHeaders);
                const tomorrow = extract(tomorrowHeaders);

                // Icons and labels per locale
                const sections = [
                  { icon: 'emoji_events', color: 'text-primary', label: locale === 'en' ? "Today's Achievements" : locale === 'zh' ? '今日成就' : 'Pencapaian Hari Ini', text: achievements },
                  { icon: 'insights', color: 'text-secondary', label: locale === 'en' ? 'Progress Reflection' : locale === 'zh' ? '进度反思' : 'Refleksi Kemajuan', text: reflection },
                  { icon: 'arrow_forward', color: 'text-tertiary', label: locale === 'en' ? "Tomorrow's Focus" : locale === 'zh' ? '明日重点' : 'Fokus Esok', text: tomorrow },
                ].filter(s => s.text);

                // Fallback: if parsing found nothing, strip all ** and show plain text
                const fallback = sections.length === 0
                  ? (dayDetails as string)
                      .replace(/\*\*/g, '')
                      .replace(/\*/g, '')
                      .replace(/^#+\s*/gm, '')
                      .replace(/^[-–—]\s*/gm, '')
                      .replace(/\n+/g, ' ')
                      .trim()
                  : null;

                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        {locale === 'en' ? 'AI Insights' : locale === 'zh' ? 'AI见解' : 'Pandangan AI'}
                      </h4>
                    </div>
                    {fallback ? (
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{fallback}</p>
                    ) : (
                      sections.map((s, i) => (
                        <div key={i} className="bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg p-3 flex items-start gap-3">
                          <span className={`material-symbols-outlined ${s.color} text-xl shrink-0 mt-0.5`}>{s.icon}</span>
                          <div>
                            <div className={`font-label-sm text-[11px] ${s.color} mb-0.5`}>{s.label}</div>
                            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{s.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">
                event_busy
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {locale === 'en' 
                  ? 'No wellness check-in recorded for this day.'
                  : locale === 'zh'
                  ? '此天没有健康签到记录。'
                  : 'Tiada daftar masuk kesihatan untuk hari ini.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* No Data State — prompt user to do a check-in first */}
      {!loading && !plan && !error && JSON.parse(localStorage.getItem(`health_${deviceId}`) || '[]').length === 0 && (
        <div className="glass-card rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">
            assignment_late
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
            {locale === 'en' ? 'No check-in data yet' :
             locale === 'zh' ? '暂无健康记录' :
             'Tiada data daftar masuk lagi'}
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-sm mx-auto">
            {locale === 'en'
              ? 'Complete your first daily wellness check-in to get a personalised recovery plan based on your health data.'
              : locale === 'zh'
              ? '完成您的第一次每日健康签到，即可根据您的健康数据获得个性化恢复计划。'
              : 'Lengkapkan daftar masuk kesihatan harian pertama anda untuk mendapatkan pelan pemulihan yang diperibadikan berdasarkan data kesihatan anda.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {locale === 'en' ? 'Go to Daily Check-in from the home screen' :
             locale === 'zh' ? '从主屏幕前往每日签到' :
             'Pergi ke Daftar Masuk Harian dari skrin utama'}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glass-card rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-primary mb-4 block animate-pulse">
            calendar_month
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
            {locale === 'en' ? 'Generating your personalized plan...' : 
             locale === 'zh' ? '正在生成您的个性化计划...' : 
             'Menjana pelan peribadi anda...'}
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {locale === 'en' ? 'Creating a recovery plan tailored to your stage and delivery method' : 
             locale === 'zh' ? '根据您的阶段和分娩方式创建恢复计划' : 
             'Mencipta pelan pemulihan yang disesuaikan dengan tahap dan kaedah bersalin anda'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl border-l-4 border-error flex items-start gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <div className="flex-1">
            <p className="font-body-md text-body-md mb-3">{error}</p>
            <button
              onClick={generatePlan}
              className="btn-3d-secondary text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full"
            >
              {locale === 'en' ? 'Try Again' : locale === 'zh' ? '重试' : 'Cuba Lagi'}
            </button>
          </div>
        </div>
      )}

      {/* Recovery Plan Content - Structured View */}
      {plan && !loading && plan.days && (
        <div className="space-y-6">
          {/* Week Theme */}
          {plan.weekTheme && (
            <div className="glass-card rounded-xl p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-l-4 border-primary">
              <h2 className="font-headline-lg text-headline-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl">stars</span>
                {plan.weekTheme}
              </h2>
            </div>
          )}

          {/* Daily Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.days.map((day) => (
              <div key={day.day} className="glass-card rounded-xl p-5 hover:shadow-lg transition-shadow">
                {/* Day Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-${getDayColor(day.day)}/10 flex items-center justify-center`}>
                      <span className={`font-headline-md text-[18px] text-${getDayColor(day.day)} font-bold`}>
                        {day.day}
                      </span>
                    </div>
                    <div>
                      <p className={`font-headline-sm text-[16px] text-${getDayColor(day.day)} font-medium`}>
                        {day.focus}
                      </p>
                    </div>
                  </div>
                  {day.milestone && (
                    <span className="material-symbols-outlined text-tertiary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      emoji_events
                    </span>
                  )}
                </div>

                {/* Simplified Content - Just 1 key activity */}
                <div className="space-y-3">
                  {/* Main Activity */}
                  {day.activities && day.activities[0] && (
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">fitness_center</span>
                      <p className="font-body-md text-body-md text-on-surface flex-1">
                        {day.activities[0]}
                      </p>
                    </div>
                  )}

                  {/* Nutrition Tip */}
                  {day.nutrition && (
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-tertiary text-[18px] mt-0.5">restaurant</span>
                      <p className="font-body-md text-body-md text-on-surface flex-1">
                        {day.nutrition}
                      </p>
                    </div>
                  )}
                </div>

                {/* Milestone Badge */}
                {day.milestone && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/20">
                    <div className="flex items-center gap-2 text-tertiary">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        emoji_events
                      </span>
                      <span className="font-label-sm text-[12px]">
                        {day.milestone}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generatePlan}
              disabled={loading}
              className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {locale === 'en' ? 'Generating' : locale === 'zh' ? '生成中' : 'Menjana'}<LoadingDots />
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">refresh</span>
                  {locale === 'en' ? 'Regenerate Plan' : locale === 'zh' ? '重新生成计划' : 'Jana Semula Pelan'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Fallback Text View */}
      {plan && !loading && plan.text && (
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">description</span>
                {locale === 'en' ? 'Your Recovery Plan' : locale === 'zh' ? '您的恢复计划' : 'Pelan Pemulihan Anda'}
              </h2>
              <button
                onClick={generatePlan}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
                title="Regenerate plan"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>

            <div className="prose prose-slate max-w-none">
              <div className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                {plan.text}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={generatePlan}
              className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min"
            >
              <span className="material-symbols-outlined">refresh</span>
              {locale === 'en' ? 'Regenerate Plan' : locale === 'zh' ? '重新生成计划' : 'Jana Semula Pelan'}
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="mt-6 glass-card rounded-xl p-6 border-l-4 border-primary">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-primary text-3xl">info</span>
          <div>
            <h3 className="font-headline-md text-[18px] text-on-surface mb-2">
              {locale === 'en' ? 'Personalized Guidance' : locale === 'zh' ? '个性化指导' : 'Panduan Peribadi'}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {locale === 'en' 
                ? 'This recovery plan is tailored to your delivery method and current stage. Always consult with your healthcare provider before starting new activities or if you have concerns about your recovery.'
                : locale === 'zh'
                ? '此恢复计划根据您的分娩方式和当前阶段量身定制。在开始新活动之前或如果您对恢复有疑虑，请务必咨询您的医疗保健提供者。'
                : 'Pelan pemulihan ini disesuaikan dengan kaedah bersalin dan tahap semasa anda. Sentiasa berunding dengan penyedia penjagaan kesihatan anda sebelum memulakan aktiviti baru atau jika anda mempunyai kebimbangan tentang pemulihan anda.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
