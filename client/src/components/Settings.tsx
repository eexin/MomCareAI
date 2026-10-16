import { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../types';
import { t, type Locale } from '../translations';
import { API_URL } from '../config';
import {
  sendWellnessReminder,
  scheduleDailyBrowserReminder,
  requestNotificationPermission,
} from '../notifications';

interface SettingsProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onBack: () => void;
  locale: Locale;
}

export default function Settings({ profile, onUpdateProfile, onBack: _onBack, locale }: SettingsProps) {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [showSuccess, setShowSuccess] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [notifStatus, setNotifStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailVerifyStatus, setEmailVerifyStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'verified' | 'error'>>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const deviceId = localStorage.getItem('deviceId') || 'unknown';
    const allData: Record<string, unknown> = { exportedAt: new Date().toISOString(), version: '1.0' };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      try { allData[key] = JSON.parse(localStorage.getItem(key)!); }
      catch { allData[key] = localStorage.getItem(key); }
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mumcare-backup-${deviceId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // Restore all keys except meta fields
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'exportedAt' || key === 'version') return;
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
        setImportStatus('success');
        setTimeout(() => { window.location.reload(); }, 1500);
      } catch {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Check verification status for saved emails on mount
  useEffect(() => {
    const checkVerified = async (email: string, key: string) => {
      if (!email) return;
      try {
        const res = await fetch(`${API_URL}/api/check-email-verified`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (data.verified) {
          setEmailVerifyStatus(prev => ({ ...prev, [key]: 'verified' }));
        }
      } catch (_) {}
    };
    if (profile.email) checkVerified(profile.email, 'email');
    if (profile.emergencyContactEmail) checkVerified(profile.emergencyContactEmail, 'emergencyContactEmail');
  }, []);

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all spaces, dashes, and parentheses
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Allow empty (optional field in settings)
    if (!cleanPhone) {
      setPhoneError('');
      return true;
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
    
    // Valid Malaysian formats or international format
    const malaysianPattern = /^(\+?60|0)[1-9]\d{7,9}$/;
    const internationalPattern = /^\+\d{8,14}$/;
    
    if (!malaysianPattern.test(cleanPhone) && !internationalPattern.test(cleanPhone)) {
      setPhoneError(t(locale, 'phoneInvalidFormat'));
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const triggerEmailVerification = async (email: string, key: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setEmailVerifyStatus(prev => ({ ...prev, [key]: 'sending' }));
    try {
      const res = await fetch(`${API_URL}/api/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.status === 'already_verified') {
        setEmailVerifyStatus(prev => ({ ...prev, [key]: 'verified' }));
      } else if (data.status === 'verification_sent') {
        setEmailVerifyStatus(prev => ({ ...prev, [key]: 'sent' }));
      } else {
        setEmailVerifyStatus(prev => ({ ...prev, [key]: 'error' }));
      }
    } catch (_) {
      setEmailVerifyStatus(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    let updatedProfile: UserProfile;
    
    // Handle notification settings separately (it's a JSON string)
    if (field === 'notificationSettings') {
      const parsedSettings = JSON.parse(value);
      updatedProfile = { ...formData, notificationSettings: parsedSettings };
    } else {
      updatedProfile = { ...formData, [field]: value };
    }
    
    setFormData(updatedProfile);
    
    // Validate name — must not be empty
    if (field === 'motherName') {
      if (!value.trim()) {
        setNameError(locale === 'en' ? 'Name cannot be empty' : locale === 'zh' ? '姓名不能为空' : 'Nama tidak boleh kosong');
        return; // Don't save
      } else {
        setNameError('');
      }
    }

    // Validate phone number if it's the emergencyPhone field
    if (field === 'emergencyPhone') {
      if (!validatePhoneNumber(value)) {
        return; // Don't save if validation fails
      }
    }
    
    // Auto-save after a short delay
    setTimeout(() => {
      onUpdateProfile(updatedProfile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // When notifications are enabled with an email, send a test/confirmation email
      // and schedule the daily browser reminder
      const ns = updatedProfile.notificationSettings;
      if (ns?.enabled && updatedProfile.email) {
        // Request browser notification permission
        requestNotificationPermission();

        // Schedule daily browser reminder if time is set
        if (ns.wellnessReminder && ns.wellnessReminderTime) {
          const reminderTitle =
            updatedProfile.locale === 'zh' ? '🌸 每日健康检查时间' :
            updatedProfile.locale === 'ms' ? '🌸 Masa untuk Pemeriksaan Kesihatan' :
            '🌸 Time for Your Daily Wellness Check';
          const reminderBody =
            updatedProfile.locale === 'zh' ? '花几分钟记录您今天的健康状况。' :
            updatedProfile.locale === 'ms' ? 'Luangkan beberapa minit untuk merekod kesihatan anda hari ini.' :
            'Take a few minutes to log your wellness today.';
          scheduleDailyBrowserReminder({
            timeHHMM: ns.wellnessReminderTime,
            title: reminderTitle,
            body: reminderBody,
          });
        }
      }
    }, 500);
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-8 stagger-1">
        <h2 className="font-display-lg text-display-lg text-on-surface mb-2">{t(locale, 'settingsTitle')}</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t(locale, 'settingsDesc')}
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 glass-card rounded-xl p-4 border-l-4 border-primary bg-primary/5 animate-[fadeIn_0.3s_ease-out] stagger-1">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
            <p className="font-body-md text-body-md text-on-surface">
              {t(locale, 'settingsSaved')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Personal Information Section */}
        <div className="glass-card rounded-xl p-6 stagger-2">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">person</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{t(locale, 'personalInfo')}</h3>
          </div>

          <div className="space-y-4">
            {/* Mother's Name */}
            <div>
              <label htmlFor="motherName" className="block font-label-sm text-label-sm text-on-surface mb-2">
                {t(locale, 'yourName')}
              </label>
              <input
                type="text"
                id="motherName"
                value={formData.motherName}
                onChange={(e) => handleChange('motherName', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                  nameError ? 'border-error focus:ring-error' : 'border-outline-variant focus:ring-primary'
                }`}
                required
              />
              {nameError && (
                <div className="flex items-center gap-2 mt-2 text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <p className="font-body-sm text-body-sm">{nameError}</p>
                </div>
              )}
            </div>

            {/* Baby's Birth Date */}
            <div>
              <label htmlFor="babyBirthDate" className="block font-label-sm text-label-sm text-on-surface mb-2">
                {t(locale, 'babyBirthDate')}
              </label>
              <input
                type="date"
                id="babyBirthDate"
                value={formData.babyBirthDate}
                onChange={(e) => handleChange('babyBirthDate', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Delivery Method */}
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-3">
                {t(locale, 'deliveryMethod')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'vaginal', label: t(locale, 'vaginal'), icon: 'favorite' },
                  { value: 'c-section', label: t(locale, 'cSection'), icon: 'healing' },
                  { value: 'assisted', label: t(locale, 'assisted'), icon: 'medical_services' }
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => handleChange('deliveryMethod', method.value)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border min-h-[88px] transition-all ${
                      formData.deliveryMethod === method.value
                        ? 'border-primary bg-primary/10 shadow-[inset_0_0_0_1px_theme(colors.primary)]'
                        : 'border-outline-variant bg-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-3xl mb-2 ${
                      formData.deliveryMethod === method.value ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      {method.icon}
                    </span>
                    <span className={`font-label-sm text-label-sm ${
                      formData.deliveryMethod === method.value ? 'text-primary' : 'text-on-surface'
                    }`}>
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Language & Region Section */}
        <div className="glass-card rounded-xl p-6 stagger-3">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary text-3xl">language</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{t(locale, 'languageRegion')}</h3>
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface mb-3">
              {t(locale, 'preferredLanguage')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'en', label: 'English', flag: '🇺🇸' },
                { value: 'zh', label: '中文', flag: '🇨🇳' },
                { value: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' }
              ].map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => handleChange('locale', lang.value)}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border min-h-[64px] transition-all ${
                    formData.locale === lang.value
                      ? 'border-secondary bg-secondary/10 shadow-[inset_0_0_0_1px_theme(colors.secondary)]'
                      : 'border-outline-variant bg-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className={`font-label-sm text-label-sm ${
                    formData.locale === lang.value ? 'text-secondary' : 'text-on-surface'
                  }`}>
                    {lang.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="glass-card rounded-xl p-6 stagger-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-error text-3xl">emergency</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{t(locale, 'emergencyContact')}</h3>
          </div>

          <div className="space-y-4">
            {/* Emergency Contact Name */}
            <div>
              <label htmlFor="emergencyContact" className="block font-label-sm text-label-sm text-on-surface mb-2">
                {t(locale, 'contactName')}
              </label>
              <input
                type="text"
                id="emergencyContact"
                value={formData.emergencyContact}
                onChange={(e) => handleChange('emergencyContact', e.target.value)}
                placeholder={t(locale, 'setupEmergencyNamePlaceholder')}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Emergency Phone */}
            <div>
              <label htmlFor="emergencyPhone" className="block font-label-sm text-label-sm text-on-surface mb-2">
                {t(locale, 'phoneNumber')}
              </label>
              <input
                type="tel"
                id="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                placeholder="+60 12-345 6789"
                className={`w-full px-4 py-3 rounded-xl border bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 transition-all ${
                  phoneError 
                    ? 'border-error focus:ring-error focus:border-error' 
                    : 'border-outline-variant focus:ring-primary focus:border-transparent'
                }`}
                required
              />
              {phoneError && (
                <div className="flex items-center gap-2 mt-2 text-error">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <p className="font-body-sm text-body-sm">{phoneError}</p>
                </div>
              )}
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                {t(locale, 'phoneFormatHint')}
              </p>
            </div>

            {/* Emergency Contact Email */}
            <div>
              <label htmlFor="emergencyContactEmail" className="block font-label-sm text-label-sm text-on-surface mb-2">
                {locale === 'en' ? 'Emergency Contact Email' : locale === 'zh' ? '紧急联系人邮箱' : 'E-mel Kenalan Kecemasan'}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  id="emergencyContactEmail"
                  value={formData.emergencyContactEmail || ''}
                  onChange={(e) => {
                    handleChange('emergencyContactEmail', e.target.value);
                    setEmailVerifyStatus(prev => ({ ...prev, emergencyContactEmail: 'idle' }));
                  }}
                  placeholder="contact@example.com"
                  className="flex-1 px-4 py-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                {formData.emergencyContactEmail && emailVerifyStatus['emergencyContactEmail'] !== 'verified' && (
                  <button
                    type="button"
                    disabled={emailVerifyStatus['emergencyContactEmail'] === 'sending' || emailVerifyStatus['emergencyContactEmail'] === 'sent'}
                    onClick={() => triggerEmailVerification(formData.emergencyContactEmail!, 'emergencyContactEmail')}
                    className="px-4 py-3 rounded-xl border-2 border-error text-error font-label-sm text-label-sm hover:bg-error/5 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {emailVerifyStatus['emergencyContactEmail'] === 'sending' ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : emailVerifyStatus['emergencyContactEmail'] === 'sent' ? (
                      locale === 'en' ? 'Check inbox' : locale === 'zh' ? '查收邮件' : 'Semak peti masuk'
                    ) : (
                      locale === 'en' ? 'Verify' : locale === 'zh' ? '验证' : 'Sahkan'
                    )}
                  </button>
                )}
                {emailVerifyStatus['emergencyContactEmail'] === 'verified' && (
                  <div className="flex items-center gap-1 px-3 text-primary">
                    <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>verified</span>
                    <span className="font-label-sm text-label-sm">{locale === 'en' ? 'Verified' : locale === 'zh' ? '已验证' : 'Disahkan'}</span>
                  </div>
                )}
              </div>
              {emailVerifyStatus['emergencyContactEmail'] === 'sent' && (
                <p className="font-body-sm text-body-sm text-primary mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                  {locale === 'en'
                    ? `Verification email sent to ${formData.emergencyContactEmail}. They need to click the link before they can receive alerts.`
                    : locale === 'zh'
                    ? `验证邮件已发送至 ${formData.emergencyContactEmail}。他们需要点击链接才能接收警报。`
                    : `E-mel pengesahan dihantar ke ${formData.emergencyContactEmail}. Mereka perlu klik pautan sebelum boleh menerima amaran.`}
                </p>
              )}
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                {locale === 'en'
                  ? 'They will be notified if your check-in shows urgent symptoms.'
                  : locale === 'zh'
                  ? '如果您的健康记录显示紧急症状，他们将收到通知。'
                  : 'Mereka akan dimaklumkan jika daftar masuk anda menunjukkan simptom mendesak.'}
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings Section */}
        <div className="glass-card rounded-xl p-6 stagger-5">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">notifications</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{t(locale, 'notificationSettings')}</h3>
          </div>

          <div className="space-y-4">
            {/* Enable Notifications */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-variant/50">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">notifications_active</span>
                <div>
                  <p className="font-label-md text-label-md text-on-surface">{t(locale, 'enableNotifications')}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    {t(locale, 'enableNotificationsDesc')}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notificationSettings?.enabled || false}
                  onChange={(e) => handleChange('notificationSettings', JSON.stringify({
                    ...formData.notificationSettings,
                    enabled: e.target.checked
                  }))}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 transition-colors relative ${formData.notificationSettings?.enabled ? 'bg-primary' : 'bg-surface-variant'}`}>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${formData.notificationSettings?.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </label>
            </div>

            {/* Email Address for Notifications */}
            {formData.notificationSettings?.enabled && (
              <>
                <div>
                  <label htmlFor="notificationEmail" className="block font-label-sm text-label-sm text-on-surface mb-2">
                    {t(locale, 'notificationEmail')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      id="notificationEmail"
                      value={formData.email || ''}
                      onChange={(e) => {
                        handleChange('email', e.target.value);
                        setEmailVerifyStatus(prev => ({ ...prev, email: 'idle' }));
                      }}
                      placeholder="your-email@example.com"
                      className="flex-1 px-4 py-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    {formData.email && emailVerifyStatus['email'] !== 'verified' && (
                      <button
                        type="button"
                        disabled={emailVerifyStatus['email'] === 'sending' || emailVerifyStatus['email'] === 'sent'}
                        onClick={() => triggerEmailVerification(formData.email!, 'email')}
                        className="px-4 py-3 rounded-xl border-2 border-primary text-primary font-label-sm text-label-sm hover:bg-primary/5 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {emailVerifyStatus['email'] === 'sending' ? (
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        ) : emailVerifyStatus['email'] === 'sent' ? (
                          locale === 'en' ? 'Check inbox' : locale === 'zh' ? '查收邮件' : 'Semak peti masuk'
                        ) : (
                          locale === 'en' ? 'Verify' : locale === 'zh' ? '验证' : 'Sahkan'
                        )}
                      </button>
                    )}
                    {emailVerifyStatus['email'] === 'verified' && (
                      <div className="flex items-center gap-1 px-3 text-primary">
                        <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>verified</span>
                        <span className="font-label-sm text-label-sm">{locale === 'en' ? 'Verified' : locale === 'zh' ? '已验证' : 'Disahkan'}</span>
                      </div>
                    )}
                  </div>
                  {emailVerifyStatus['email'] === 'sent' && (
                    <p className="font-body-sm text-body-sm text-primary mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">mail</span>
                      {locale === 'en' ? 'Verification email sent! Click the link in your inbox, then notifications will work.' :
                       locale === 'zh' ? '验证邮件已发送！点击收件箱中的链接，然后通知将正常工作。' :
                       'E-mel pengesahan dihantar! Klik pautan dalam peti masuk anda, kemudian pemberitahuan akan berfungsi.'}
                    </p>
                  )}
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                    {t(locale, 'notificationEmailDesc')}
                  </p>
                </div>

                {/* Test notification button */}
                <button
                  type="button"
                  disabled={!formData.email || notifStatus === 'sending'}
                  onClick={async () => {
                    if (!formData.email) return;
                    setNotifStatus('sending');
                    const ok = await sendWellnessReminder({
                      userId: formData.motherName || 'user',
                      email: formData.email,
                      motherName: formData.motherName || 'there',
                      dayNumber: Math.ceil((Date.now() - new Date(formData.babyBirthDate).getTime()) / 86400000),
                      locale: formData.locale || 'en',
                    });
                    setNotifStatus(ok ? 'sent' : 'error');
                    setTimeout(() => setNotifStatus('idle'), 4000);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-primary text-primary font-label-sm text-label-sm hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {notifStatus === 'sending' ? (
                    <><span className="material-symbols-outlined animate-spin">progress_activity</span>
                    {locale === 'en' ? 'Sending' : locale === 'zh' ? '发送中' : 'Menghantar'}</>
                  ) : notifStatus === 'sent' ? (
                    <><span className="material-symbols-outlined text-primary">check_circle</span>
                    {locale === 'en' ? 'Test email sent! Check your inbox.' : locale === 'zh' ? '测试邮件已发送！请查收。' : 'E-mel ujian dihantar! Semak peti masuk anda.'}</>
                  ) : notifStatus === 'error' ? (
                    <><span className="material-symbols-outlined text-error">error</span>
                    {locale === 'en' ? 'Failed to send. Check your email address.' : locale === 'zh' ? '发送失败，请检查邮箱地址。' : 'Gagal hantar. Semak alamat e-mel anda.'}</>
                  ) : (
                    <><span className="material-symbols-outlined">send</span>
                    {locale === 'en' ? 'Send Test Email' : locale === 'zh' ? '发送测试邮件' : 'Hantar E-mel Ujian'}</>
                  )}
                </button>

                {/* Wellness Reminder */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-variant/50">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-2xl">schedule</span>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">{t(locale, 'wellnessReminder')}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        {t(locale, 'wellnessReminderDesc')}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationSettings?.wellnessReminder || false}
                      onChange={(e) => handleChange('notificationSettings', JSON.stringify({
                        ...formData.notificationSettings,
                        wellnessReminder: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-secondary/50 transition-colors relative ${formData.notificationSettings?.wellnessReminder ? 'bg-secondary' : 'bg-surface-variant'}`}>
                      <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${formData.notificationSettings?.wellnessReminder ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>

                {/* Wellness Reminder Time */}
                {formData.notificationSettings?.wellnessReminder && (
                  <div>
                    <label htmlFor="wellnessReminderTime" className="block font-label-sm text-label-sm text-on-surface mb-2">
                      {t(locale, 'reminderTime')}
                    </label>
                    <input
                      type="time"
                      id="wellnessReminderTime"
                      value={formData.notificationSettings?.wellnessReminderTime || '09:00'}
                      onChange={(e) => handleChange('notificationSettings', JSON.stringify({
                        ...formData.notificationSettings,
                        wellnessReminderTime: e.target.value
                      }))}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                )}

                {/* Emergency Alerts */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-variant/50">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-error text-2xl">emergency</span>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">{t(locale, 'emergencyAlerts')}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        {t(locale, 'emergencyAlertsDesc')}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationSettings?.emergencyAlerts !== false}
                      onChange={(e) => handleChange('notificationSettings', JSON.stringify({
                        ...formData.notificationSettings,
                        emergencyAlerts: e.target.checked
                      }))}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-error/50 transition-colors relative ${formData.notificationSettings?.emergencyAlerts !== false ? 'bg-error' : 'bg-surface-variant'}`}>
                      <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${formData.notificationSettings?.emergencyAlerts !== false ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Export & Import Section */}
        <div className="glass-card rounded-xl p-6 stagger-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-secondary text-3xl">sync_alt</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {locale === 'en' ? 'Export & Import Data' : locale === 'zh' ? '导出与导入数据' : 'Eksport & Import Data'}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-variant/50">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">info</span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {locale === 'en'
                  ? 'Export your health logs, profile, and settings as a backup file. Import to restore on a new device.'
                  : locale === 'zh'
                  ? '将您的健康记录、个人资料和设置导出为备份文件。导入以在新设备上恢复。'
                  : 'Eksport log kesihatan, profil, dan tetapan anda sebagai fail sandaran. Import untuk memulihkan pada peranti baharu.'}
              </p>
            </div>

            {/* Export */}
            <button
              type="button"
              onClick={handleExport}
              className="w-full py-3 px-4 rounded-xl border-2 border-secondary text-secondary font-label-sm text-label-sm hover:bg-secondary/5 transition-colors flex items-center justify-center gap-2 min-h-[touch-target-min]"
            >
              <span className="material-symbols-outlined">download</span>
              {locale === 'en' ? 'Export Data' : locale === 'zh' ? '导出数据' : 'Eksport Data'}
            </button>

            {/* Import */}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl border-2 border-outline-variant text-on-surface font-label-sm text-label-sm hover:bg-surface-variant transition-colors flex items-center justify-center gap-2 min-h-[touch-target-min]"
            >
              <span className="material-symbols-outlined">upload</span>
              {locale === 'en' ? 'Import Data' : locale === 'zh' ? '导入数据' : 'Import Data'}
            </button>

            {/* Import feedback */}
            {importStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="font-body-md text-body-md">
                  {locale === 'en' ? 'Data imported! Reloading...' : locale === 'zh' ? '数据已导入！正在重新加载...' : 'Data diimport! Memuatkan semula...'}
                </span>
              </div>
            )}
            {importStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-error/10 text-error">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span className="font-body-md text-body-md">
                  {locale === 'en' ? 'Invalid file. Please use a MumCare export file.' : locale === 'zh' ? '文件无效，请使用MumCare导出文件。' : 'Fail tidak sah. Sila gunakan fail eksport MumCare.'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Data & Privacy Section */}
        <div className="glass-card rounded-xl p-6 stagger-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-tertiary text-3xl">shield</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{t(locale, 'dataPrivacy')}</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-variant/50">
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">info</span>
              <div>
                <p className="font-body-md text-body-md text-on-surface mb-2">
                  {t(locale, 'dataPrivacyDesc')}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {t(locale, 'dataPrivacyDesc2')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm(t(locale, 'clearDataConfirm'))) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full py-3 px-4 rounded-xl border border-error text-error font-label-sm text-label-sm hover:bg-error/10 transition-colors flex items-center justify-center gap-2 min-h-[touch-target-min]"
            >
              <span className="material-symbols-outlined">delete</span>
              {t(locale, 'clearAllData')}
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="mt-8 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">
          MumCare AI v1.0.0
        </p>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          {t(locale, 'madeWithLove')}
        </p>
      </div>
    </div>
  );
}
