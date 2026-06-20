'use client';

/**
 * @fileoverview AI Carbon Coach Chat interface.
 * Connects to Gemini Service to answer questions on bio-gas, EVs, and compost.
 */

import React, { useState, useRef, useEffect } from 'react';
import { GeminiService, ChatMessage } from '@/services/gemini';
import { Logger } from '@/services/logger';

export default function CarbonCoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: `### Namaste! I am your AI Carbon Coach. 🌿

I can help you understand and lower your daily carbon footprint in India. Here are some things we can discuss:
* How to set up a home **compost pit** or backyard **bio-gas digester**.
* Benefits of transitioning to **Electric Vehicles (EVs)** and public metro rails.
* Registering for rooftop solar programs like **PM Surya Ghar**.
* Steps to safeguard your house against **natural disasters** (floods, heatwaves) by reducing urban waste.

What can I help you with today?`
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInputMsg('');
    setLoading(true);

    try {
      // Send chat history and current message to Gemini 2.5
      // Filter out initial coach greeting if necessary, or pass all
      const reply = await GeminiService.chat(textToSend, messages);
      setMessages((prev) => [...prev, { role: 'model', content: reply }]);
    } catch (err) {
      Logger.error('Error sending message to chatbot', err);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'How do I set up a biogas plant?',
    'Explain PM Surya Ghar solar rooftop scheme',
    'How does composting food waste help?',
    'EV charging vs petrol emissions in India'
  ];

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px', maxWidth: '850px' }}>
      <header style={{ marginBottom: '24px' }} role="banner">
        <h1 className="glow-text" style={{ fontSize: '2.2rem', marginBottom: '8px', color: 'var(--primary)' }}>
          Gemini Carbon Coach
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Ask our Gemini 2.5 AI coach about setting up clean energy systems, organic farming offsets, and sustainable practices in India.
        </p>
      </header>

      {/* Chat Window */}
      <section aria-label="AI Coach chat session">
        <div 
          className="card" 
          style={{ 
            height: '500px', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: '20px',
            marginBottom: '20px'
          }}
        >
          {/* Messages list */}
          <div 
            role="log"
            aria-label="Chat messages history"
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              paddingRight: '8px',
              marginBottom: '16px'
            }}
          >
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: msg.role === 'user' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: msg.role === 'user' ? '1px solid var(--secondary)' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {/* Visual Avatar Identifier */}
                <div style={{ fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '6px', color: msg.role === 'user' ? 'var(--secondary)' : 'var(--primary)' }}>
                  {msg.role === 'user' ? 'You' : 'Carbon Coach AI'}
                </div>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div 
                style={{
                  alignSelf: 'flex-start',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                aria-label="Coach is composing response"
              >
                <div className="dot-pulse" />
                <span>Coach is thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input controls */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(inputMsg); }}
            style={{ display: 'flex', gap: '12px' }}
            aria-label="Send message to Carbon Coach AI"
          >
            <input
              type="text"
              className="form-control"
              placeholder="Ask anything about bio-gas, solar rooftops, compost..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              disabled={loading}
              aria-label="Type message here"
              required
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !inputMsg.trim()}
              aria-label="Send Message"
            >
              Send
            </button>
          </form>
        </div>
      </section>

      {/* Suggested prompts list */}
      <section aria-labelledby="suggestions-heading">
        <h3 id="suggestions-heading" style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Suggested Questions:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '20px' }}
              onClick={() => handleSend(sug)}
              disabled={loading}
              aria-label={`Ask suggestion: ${sug}`}
            >
              {sug}
            </button>
          ))}
        </div>
      </section>

      <style jsx>{`
        .dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 9999px 0 0 0 var(--primary);
          animation: dotPulse 1.5s infinite steps(4);
        }

        @keyframes dotPulse {
          0% { background: var(--primary); }
          50% { background: rgba(5, 255, 163, 0.2); }
          100% { background: var(--primary); }
        }
      `}</style>
    </div>
  );
}
