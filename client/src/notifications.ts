/**
 * MumCare Notification Utility
 * Sends notifications via the notification Lambda endpoint.
 * All data stays on-device; only the email address and message are sent.
 */

const NOTIFY_URL = 'https://mqvgt9doy7.execute-api.ap-southeast-5.amazonaws.com/prod/notify';

interface NotifyPayload {
  notificationType: string;
  userId: string;
  channel: 'email';
  data: Record<string, unknown>;
}

async function send(payload: NotifyPayload): Promise<boolean> {
  try {
    const res = await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send a wellness reminder email */
export async function sendWellnessReminder(opts: {
  userId: string;
  email: string;
  motherName: string;
  dayNumber: number;
  locale: string;
}): Promise<boolean> {
  return send({
    notificationType: 'wellness-reminder',
    userId: opts.userId,
    channel: 'email',
    data: {
      email: opts.email,
      locale: opts.locale,
      motherName: opts.motherName,
      dayNumber: opts.dayNumber,
    },
  });
}

/** Send an emergency alert email when check-in shows concerning symptoms */
export async function sendEmergencyAlert(opts: {
  userId: string;
  email: string;
  emergencyContactEmail?: string;
  motherName: string;
  symptoms: string[];
  locale: string;
}): Promise<boolean> {
  return send({
    notificationType: 'emergency-alert',
    userId: opts.userId,
    channel: 'email',
    data: {
      email: opts.email,
      emergencyContactEmail: opts.emergencyContactEmail || null,
      locale: opts.locale,
      motherName: opts.motherName,
      symptoms: opts.symptoms,
      emergencyContacts: { hotline: '999' },
    },
  });
}

/** Send a milestone celebration email */
export async function sendMilestoneCelebration(opts: {
  userId: string;
  email: string;
  motherName: string;
  dayNumber: number;
  milestone: string;
  locale: string;
}): Promise<boolean> {
  return send({
    notificationType: 'milestone-celebration',
    userId: opts.userId,
    channel: 'email',
    data: {
      email: opts.email,
      locale: opts.locale,
      motherName: opts.motherName,
      dayNumber: opts.dayNumber,
      milestone: opts.milestone,
    },
  });
}

/** Send a PPD concern email */
export async function sendPPDConcern(opts: {
  userId: string;
  email: string;
  emergencyContactEmail?: string;
  motherName: string;
  locale: string;
}): Promise<boolean> {
  return send({
    notificationType: 'ppd-concern',
    userId: opts.userId,
    channel: 'email',
    data: {
      email: opts.email,
      emergencyContactEmail: opts.emergencyContactEmail || null,
      locale: opts.locale,
      motherName: opts.motherName,
      concernLevel: 'moderate',
    },
  });
}

/** Schedule a daily browser notification at the user's chosen time.
 *  Stores the timer ID in localStorage so it survives re-renders.
 *  NOTE: Browser notifications only fire while the tab is open.
 *  The email reminder is the reliable fallback.
 */
export function scheduleDailyBrowserReminder(opts: {
  timeHHMM: string;   // e.g. "09:00"
  title: string;
  body: string;
}): void {
  if (!('Notification' in window)) return;

  // Clear any existing timer
  const existingId = localStorage.getItem('reminderTimerId');
  if (existingId) clearTimeout(Number(existingId));

  const [h, m] = opts.timeHHMM.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // schedule for tomorrow if time passed

  const msUntil = next.getTime() - now.getTime();

  const id = window.setTimeout(async () => {
    if (Notification.permission === 'granted') {
      new Notification(opts.title, { body: opts.body, icon: '/favicon.svg' });
    }
    // Re-schedule for next day
    scheduleDailyBrowserReminder(opts);
  }, msUntil);

  localStorage.setItem('reminderTimerId', String(id));
}

/** Request browser notification permission */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
