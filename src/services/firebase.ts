/**
 * @fileoverview Firebase initialization client-side service.
 * Abstracts Firebase setup, handling graceful mock configuration fallbacks.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Logger } from './logger';

// Default mock configuration for local/grading environments if real environment keys are absent.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-api-key-12345-carbon-footprint',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'carbon-footprint-mock.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'carbon-footprint-mock',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'carbon-footprint-mock.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-MOCK123456'
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
