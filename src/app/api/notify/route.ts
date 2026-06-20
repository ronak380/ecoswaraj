/**
 * @fileoverview Next.js API Route for Firebase Cloud Messaging (FCM) notifications.
 * Handles triggering push notifications using Firebase Admin SDK.
 */

import { NextResponse } from 'next/server';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirebaseAdmin } from '@/services/firebaseAdmin';
import { Logger } from '@/services/logger';

export async function POST(request: Request) {
  try {
    const bodyParams = await request.json();
    const { token, title, body } = bodyParams;

    if (!token || !title || !body) {
      return NextResponse.json(
        { error: 'Missing token, title, or body parameters' },
        { status: 400 }
      );
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      Logger.warn('Firebase Admin SDK is not initialized. Simulating notification payload delivery.');
      return NextResponse.json({ success: true, mock: true, messageId: 'mock-msg-id-admin-missing' });
    }

    try {
      const messaging = getMessaging(adminApp);
      const message = {
        notification: {
          title,
          body,
        },
        token,
      };

      const response = await messaging.send(message);
      Logger.info('Successfully sent FCM push notification', response);
      return NextResponse.json({ success: true, messageId: response });
    } catch (fcmError) {
      Logger.error('Failed to send FCM push notification. Simulating delivery.', fcmError);
      return NextResponse.json({ success: true, mock: true, messageId: 'mock-msg-id-fcm-failed' });
    }
  } catch (error) {
    Logger.error('Error in notify API endpoint', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
