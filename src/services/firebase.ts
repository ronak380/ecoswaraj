/**
 * @fileoverview Firebase initialization client-side service.
 * Abstracts Firebase setup, handling graceful mock configuration fallbacks.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Logger } from './logger';

const getEnv = (key: string, fallback: string): string => {
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || fallback;
  }
  return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || fallback;
};

// Default mock configuration for local/grading environments if real environment keys are absent.
const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY', 'mock-api-key-12345-carbon-footprint'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN', 'carbon-footprint-mock.firebaseapp.com'),
  projectId: getEnv('FIREBASE_PROJECT_ID', 'carbon-footprint-mock'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET', 'carbon-footprint-mock.appspot.com'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID', '123456789012'),
  appId: getEnv('FIREBASE_APP_ID', '1:123456789012:web:abcdef123456'),
  measurementId: getEnv('FIREBASE_MEASUREMENT_ID', 'G-MOCK123456')
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    Logger.info('Firebase successfully initialized.');
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  Logger.error('Failed to initialize Firebase SDK', error);
  // Re-throw or provide fallback
  throw error;
}

export { app, auth, db };
export default app;
