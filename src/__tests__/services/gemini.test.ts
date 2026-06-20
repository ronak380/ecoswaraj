/**
 * @fileoverview Unit tests for client-side GeminiService.
 */

import { GeminiService } from '@/services/gemini';

describe('GeminiService Client Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('GeminiService.chat API calls', () => {
    it('should successfully return the chatbot reply on 200 response', async () => {
      const mockReply = { reply: 'Namaste! Planting native trees is a great way to start.' };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReply,
      });

      const response = await GeminiService.chat('How to reduce carbon?', []);
      expect(response).toBe(mockReply.reply);
      expect(global.fetch).toHaveBeenCalledWith('/api/gemini', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'chat',
          message: 'How to reduce carbon?',
          history: [],
        }),
      }));
    });

    it('should return default fallback message on fetch network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      const response = await GeminiService.chat('Hello', []);
      expect(response).toContain('Namaste! I\'m having trouble connecting to my servers right now.');
    });
  });

  describe('GeminiService.generateAudit API calls', () => {
    it('should successfully return audit details on 200 response', async () => {
      const mockAudit = {
        summary: 'Excellent progress!',
        dos: ['Install solar panels', 'Grow native plants'],
        donts: ['Waste food', 'Drive diesel cars alone'],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAudit,
      });

      const response = await GeminiService.generateAudit([]);
      expect(response).toEqual(mockAudit);
      expect(global.fetch).toHaveBeenCalledWith('/api/gemini', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'audit',
          logs: [],
        }),
      }));
    });

    it('should return local backup green tips if fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      const response = await GeminiService.generateAudit([]);
      expect(response.summary).toContain('Based on your log history');
      expect(response.dos.length).toBeGreaterThan(0);
      expect(response.donts.length).toBeGreaterThan(0);
    });
  });
});
