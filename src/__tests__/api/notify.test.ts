/**
 * @fileoverview Unit tests for Notify API route.
 */

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

import { POST } from '@/app/api/notify/route';
import { getFirebaseAdmin } from '@/services/firebaseAdmin';

// Mock firebaseAdmin service
jest.mock('@/services/firebaseAdmin', () => ({
  getFirebaseAdmin: jest.fn(),
}));

describe('Notify API Route Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 error if token, title, or body is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ token: 'test-token' }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing token');
  });

  it('should send notification successfully when Firebase Admin is initialized', async () => {
    const mockSend = jest.fn().mockResolvedValue('fcm-msg-id-999');
    (getFirebaseAdmin as jest.Mock).mockReturnValue({
      messaging: () => ({
        send: mockSend,
      }),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        token: 'valid-device-token',
        title: 'Carbon Alert',
        body: 'You entered a green composting zone!',
      }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.messageId).toBe('fcm-msg-id-999');
    expect(mockSend).toHaveBeenCalledWith({
      notification: {
        title: 'Carbon Alert',
        body: 'You entered a green composting zone!',
      },
      token: 'valid-device-token',
    });
  });

  it('should return mock messageId if Firebase Admin fails to initialize', async () => {
    (getFirebaseAdmin as jest.Mock).mockReturnValue(null);

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        token: 'valid-device-token',
        title: 'Carbon Alert',
        body: 'You entered a green composting zone!',
      }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mock).toBe(true);
    expect(data.messageId).toBe('mock-msg-id-admin-missing');
  });

  it('should return mock messageId if sending throws an error', async () => {
    const mockSend = jest.fn().mockRejectedValue(new Error('FCM connection error'));
    (getFirebaseAdmin as jest.Mock).mockReturnValue({
      messaging: () => ({
        send: mockSend,
      }),
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        token: 'error-device-token',
        title: 'Carbon Alert',
        body: 'You entered a green composting zone!',
      }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mock).toBe(true);
    expect(data.messageId).toBe('mock-msg-id-fcm-failed');
  });
});
