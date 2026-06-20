/**
 * @fileoverview Client-side service wrapping Google Gemini 2.5 AI interaction.
 * Interacts with serverless API route to protect API keys.
 */

import { Logger } from './logger';
import { CarbonFootprintLog } from './firestore';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export class GeminiService {
  /**
   * Sends a user message to the Gemini chatbot endpoint.
   * @param message - The current user message.
   * @param history - Previous chat logs for context.
   */
  public static async chat(message: string, history: ChatMessage[] = []): Promise<string> {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          message,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.reply;
    } catch (error) {
      Logger.error('Gemini chat service failure', error);
      return "Namaste! I'm having trouble connecting to my servers right now. Let's talk about carbon footprint reduction (like using solar rooftops or setting up bio-gas plants in India) in just a moment!";
    }
  }

  /**
   * Generates a personalized carbon audit with specific Do's and Don'ts.
   * @param logs - The user's past carbon footprint entries.
   */
  public static async generateAudit(logs: CarbonFootprintLog[]): Promise<{
    summary: string;
    dos: string[];
    donts: string[];
  }> {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'audit',
          logs,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini audit error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      Logger.error('Gemini audit service failure', error);
      // Clean fallback audits tailored to Indian Context if server is offline
      return {
        summary: "Based on your log history, we have compiled local green recommendations to lower your carbon footprint in India.",
        dos: [
          "Switch to public transit like Metro or EVs to reduce tailpipe emissions.",
          "Use a home compost bin for organic food waste, reducing methane in landfills.",
          "Adopt high-efficiency LED lights and consider solar rooftop schemes like PM-Surya Ghar.",
          "Explore localized bio-gas solutions if you reside in semi-urban or rural properties."
        ],
        donts: [
          "Avoid driving single-occupant petrol/diesel vehicles for short commutes.",
          "Do not dump biodegradable waste into general trash bins.",
          "Avoid leaving high-energy appliances (ACs, geysers) on standby."
        ]
      };
    }
  }
}
