/**
 * @fileoverview Next.js API Route for Google Gemini 2.5 interaction.
 * Handles Chatbot completions and Carbon Footprint logging audits.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from '@/services/logger';
import { CarbonFootprintLog } from '@/services/firestore';

interface ChatHistoryItem {
  role: 'user' | 'model';
  content: string;
}

// Use gemini-2.5-flash for standard conversational and reasoning tasks as requested.
// Fallback to gemini-1.5-flash if needed, but default is gemini-2.5-flash.
const MODEL_NAME = 'gemini-2.5-flash';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    if (action === 'chat') {
      const { message, history = [] } = body;
      if (!message) {
        return NextResponse.json({ error: 'Missing message parameter' }, { status: 400 });
      }

      if (!genAI) {
        Logger.warn('Gemini API key is not configured. Returning fallback chatbot response.');
        return NextResponse.json({ reply: getMockChatResponse(message) });
      }

      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: `You are the Carbon Footprint Coach of India. Help users understand, track, and reduce their carbon footprint.
Focus on localized solutions for Indian households: solar panels (PM Surya Ghar), composting food waste, setting up bio-gas plants, organic waste recycling, public transport (metro, buses), adopting EVs instead of petrol/diesel, growing native trees, and disaster preparedness. Keep responses encouraging, concise, structured, and in markdown format.`,
      });

      // Filter history to ensure it strictly starts with 'user' and alternates between 'user' and 'model'
      const cleanHistory: ChatHistoryItem[] = [];
      let expectedRole: 'user' | 'model' = 'user';

      for (const item of history) {
        if (item.role === expectedRole) {
          cleanHistory.push(item);
          expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
      }

      // If the clean history ends with 'user', we remove the last item to ensure that
      // appending the new user message doesn't create two consecutive 'user' messages.
      if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === 'user') {
        cleanHistory.pop();
      }

      // Format history to match SDK expectations
      const formattedHistory = cleanHistory.map((item: ChatHistoryItem) => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.content }],
      }));

      // Use generateContent stateless API instead of startChat session
      const contents = [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ];

      const result = await model.generateContent({
        contents,
      });
      const replyText = result.response.text();
      return NextResponse.json({ reply: replyText });
    }

    if (action === 'audit') {
      const { logs = [] } = body as { logs: CarbonFootprintLog[] };
      
      if (!genAI) {
        Logger.warn('Gemini API key is not configured. Returning fallback audit.');
        return NextResponse.json(getMockAuditResponse(logs));
      }

      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const prompt = `You are an expert environmental carbon auditor in India. Analyze these carbon footprint logs for a user:
${JSON.stringify(logs)}

Based on these logs, generate a personalized audit. Focus on Indian specific scenarios like LPG cylinder usage, solar adoption, EV charging, bio-gas benefit potentials, and waste composting.
You MUST respond with a JSON object containing exactly these fields:
{
  "summary": "Detailed summary of the current carbon emission trend and impact.",
  "dos": ["3-5 recommended positive actions to do next"],
  "donts": ["3-5 actions to stop doing or avoid"]
}`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      
      try {
        const parsed = JSON.parse(rawText);
        return NextResponse.json(parsed);
      } catch (jsonErr) {
        Logger.error('Failed to parse Gemini JSON audit response', rawText, jsonErr);
        return NextResponse.json(getMockAuditResponse(logs));
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    Logger.error('Error in Gemini API route', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Returns mock chatbot answers based on关键字 keyword matching for offline testing.
 */
function getMockChatResponse(message: string): string {
  const lowercase = message.toLowerCase();
  if (lowercase.includes('biogas') || lowercase.includes('bio-gas') || lowercase.includes('waste')) {
    return `### Benefits of Bio-gas & Food Waste reduction in India:
1. **Waste to Energy**: Organic kitchen waste can be converted into clean cooking gas (methane) right in your backyard or community block.
2. **Soil Health**: The slurry byproduct is rich organic manure, perfect for home gardening and farming.
3. **Disaster Prevention**: Decomposing food waste in open landfills releases massive methane gas contributing to extreme weather events and heatwaves. Composting or bio-gas adoption helps mitigate these risks.
Would you like assistance setting up a localized organic waste digester?`;
  }
  if (lowercase.includes('ev') || lowercase.includes('vehicle') || lowercase.includes('car')) {
    return `### EV Transition in the Indian Context:
- **Tailpipe Zero**: Electric Vehicles (EVs) produce zero direct emissions, greatly improving AQI in crowded Indian cities like Delhi, Mumbai, and Bengaluru.
- **Solar Charger Synergy**: Charging your EV with solar rooftop panels makes your travel carbon footprint virtually **zero**.
- **Financial Perks**: Take advantage of state subsidies, lower GST (5%), and income tax deductions under Section 80EEB.`;
  }
  return `### Hello from Carbon Footprint Coach! 🌿
I am here to guide you in reducing emissions. Here are quick tips for our Indian households:
- **PM Surya Ghar**: Register for rooftop solar to offset high grid coal emissions.
- **Grow Plants**: Growing plants like Tulsi, Neem, or local trees helps absorb CO2.
- **Compost Pits**: Segregate dry and wet waste. Use organic waste for compost.
Tell me, what are you currently tracking? (e.g. EV travel, electricity units, or composting)`;
}

/**
 * Returns mock audit replies for offline evaluations.
 */
function getMockAuditResponse(logs: CarbonFootprintLog[]): {
  summary: string;
  dos: string[];
  donts: string[];
} {
  const avgFootprint = logs.length > 0 
    ? logs.reduce((acc, curr) => acc + curr.totalFootprintKg, 0) / logs.length 
    : 12.5;

  return {
    summary: `Your average daily footprint is ${avgFootprint.toFixed(1)} kg CO2. In India, the average per capita footprint is around 1.9 tonnes annually. Your current levels are in line with urban households, but there is significant room for reduction through clean energy transition.`,
    dos: [
      "Switch to public metro transit or carpool with EVs for daily work travel.",
      "Incorporate food waste composting to reduce methane release.",
      "Explore PM-Surya Ghar solar rooftop system to offset grid coal emissions.",
      "Start a bio-gas container unit if you have a kitchen garden or organic waste."
    ],
    donts: [
      "Avoid leaving heavy appliances like Geysers and ACs running when not needed.",
      "Do not mix electronic waste or plastics with food compost bins.",
      "Avoid traveling long distances alone in petrol or diesel cars."
    ]
  };
}
