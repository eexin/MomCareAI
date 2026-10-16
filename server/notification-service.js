/**
 * Notification Service Integration
 * Add this to your Express server to integrate with Lambda notification system
 */

import fetch from 'node-fetch';

const NOTIFICATION_API_ENDPOINT = process.env.NOTIFICATION_API_ENDPOINT;

/**
 * Send notification via Lambda
 */
export async function sendNotification(notificationType, userId, channel, data) {
  if (!NOTIFICATION_API_ENDPOINT) {
    console.warn('NOTIFICATION_API_ENDPOINT not configured, skipping notification');
    return null;
  }
  
  try {
    const response = await fetch(NOTIFICATION_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType,
        userId,
        channel,
        data
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Notification failed:', error);
      return null;
    }
    
    const result = await response.json();
    console.log('Notification sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Notification error:', error);
    return null;
  }
}

/**
 * Check for emergency symptoms and send alert
 */
export function checkEmergencySymptoms(symptoms, profile) {
  const emergencySymptoms = [
    'Heavy bleeding',
    'Severe headache',
    'Chest pain',
    'Difficulty breathing',
    'Severe abdominal pain',
    'High fever',
    'Seizures',
    'Loss of consciousness',
    'Severe swelling',
    'Vision changes'
  ];
  
  const detectedEmergencies = symptoms.filter(symptom =>
    emergencySymptoms.some(emergency =>
      symptom.toLowerCase().includes(emergency.toLowerCase())
    )
  );
  
  if (detectedEmergencies.length > 0) {
    sendNotification('emergency-alert', profile.userId, 'email', {
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      locale: profile.locale || 'en',
      symptoms: detectedEmergencies,
      emergencyContacts: profile.emergencyContacts || { hotline: '911' }
    });
    
    return true;
  }
  
  return false;
}

/**
 * Check for PPD indicators and send concern notification
 */
export function checkPPDIndicators(healthData, profile) {
  // PPD indicators based on Edinburgh Postnatal Depression Scale
  const ppdIndicators = {
    mood: ['sad', 'depressed', 'hopeless', 'anxious', 'overwhelmed'],
    sleep: healthData.sleepHours < 4,
    stress: healthData.stressLevel >= 8,
    symptoms: ['crying', 'panic', 'anxiety', 'worthless', 'guilt']
  };
  
  let concernScore = 0;
  
  // Check mood
  if (ppdIndicators.mood.some(m => healthData.mood?.toLowerCase().includes(m))) {
    concernScore += 2;
  }
  
  // Check sleep
  if (ppdIndicators.sleep) {
    concernScore += 1;
  }
  
  // Check stress
  if (ppdIndicators.stress) {
    concernScore += 2;
  }
  
  // Check symptoms
  const ppdSymptoms = healthData.symptoms?.filter(s =>
    ppdIndicators.symptoms.some(ps => s.toLowerCase().includes(ps))
  ) || [];
  
  if (ppdSymptoms.length > 0) {
    concernScore += ppdSymptoms.length;
  }
  
  // Send notification if concern score is high
  if (concernScore >= 4) {
    sendNotification('ppd-concern', profile.userId, 'email', {
      email: profile.email,
      locale: profile.locale || 'en',
      motherName: profile.motherName,
      concernLevel: concernScore >= 6 ? 'high' : 'moderate'
    });
    
    return true;
  }
  
  return false;
}

/**
 * Send milestone celebration
 */
export function checkMilestone(dayNumber, profile) {
  const milestones = {
    1: 'First day of recovery - you did it!',
    3: '3 days postpartum - you\'re doing great!',
    7: 'One week of recovery completed!',
    14: 'Two weeks postpartum - amazing progress!',
    21: 'Three weeks - you\'re getting stronger!',
    28: 'One month postpartum - celebrate this milestone!',
    42: 'Six weeks - traditional recovery period complete!'
  };
  
  if (milestones[dayNumber]) {
    sendNotification('milestone-celebration', profile.userId, 'email', {
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      locale: profile.locale || 'en',
      motherName: profile.motherName,
      dayNumber,
      milestone: milestones[dayNumber]
    });
    
    return true;
  }
  
  return false;
}

/**
 * Example integration in your wellness check endpoint
 */
export function integrateNotifications(app) {
  // Modify your existing wellness check endpoint
  const originalWellnessCheck = app._router.stack.find(
    r => r.route?.path === '/api/complete-care-report'
  );
  
  app.post('/api/complete-care-report', async (req, res, next) => {
    const { healthData, profile, recoveryStage } = req.body;
    
    // Check for emergency symptoms
    if (healthData.symptoms && healthData.symptoms.length > 0) {
      checkEmergencySymptoms(healthData.symptoms, profile);
    }
    
    // Check for PPD indicators
    checkPPDIndicators(healthData, profile);
    
    // Check for milestones
    checkMilestone(recoveryStage, profile);
    
    // Continue with original handler
    next();
  });
}
