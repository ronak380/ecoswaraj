/**
 * @fileoverview Unit tests for Gemini API route.
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

import { POST } from '@/app/api/gemini/route';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockImplementation(() => ({
        generateContent: mockGenerateContent,
      })),
    })),
  };
});

describe('Gemini API Route Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 400 if action is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing action parameter');
  });

  it('should return 400 if action is chat but message is missing', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ action: 'chat' }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing message parameter');
  });

  it('should successfully call generateContent for chat action', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'Namaste! Try growing tulsi.',
      },
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        action: 'chat',
        message: 'How to offset carbon?',
        history: [{ role: 'user', content: 'hello' }],
      }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe('Namaste! Try growing tulsi.');
  });

  it('should successfully return parsed json for audit action', async () => {
    const auditObj = {
      summary: 'You emit 10kg',
      dos: ['Eat plant-based'],
      donts: ['Drive alone'],
    };
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify(auditObj),
      },
    });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        action: 'audit',
        logs: [],
      }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(auditObj);
  });

  it('should fall back to mock response if GEMINI_API_KEY is not set', async () => {
    process.env.GEMINI_API_KEY = '';

    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        action: 'chat',
        message: 'biogas benefits',
      }),
    } as unknown as Request;

    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toContain('Benefits of Bio-gas');
  });
});
