export interface NotificationSettings {
  enabled: boolean;
  preferredChannel: 'email' | 'sms' | 'push' | 'whatsapp';
  wellnessReminder: boolean;
  wellnessReminderTime: string; // "09:00"
  medicationReminders: boolean;
  feedingReminders: boolean;
  emergencyAlerts: boolean;
  whatsappNumber?: string; // e.g. "+60123456789"
}

export interface UserProfile {
  motherName: string;
  babyBirthDate: string;
  deliveryMethod: 'vaginal' | 'c-section' | 'assisted';
  locale: 'en' | 'zh' | 'ms';
  emergencyContact: string;
  emergencyPhone: string;
  emergencyContactEmail?: string;
  email?: string;
  phoneNumber?: string;
  userId?: string;
  notificationSettings?: NotificationSettings;
}

export interface HealthCheckData {
  sleepHours: number;
  painLevel: number;
  bleedingLevel: 'light' | 'moderate' | 'heavy' | 'very-heavy-with-clots';
  energyLevel: 'good' | 'tired' | 'very-tired' | 'exhausted';
  breastPainSwelling: 'none' | 'mild' | 'moderate' | 'severe';
  mood: 'happy' | 'calm' | 'anxious' | 'sad' | 'overwhelmed' | 'depressed';
  stressLevel: number;
  babyFeedingStatus: 'feeding-well' | 'some-difficulty' | 'not-feeding';
  appetite: 'good' | 'reduced' | 'poor';
  breastfeedingConcerns?: string;
  timestamp: string;
  symptoms?: string[];
  routines?: string[];
  notes?: string;
}

export interface CareReport {
  recoverySummary: {
    status: 'recovering-well' | 'monitor-closely' | 'seek-immediate-care';
    message: string;
  };
  breastfeedingAdvice: string;
  nutritionGuide: string;
  weeklyRecoveryPlan: string;
  exerciseGuide: string;
  emergencyCheck: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface VitalsHistory {
  date: string;
  moodScore: number;
  painLevel: number;
  sleepHours: number;
  energyLevel: string;
}
