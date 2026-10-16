import { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import { t, type Locale } from '../translations';

interface SetupProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Setup({ onComplete }: SetupProps) {
  const [step, setStep] = useState(1);
  const [motherName, setMotherName] = useState('');
  const [babyBirthDate, setBabyBirthDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'vaginal' | 'c-section' | 'assisted'>('vaginal');
  const [locale, setLocale] = useState<Locale>('en');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Auto-detect language from browser
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.includes('zh')) setLocale('zh');
    else if (browserLang.includes('ms') || browserLang.includes('my')) setLocale('ms');
  }, []);

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all spaces, dashes, and parentheses
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if it's empty
    if (!cleanPhone) {
      setPhoneError(t(locale, 'phoneRequired'));
      return false;
    }
    
    // Check if it contains only numbers and optional + at the start
    if (!/^\+?\d+$/.test(cleanPhone)) {
      setPhoneError(t(locale, 'phoneInvalidChars'));
      return false;
    }
    
    // Check minimum length (at least 8 digits)
    const digitsOnly = cleanPhone.replace(/\+/g, '');
    if (digitsOnly.length < 8) {
      setPhoneError(t(locale, 'phoneTooShort'));
      return false;
    }
    
    // Check maximum length (max 15 digits including country code)
    if (digitsOnly.length > 15) {
      setPhoneError(t(locale, 'phoneTooLong'));
      return false;
    }
    
    // Valid Malaysian formats:
    // +60123456789, +6012-345-6789, 012-345 6789, 0123456789
    // International format: +[country code][number]
    const malaysianPattern = /^(\+?60|0)[1-9]\d{7,9}$/;
    const internationalPattern = /^\+\d{8,14}$/;
    
    if (!malaysianPattern.test(cleanPhone) && !internationalPattern.test(cleanPhone)) {
      setPhoneError(t(locale, 'phoneInvalidFormat'));
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (value: string) => {
    setEmergencyPhone(value);
    // Clear error when user starts typing
    if (phoneError) {
      setPhoneError('');
    }
  };

  const handlePhoneBlur = () => {
    // Only validate if there's a value
    if (emergencyPhone.trim()) {
      validatePhoneNumber(emergencyPhone);
    }
  };

  const handleNext = () => {
    if (step === 1 && motherName && babyBirthDate) {
      setStep(2);
    } else if (step === 2) {
      // Validate phone number before proceeding
      if (emergencyContact && emergencyPhone) {
        if (!validatePhoneNumber(emergencyPhone)) {
          return; // Don't proceed if validation fails
        }
      }
      // Emergency contact is optional - can skip
      onComplete({ motherName, babyBirthDate, deliveryMethod, locale, emergencyContact, emergencyPhone });
    }
  };

  const handleSkipEmergency = () => {
    onComplete({ motherName, babyBirthDate, deliveryMethod, locale, emergencyContact: '', emergencyPhone: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-gradient-to-br from-surface-container-lowest via-surface to-surface-container">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="gradient-border-card rounded-3xl p-6 md:p-10 stagger-1">
          {/* Progress Bar */}
          <div className="w-full h-2 bg-surface-variant rounded-full mb-8 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="material-symbols-outlined text-5xl text-primary">favorite</span>
              <h1 className="font-display-lg text-display-lg text-primary">
                {t(locale, 'appName')}
              </h1>
            </div>
            <p className="font-title-lg text-title-lg text-on-surface-variant mb-2">
              {t(locale, 'setupWelcome')}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t(locale, 'setupSubtitle')}
            </p>
          </div>

          {/* Step Title */}
          <div className="mb-6">
            <h2 className="font-headline-md text-headline-md text-on-surface text-center">
              {step === 1 ? t(locale, 'setupStep1Title') : t(locale, 'setupStep2Title')}
            </h2>
          </div>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6 stagger-2">
              {/* Mother's Name */}
              <div>
                <label htmlFor="motherName" className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface mb-3">
                  <span className="material-symbols-outlined text-primary">person</span>
                  {t(locale, 'setupMotherName')}
                </label>
                <input
                  type="text"
                  id="motherName"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder={t(locale, 'setupMotherNamePlaceholder')}
                  className="w-full px-4 py-4 rounded-xl border-2 border-outline-variant bg-surface text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[touch-target-min]"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && motherName && babyBirthDate && handleNext()}
                />
              </div>

              {/* Baby's Birth Date */}
              <div>
                <label htmlFor="babyBirthDate" className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface mb-3">
                  <span className="material-symbols-outlined text-primary">child_care</span>
                  {t(locale, 'setupBabyBirthDate')}
                </label>
                <input
                  type="date"
                  id="babyBirthDate"
                  value={babyBirthDate}
                  onChange={(e) => setBabyBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-4 rounded-xl border-2 border-outline-variant bg-surface text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[touch-target-min]"
                />
              </div>

              {/* Delivery Method */}
              <div>
                <label className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface mb-3">
                  <span className="material-symbols-outlined text-primary">healing</span>
                  {t(locale, 'setupDeliveryMethod')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'vaginal', label: t(locale, 'vaginal'), icon: 'favorite' },
                    { value: 'c-section', label: t(locale, 'cSection'), icon: 'healing' },
                    { value: 'assisted', label: t(locale, 'assisted'), icon: 'medical_services' }
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setDeliveryMethod(method.value as any)}
                      className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 min-h-[touch-target-min] transition-all ${
                        deliveryMethod === method.value
                          ? 'border-primary bg-primary/10 shadow-[inset_0_0_0_1px_theme(colors.primary)]'
                          : 'border-outline-variant bg-surface hover:bg-surface-variant hover:border-primary/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-4xl mb-2 ${
                        deliveryMethod === method.value ? 'text-primary' : 'text-on-surface-variant'
                      }`}>
                        {method.icon}
                      </span>
                      <span className={`font-label-lg text-label-lg ${
                        deliveryMethod === method.value ? 'text-primary font-semibold' : 'text-on-surface'
                      }`}>
                        {method.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface mb-3">
                  <span className="material-symbols-outlined text-secondary">language</span>
                  {t(locale, 'setupLanguage')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'en', label: 'English', flag: '🇺🇸' },
                    { value: 'zh', label: '中文', flag: '🇨🇳' },
                    { value: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' }
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setLocale(lang.value as Locale)}
                      className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 min-h-[touch-target-min] transition-all ${
                        locale === lang.value
                          ? 'border-secondary bg-secondary/10 shadow-[inset_0_0_0_1px_theme(colors.secondary)]'
                          : 'border-outline-variant bg-surface hover:bg-surface-variant hover:border-secondary/50'
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className={`font-label-lg text-label-lg ${
                        locale === lang.value ? 'text-secondary font-semibold' : 'text-on-surface'
                      }`}>
                        {lang.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!motherName || !babyBirthDate}
                className="w-full py-4 px-6 rounded-xl font-label-lg text-label-lg text-white btn-3d disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[touch-target-min] mt-8"
              >
                {t(locale, 'setupContinue')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Step 2: Emergency Contact */}
          {step === 2 && (
            <div className="space-y-6 stagger-2">
              {/* Emergency Contact Name */}
              <div>
                <label htmlFor="emergencyContact" className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface mb-3">
                  <span className="material-symbols-outlined text-error">emergency</span>
                  {t(locale, 'setupEmergencyName')}
                </label>
                <input
                  type="text"
                  id="emergencyContact"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder={t(locale, 'setupEmergencyNamePlaceholder')}
                  className="w-full px-4 py-4 rounded-xl border-2 border-outline-variant bg-surface text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[touch-target-min]"
                  autoFocus
                />
              </div>

              {/* Emergency Contact Phone */}
              <div>
                <label htmlFor="emergencyPhone" className="flex items-center gap-2 font-label-lg text-label-lg text-on-surface mb-3">
                  <span className="material-symbols-outlined text-error">phone</span>
                  {t(locale, 'setupEmergencyPhone')}
                </label>
                <input
                  type="tel"
                  id="emergencyPhone"
                  value={emergencyPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder={t(locale, 'setupEmergencyPhonePlaceholder')}
                  className={`w-full px-4 py-4 rounded-xl border-2 bg-surface text-on-surface font-body-lg text-body-lg focus:outline-none focus:ring-2 transition-all min-h-[touch-target-min] ${
                    phoneError 
                      ? 'border-error focus:ring-error focus:border-error' 
                      : 'border-outline-variant focus:ring-primary focus:border-transparent'
                  }`}
                  onKeyPress={(e) => e.key === 'Enter' && emergencyContact && emergencyPhone && !phoneError && handleNext()}
                />
                {phoneError && (
                  <div className="flex items-center gap-2 mt-2 text-error">
                    <span className="material-symbols-outlined text-lg">error</span>
                    <p className="font-body-sm text-body-sm">{phoneError}</p>
                  </div>
                )}
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                  {t(locale, 'phoneFormatHint')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleSkipEmergency}
                  className="flex-1 py-4 px-6 rounded-xl font-label-lg text-label-lg text-on-surface btn-3d-secondary transition-all flex items-center justify-center gap-2 min-h-[touch-target-min]"
                >
                  {t(locale, 'setupSkipForNow')}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!emergencyContact || !emergencyPhone || !!phoneError}
                  className="flex-[2] py-4 px-6 rounded-xl font-label-lg text-label-lg text-white btn-3d disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[touch-target-min]"
                >
                  {t(locale, 'setupStartJourney')}
                  <span className="material-symbols-outlined">celebration</span>
                </button>
              </div>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-3 px-4 rounded-xl font-label-md text-label-md text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2 min-h-[touch-target-min]"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                {t(locale, 'setupBackButton')}
              </button>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="mt-8 pt-6 border-t border-outline-variant">
            <div className="flex items-center justify-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-xl">lock</span>
              <p className="font-body-sm text-body-sm text-center">
                {t(locale, 'setupPrivacyNotice')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
