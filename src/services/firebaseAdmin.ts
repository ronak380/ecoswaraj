/**
 * @fileoverview Firebase Admin SDK initialization service.
 * Handles loading of service account credentials with graceful mock backups for local tests.
 */

import * as admin from 'firebase-admin';
import { Logger } from './logger';

/**
 * Initializes and retrieves the Firebase Admin application instance.
 * Falls back to mock project settings if credentials are not configured in environment variables.
 */
export function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'carbon-footprint-mock';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  if (projectId && clientEmail && privateKey) {
    try {
      Logger.info('Initializing Firebase Admin SDK using service account credentials.');
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      Logger.error('Failed to initialize Firebase Admin with credentials. Falling back to default settings.', error);
    }
  }

  try {
    Logger.info(`Initializing Firebase Admin SDK in offline/mock mode for project: ${projectId}`);
    return admin.initializeApp({
      projectId,
    });
  } catch (error) {
    Logger.error('Failed to initialize Firebase Admin in mock mode.', error);
    return null;
  }
}
