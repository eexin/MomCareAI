import { useState, useEffect } from 'react';
import './App.css';
import Setup from './components/Setup';
import Dashboard from './components/Dashboard';
import type { UserProfile } from './types';

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    // Get or create device ID
    let id = localStorage.getItem('deviceId');
    if (!id) {
      // Fallback for browsers without crypto.randomUUID
      id = crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', id);
    }
    setDeviceId(id);

    // Load profile
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleSetupComplete = (newProfile: UserProfile) => {
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
    setProfile(newProfile);
  };

  if (!profile) {
    return <Setup onComplete={handleSetupComplete} />;
  }

  return <Dashboard profile={profile} deviceId={deviceId} onUpdateProfile={handleSetupComplete} />;
}

export default App;
