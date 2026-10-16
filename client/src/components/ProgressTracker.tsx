import { useState } from 'react';
import type { UserProfile } from '../types';
import { t, translateValue, type Locale } from '../translations';

interface ProgressTrackerProps {
  profile: UserProfile;
  recoveryStage: number;
  deviceId: string;
  locale: Locale;
}

interface LogEntry {
  id: string;
  type: 'feeding' | 'mood' | 'sleep' | 'symptom' | 'activity';
  title: string;
  time: string;
  date: string;
  summary: string;
  details?: {
    [key: string]: string;
  };
  notes?: string;
  symptoms?: string[];
  routines?: string[];
}

export default function ProgressTracker({ deviceId, locale }: ProgressTrackerProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'moods' | 'symptoms' | 'routines'>('all');
  
  // Load logs from localStorage
  const [logs] = useState<LogEntry[]>(() => {
    const healthHistory = JSON.parse(localStorage.getItem(`health_${deviceId}`) || '[]');
    
    // Convert health check data to log entries
    return healthHistory.map((entry: any, index: number) => {
      const details: { [key: string]: string } = {
        [t(locale, 'sleep')]: `${entry.sleepHours} ${locale === 'en' ? 'hours' : locale === 'zh' ? '小时' : 'jam'}`,
        [t(locale, 'physicalPain')]: `${entry.painLevel}/10`,
        [t(locale, 'stressLevel')]: `${entry.stressLevel}/10`,
        [t(locale, 'energy')]: translateValue(locale, entry.energyLevel),
        [t(locale, 'mood')]: translateValue(locale, entry.mood)
      };

      return {
        id: `log-${index}`,
        type: 'mood' as const,
        title: t(locale, 'wellnessCheck'),
        time: new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        summary: `${t(locale, 'sleep')}: ${entry.sleepHours}h • ${t(locale, 'physicalPain')}: ${entry.painLevel}/10 • ${t(locale, 'stressLevel')}: ${entry.stressLevel}/10`,
        details,
        notes: entry.notes || entry.breastfeedingConcerns || undefined,
        symptoms: entry.symptoms || [],
        routines: entry.routines || []
      };
    });
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'feeding': return 'restaurant';
      case 'mood': return 'mood';
      case 'sleep': return 'bedtime';
      case 'symptom': return 'healing';
      case 'activity': return 'directions_walk';
      default: return 'circle';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'feeding': return 'primary';
      case 'mood': return 'secondary';
      case 'sleep': return 'tertiary';
      case 'symptom': return 'error';
      case 'activity': return 'primary';
      default: return 'primary';
    }
  };

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

  // Unused for now - may be needed for future grouping feature
  // const _groupedLogs = logs.reduce((acc, log) => {
  //   if (!acc[log.date]) {
  //     acc[log.date] = [];
  //   }
  //   acc[log.date].push(log);
  //   return acc;
  // }, {} as Record<string, LogEntry[]>);

  // Filter logs based on active filter
  const filteredLogs = logs.filter(log => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'moods') return log.type === 'mood';
    if (activeFilter === 'symptoms') return log.symptoms && log.symptoms.length > 0;
    if (activeFilter === 'routines') return log.routines && log.routines.length > 0;
    return true;
  });

  const groupedFilteredLogs = filteredLogs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = [];
    }
    acc[log.date].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  const filters = [
    { value: 'all', label: t(locale, 'allLogs') },
    { value: 'moods', label: t(locale, 'moods') },
    { value: 'symptoms', label: t(locale, 'symptoms') },
    { value: 'routines', label: t(locale, 'routines') }
  ];

  return (
    <div className="max-w-5xl mx-auto pb-24 md:pb-0">
      {/* Header Section */}
      <div className="mb-section-margin stagger-1">
        <h1 className="font-display-lg text-display-lg text-primary mb-2">{t(locale, 'careLogs')}</h1>
        <p className="text-on-surface-variant font-body-lg text-body-lg">
          {t(locale, 'careLogsDesc')}
        </p>
      </div>

      {/* Filter Pill Bar */}
      <div className="flex overflow-x-auto gap-3 pb-4 mb-stack-gap no-scrollbar -mx-container-padding px-container-padding md:mx-0 md:px-0 stagger-2">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value as any)}
            className={`shrink-0 h-[44px] px-6 rounded-full font-label-sm text-label-sm transition-colors ${
              activeFilter === filter.value
                ? 'bg-secondary text-on-secondary shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] transform translate-y-[1px]'
                : 'bg-surface-variant text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-high'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      {filteredLogs.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center stagger-3">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
            assignment
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
            {logs.length === 0 ? t(locale, 'noLogsYet') : t(locale, 'noMatchingLogs')}
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {logs.length === 0 ? t(locale, 'noLogsDesc') : t(locale, 'noMatchingLogsDesc')}
          </p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8 border-l-2 border-primary-container/20 space-y-section-margin mt-8 stagger-3">
          {Object.entries(groupedFilteredLogs).map(([date, dateLogs], dateIndex) => (
            <div key={date}>
              {/* Timeline Date Divider */}
              <div className="relative -ml-[35px] md:-ml-[43px] flex items-center gap-4 mb-stack-gap">
                <div className="w-4 h-4 rounded-full bg-surface border-4 border-surface-variant z-10"></div>
                <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface px-2 rounded-md">
                  {dateIndex === 0 ? t(locale, 'today') : date}
                </span>
              </div>

              {/* Log Entries for this date */}
              {dateLogs.map((log) => (
                <div key={log.id} className="relative group mb-6">
                  {/* Timeline Node */}
                  <div className={`absolute -left-[31px] md:-left-[39px] top-6 w-3 h-3 rounded-full bg-${getColorForType(log.type)} shadow-[0_0_10px_rgba(79,55,138,0.4)] z-10`}></div>
                  
                  <details className="glass-panel glass-border rounded-xl shadow-sm hover:shadow-md transition-shadow group-open:bg-surface-container-lowest">
                    <summary className="flex items-center gap-4 p-4 md:p-6 cursor-pointer min-h-[touch-target-min] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
                      {/* Icon Circle */}
                      <div className={`w-12 h-12 rounded-full bg-${getColorForType(log.type)}/10 flex items-center justify-center shrink-0`}>
                        <span className={`material-symbols-outlined text-${getColorForType(log.type)}`}>
                          {getIconForType(log.type)}
                        </span>
                      </div>
                      
                      {/* Header Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <h3 className="font-headline-md text-[18px] text-on-surface">{log.title}</h3>
                          <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">{log.time}</span>
                        </div>
                        <p className="font-body-md text-body-md text-on-surface-variant break-words">
                          {log.summary}
                        </p>
                      </div>
                      
                      {/* Chevron Animation */}
                      <span className="material-symbols-outlined text-outline transition-transform duration-300 group-open:rotate-90 ml-2">
                        chevron_right
                      </span>
                    </summary>
                    
                    {/* Expanded Details */}
                    <div className="px-4 pb-6 md:px-6 md:pb-6 pt-0 border-t border-outline-variant/10 mt-2">
                      {log.details && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key} className="bg-surface-container-low p-4 rounded-lg">
                              <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                                {key}
                              </span>
                              <span className="font-body-lg text-body-lg text-on-surface capitalize">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Symptoms Section */}
                      {log.symptoms && log.symptoms.length > 0 && (
                        <div className="mt-4 bg-error/5 p-4 rounded-lg border border-error/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                            <span className="font-label-sm text-label-sm text-error">
                              {t(locale, 'symptoms')} ({log.symptoms.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {log.symptoms.map((symptom, i) => (
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

                      {/* Routines Section */}
                      {log.routines && log.routines.length > 0 && (
                        <div className="mt-4 bg-primary/5 p-4 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                            <span className="font-label-sm text-label-sm text-primary">
                              {t(locale, 'routines')} ({log.routines.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {log.routines.map((routine, i) => (
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
                      
                      {log.notes && (
                        <div className="mt-4 bg-surface-container-low p-4 rounded-lg">
                          <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                            {t(locale, 'notes')}
                          </span>
                          <p className="font-body-md text-body-md text-on-surface">
                            {log.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
