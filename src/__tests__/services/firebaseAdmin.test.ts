/**
 * @fileoverview Unit tests for Firebase Admin SDK initialization.
 */

const mockApps: any[] = [];
const mockInitializeApp = jest.fn((config) => {
  const app = {
    name: '[DEFAULT]',
    config,
  };
  mockApps.push(app);
  return app;
});
const mockCert = jest.fn((certConfig) => certConfig);

jest.mock('firebase-admin/app', () => ({
  getApps: () => mockApps,
  getApp: () => mockApps[0],
  initializeApp: (config: any) => mockInitializeApp(config),
  cert: (certConfig: any) => mockCert(certConfig),
}));

import { getFirebaseAdmin } from '@/services/firebaseAdmin';

describe('Firebase Admin Initialization Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockApps.length = 0;
    mockInitializeApp.mockClear();
    mockCert.mockClear();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should initialize with mock/offline settings if credentials are missing', () => {
    const app = getFirebaseAdmin();
    expect(app).not.toBeNull();
    expect(mockInitializeApp).toHaveBeenCalledWith({
      projectId: 'carbon-footprint-mock',
    });
  });

  it('should initialize with service account cert credentials if provided', () => {
    process.env.FIREBASE_PROJECT_ID = 'test-project-123';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@example.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----';

    const app = getFirebaseAdmin();
    expect(app).not.toBeNull();
    expect(mockInitializeApp).toHaveBeenCalledWith({
      credential: {
        projectId: 'test-project-123',
        clientEmail: 'test@example.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----',
      },
    });
  });

  it('should return existing app if already initialized', () => {
    const app1 = getFirebaseAdmin();
    const app2 = getFirebaseAdmin();
    expect(app1).toBe(app2);
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
  });
});
