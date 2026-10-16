// API Configuration
// Automatically uses environment variable or falls back to localhost

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('API URL:', API_URL);
