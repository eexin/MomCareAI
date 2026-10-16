import { useState } from 'react';
import type { UserProfile } from '../types';
import { t, translateDeliveryMethod } from '../translations';
import EmergencyResources from './EmergencyResources';
import WellnessCheck from './WellnessCheck';
import BreastfeedingChat from './BreastfeedingChat';
import MealAnalyzer from './MealAnalyzer';
import RecoveryPlan from './RecoveryPlan';
import ProgressTracker from './ProgressTracker';
import CommunitySpace from './CommunitySpace';
import Settings from './Settings';

interface DashboardProps {
  profile: UserProfile;
  deviceId: string;
  onUpdateProfile: (profile: UserProfile) => void;
}

type View = 'home' | 'emergency' | 'wellness' | 'breastfeeding' | 'meal' | 'plan' | 'progress' | 'community' | 'settings';

export default function Dashboard({ profile, deviceId, onUpdateProfile }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('home');

  const getRecoveryStage = () => {
    const birthDate = new Date(profile.babyBirthDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const recoveryStage = getRecoveryStage();
  const weekNumber = Math.ceil(recoveryStage / 7);

  const renderView = () => {
    switch (currentView) {
      case 'emergency':
        return <EmergencyResources locale={profile.locale} emergencyContact={profile.emergencyContact} emergencyPhone={profile.emergencyPhone} />;
      case 'wellness':
        return <WellnessCheck profile={profile} recoveryStage={recoveryStage} deviceId={deviceId} locale={profile.locale} onNavigate={(view) => setCurrentView(view as View)} />;
      case 'breastfeeding':
        return <BreastfeedingChat profile={profile} recoveryStage={recoveryStage} deviceId={deviceId} locale={profile.locale} />;
      case 'meal':
        return <MealAnalyzer profile={profile} recoveryStage={recoveryStage} deviceId={deviceId} locale={profile.locale} />;
      case 'plan':
        return <RecoveryPlan profile={profile} recoveryStage={recoveryStage} deviceId={deviceId} locale={profile.locale} />;
      case 'progress':
        return <ProgressTracker profile={profile} recoveryStage={recoveryStage} deviceId={deviceId} locale={profile.locale} />;
      case 'community':
        return <CommunitySpace profile={profile} deviceId={deviceId} locale={profile.locale} />;
      case 'settings':
        return <Settings profile={profile} onUpdateProfile={onUpdateProfile} onBack={() => setCurrentView('home')} locale={profile.locale} />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-stack-gap">
            {/* Left/Main Column */}
            <div className="md:col-span-8 flex flex-col gap-stack-gap">
              {/* Wellness Insight (Featured Card) */}
              <div className="gradient-border-card p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center stagger-2">
                <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    psychology
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-headline-md text-headline-md text-primary mb-2">
                    {t(profile.locale, 'welcomeBack')}, {profile.motherName}!
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                    {t(profile.locale, 'recoveryJourney', { week: String(weekNumber), day: String(recoveryStage) })}
                  </p>
                  <button 
                    onClick={() => setCurrentView('wellness')}
                    className="font-label-sm text-label-sm text-secondary flex items-center gap-1 hover:underline min-h-[touch-target-min]"
                  >
                    {t(profile.locale, 'startWellnessCheck')}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Feature Cards Grid */}
              <h3 className="font-headline-md text-headline-md text-on-surface mt-4 stagger-3">{t(profile.locale, 'quickAccess')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-3">
                <button 
                  onClick={() => setCurrentView('breastfeeding')}
                  className="glass-card rounded-xl p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary text-3xl">smart_toy</span>
                    <h4 className="font-headline-md text-[18px] text-on-surface">{t(profile.locale, 'breastfeedingSupport')}</h4>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t(profile.locale, 'breastfeedingSupportDesc')}
                  </p>
                </button>

                <button 
                  onClick={() => setCurrentView('meal')}
                  className="glass-card rounded-xl p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-tertiary text-3xl">restaurant</span>
                    <h4 className="font-headline-md text-[18px] text-on-surface">{t(profile.locale, 'mealAnalyzer')}</h4>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t(profile.locale, 'mealAnalyzerDesc')}
                  </p>
                </button>

                <button 
                  onClick={() => setCurrentView('plan')}
                  className="glass-card rounded-xl p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-secondary text-3xl">calendar_month</span>
                    <h4 className="font-headline-md text-[18px] text-on-surface">{t(profile.locale, 'recoveryPlan')}</h4>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t(profile.locale, 'recoveryPlanDesc')}
                  </p>
                </button>

                <button 
                  onClick={() => setCurrentView('progress')}
                  className="glass-card rounded-xl p-6 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-primary text-3xl">trending_up</span>
                    <h4 className="font-headline-md text-[18px] text-on-surface">{t(profile.locale, 'progressTracker')}</h4>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {t(profile.locale, 'progressTrackerDesc')}
                  </p>
                </button>
              </div>
            </div>

            {/* Right Column: Quick Actions */}
            <div className="md:col-span-4 flex flex-col gap-stack-gap">
              <div className="glass-card rounded-xl p-6 stagger-4">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4">{t(profile.locale, 'quickActions')}</h3>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setCurrentView('wellness')}
                    className="btn-3d w-full py-4 px-4 rounded-xl text-on-primary font-label-sm text-label-sm flex items-center justify-center gap-2 min-h-[touch-target-min]"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                    {t(profile.locale, 'dailyCheckIn')}
                  </button>
                  <button 
                    onClick={() => setCurrentView('emergency')}
                    className="btn-3d-secondary w-full py-4 px-4 rounded-xl text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-2 min-h-[touch-target-min]"
                  >
                    <span className="material-symbols-outlined text-error">emergency</span>
                    {t(profile.locale, 'emergencyResources')}
                  </button>
                  <button 
                    onClick={() => setCurrentView('community')}
                    className="btn-3d-secondary w-full py-4 px-4 rounded-xl text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-2 min-h-[touch-target-min]"
                  >
                    <span className="material-symbols-outlined text-secondary">groups</span>
                    {t(profile.locale, 'communitySpace')}
                  </button>
                </div>
              </div>

              {/* Recovery Stage Info */}
              <div className="glass-card rounded-xl p-6 stagger-4">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4">{t(profile.locale, 'yourJourney')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{t(profile.locale, 'week')}</span>
                    <span className="font-headline-md text-headline-md text-primary">{weekNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{t(profile.locale, 'day')}</span>
                    <span className="font-headline-md text-headline-md text-primary">{recoveryStage}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{t(profile.locale, 'delivery')}</span>
                    <span className="font-body-md text-body-md text-on-surface">
                      {translateDeliveryMethod(profile.locale, profile.deliveryMethod)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* TopAppBar / Side Navigation */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-white/20 shadow-sm flex justify-between items-center px-container-padding h-16 md:w-64 md:flex-col md:h-screen md:items-start md:border-b-0 md:border-r md:px-6 md:py-8 md:justify-start">
        <div className="flex items-center gap-3 md:mb-12">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">{t(profile.locale, 'appName')}</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-col w-full gap-2">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'home'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined" style={currentView === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>
              home
            </span>
            <span>{t(profile.locale, 'home')}</span>
          </button>
          
          {/* Quick Access Section */}
          <div className="mt-4 mb-1">
            <p className="px-4 py-1 font-label-sm text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-medium">
              {t(profile.locale, 'quickAccess')}
            </p>
          </div>
          
          <button
            onClick={() => setCurrentView('breastfeeding')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'breastfeeding'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined">smart_toy</span>
            <span>{t(profile.locale, 'breastfeedingSupport')}</span>
          </button>
          
          <button
            onClick={() => setCurrentView('meal')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'meal'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined">restaurant</span>
            <span>{t(profile.locale, 'mealAnalyzer')}</span>
          </button>
          
          <button
            onClick={() => setCurrentView('plan')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'plan'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>{t(profile.locale, 'recoveryPlan')}</span>
          </button>
          
          <button
            onClick={() => setCurrentView('progress')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'progress'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined">trending_up</span>
            <span>{t(profile.locale, 'progressTracker')}</span>
          </button>
          
          {/* Quick Actions Section */}
          <div className="mt-4 mb-1">
            <p className="px-4 py-1 font-label-sm text-[10px] text-on-surface-variant/60 uppercase tracking-widest font-medium">
              {t(profile.locale, 'quickActions')}
            </p>
          </div>
          
          <button
            onClick={() => setCurrentView('wellness')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'wellness'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>{t(profile.locale, 'dailyCheckIn')}</span>
          </button>
          
          <button
            onClick={() => setCurrentView('emergency')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'emergency'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined text-error">emergency</span>
            <span>{t(profile.locale, 'emergencyResources')}</span>
          </button>
          
          <button
            onClick={() => setCurrentView('community')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'community'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined">groups</span>
            <span>{t(profile.locale, 'communitySpace')}</span>
          </button>
          
          {/* Divider */}
          <div className="my-2 border-t border-outline-variant/30"></div>
          
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-label-sm text-label-sm text-left ${
              currentView === 'settings'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant transition-colors'
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>{t(profile.locale, 'settings')}</span>
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 mt-16 md:mt-0 md:ml-64 p-container-padding md:p-8 max-w-7xl mx-auto w-full pb-32 md:pb-8">
        {currentView !== 'home' && (
          <button
            onClick={() => setCurrentView('home')}
            className="mb-6 flex items-center gap-2 text-primary hover:opacity-80 transition-opacity font-label-sm text-label-sm"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            {t(profile.locale, 'backToHome')}
          </button>
        )}
        
        {currentView === 'home' && (
          <div className="mb-section-margin pt-4 stagger-1">
            <h2 className="font-display-lg text-display-lg text-on-surface mb-2">
              {t(profile.locale, new Date().getHours() < 12 ? 'goodMorning' : new Date().getHours() < 18 ? 'goodAfternoon' : 'goodEvening')}, {profile.motherName}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t(profile.locale, 'wellnessSnapshot')}
            </p>
          </div>
        )}
        
        {renderView()}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] rounded-full z-50 bg-surface/70 backdrop-blur-[20px] border border-white/30 shadow-[0_8px_32px_0_rgba(236,72,153,0.15)] flex justify-around items-center h-[72px] px-2">
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center justify-center rounded-full w-[60px] h-[60px] transition-all ${
            currentView === 'home'
              ? 'bg-primary text-on-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]" style={currentView === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>
            home
          </span>
          <span className="font-label-sm text-[10px] mt-1">{t(profile.locale, 'home')}</span>
        </button>
        <button
          onClick={() => setCurrentView('wellness')}
          className={`flex flex-col items-center justify-center rounded-full w-[60px] h-[60px] transition-all ${
            currentView === 'wellness'
              ? 'bg-primary text-on-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">add_circle</span>
          <span className="font-label-sm text-[10px] mt-1">{t(profile.locale, 'checkIn')}</span>
        </button>
        <button
          onClick={() => setCurrentView('emergency')}
          className={`flex flex-col items-center justify-center rounded-full w-[60px] h-[60px] transition-all ${
            currentView === 'emergency'
              ? 'bg-primary text-on-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]'
              : 'text-on-surface-variant'
          }`}
        >
          <span className={`material-symbols-outlined text-[24px] ${currentView === 'emergency' ? '' : 'text-error'}`}>emergency</span>
          <span className="font-label-sm text-[10px] mt-1">{t(profile.locale, 'emergency')}</span>
        </button>
        <button
          onClick={() => setCurrentView('plan')}
          className={`flex flex-col items-center justify-center rounded-full w-[60px] h-[60px] transition-all ${
            currentView === 'plan'
              ? 'bg-primary text-on-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">calendar_month</span>
          <span className="font-label-sm text-[10px] mt-1">{t(profile.locale, 'calendar')}</span>
        </button>
        <button
          onClick={() => setCurrentView('settings')}
          className={`flex flex-col items-center justify-center rounded-full w-[60px] h-[60px] transition-all ${
            currentView === 'settings'
              ? 'bg-primary text-on-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
          <span className="font-label-sm text-[10px] mt-1">{t(profile.locale, 'settings')}</span>
        </button>
      </nav>
    </div>
  );
}
