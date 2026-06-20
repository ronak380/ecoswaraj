'use client';

/**
 * @fileoverview Main Dashboard component.
 * Displays overall carbon summary stats, Gemini AI insights, and a leaderboard.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { FirestoreService, CarbonFootprintLog, LeaderboardEntry } from '@/services/firestore';
import { GeminiService } from '@/services/gemini';
import { Logger } from '@/services/logger';

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<CarbonFootprintLog[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Gemini audit states
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<{
    summary: string;
    dos: string[];
    donts: string[];
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await loadDashboardData(user);
    });
    return () => unsubscribe();
  }, []);

  const loadDashboardData = async (user: User | null) => {
    setLoading(true);
    try {
      const activeId = user ? user.uid : 'demo_user';
      
      // Load logs and leaderboard
      const userLogs = await FirestoreService.getCarbonLogs(activeId);
      setLogs(userLogs);
      
      const board = await FirestoreService.getLeaderboard();
      setLeaderboard(board);

      // Trigger Gemini personal audit based on logs
      setAuditLoading(true);
      const audit = await GeminiService.generateAudit(userLogs);
      setAuditData(audit);
      setAuditLoading(false);
    } catch (err) {
      Logger.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  const getAverageEmissions = () => {
    if (logs.length === 0) return 0;
    const sum = logs.reduce((acc, curr) => acc + curr.totalFootprintKg, 0);
    return parseFloat((sum / logs.length).toFixed(1));
  };

  const getTotalPoints = () => {
    if (logs.length === 0) return 0;
    return logs.reduce((acc, curr) => acc + curr.pointsEarned, 0);
  };

  const latestLog = logs[0] || null;
  const avgFootprint = getAverageEmissions();
  const totalPoints = getTotalPoints();

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      {/* Hero Welcome banner */}
      <header style={{ marginBottom: '40px' }} role="banner">
        <h1 className="glow-text" style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--primary)' }}>
          Namaste{currentUser ? `, ${currentUser.email?.split('@')[0]}` : ''}! 🌿
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Welcome to your carbon reduction companion. Track daily transportation, energy usage, and food waste to help build a cleaner India.
        </p>
      </header>

      {/* Grid of stats */}
      <section 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '24px', 
          marginBottom: '40px' 
        }}
        aria-label="Carbon statistics overview"
      >
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Average Daily Footprint</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--secondary)' }}>
                {loading ? '...' : avgFootprint}
              </span>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>kg CO₂</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '16px' }}>
            National urban average: ~5.2 kg per person/day
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Total Points Earned</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary)' }}>
                {loading ? '...' : totalPoints}
              </span>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Points</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '16px' }}>
            Earn points for EVs, composting, bio-gas, and growing plants!
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Active Offsets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Solar Rooftop Adopted:</span>
                <span style={{ fontWeight: '700', color: latestLog?.energy.solarAdopted ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {latestLog?.energy.solarAdopted ? 'Yes (12.3kg/d)' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Bio-gas Setup:</span>
                <span style={{ fontWeight: '700', color: latestLog?.foodAndWaste.biogasAdopted ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {latestLog?.foodAndWaste.biogasAdopted ? 'Yes (15kg/d)' : 'No'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span>Composting Active:</span>
                <span style={{ fontWeight: '700', color: latestLog?.foodAndWaste.composted ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {latestLog?.foodAndWaste.composted ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
          <Link href="/tracker" className="btn btn-outline" style={{ marginTop: '16px', padding: '8px 16px', fontSize: '0.85rem' }}>
            Log Daily Details
          </Link>
        </div>
      </section>

      {/* Main content split grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr', 
          gap: '32px' 
        }}
      >
        {/* Left Side: Gemini Audit Insights */}
        <section aria-label="Gemini AI Insights and Carbon Audit">
          <div className="card" style={{ minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span aria-hidden="true">🤖</span> Gemini AI Carbon Audit
              </h2>
              <span className="badge badge-primary">Gemini 2.5 Powered</span>
            </div>

            {auditLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                <div className="spinner" aria-label="Analyzing logs... Please wait."></div>
                <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Analyzing logs for green recommendations...</p>
              </div>
            ) : auditData ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1rem', lineHeight: '1.7' }}>
                  {auditData.summary}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Dos Card */}
                  <div style={{ background: 'rgba(0, 242, 254, 0.02)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 242, 254, 0.08)' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                      <span aria-hidden="true">✔</span> Do&apos;s (Green Recommendations)
                    </h3>
                    <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {auditData.dos.map((doItem, idx) => (
                        <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                          <span>{doItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Donts Card */}
                  <div style={{ background: 'rgba(255, 75, 92, 0.02)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 75, 92, 0.08)' }}>
                    <h3 style={{ color: 'var(--danger)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                      <span aria-hidden="true">✖</span> Don&apos;ts (Actions to Avoid)
                    </h3>
                    <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {auditData.donts.map((dontItem, idx) => (
                        <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                          <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>•</span>
                          <span>{dontItem}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <Link href="/coach" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                    Consult Carbon Coach AI
                  </Link>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No audit information available. Log daily metrics to populate recommendations.</p>
            )}
          </div>
        </section>

        {/* Right Side: Leaderboard & Local parameters */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} aria-label="Leaderboard and local details">
          {/* Leaderboard card */}
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span aria-hidden="true">🏆</span> Eco Leaderboard
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {leaderboard.slice(0, 5).map((entry) => {
                const isUser = currentUser && entry.userId === currentUser.uid;
                return (
                  <div 
                    key={entry.userId} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: 'var(--radius-sm)',
                      background: isUser ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: isUser ? '1px solid var(--secondary)' : '1px solid transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span 
                        style={{ 
                          fontWeight: '800', 
                          color: entry.rank === 1 ? 'var(--accent)' : entry.rank === 2 ? 'var(--text-secondary)' : 'var(--text-muted)',
                          fontSize: '1.1rem',
                          width: '24px'
                        }}
                      >
                        #{entry.rank}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{entry.userName}</span>
                    </div>
                    <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.9rem' }}>
                      {entry.totalPoints} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Educational Info box */}
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(10, 17, 30, 0.8) 0%, rgba(20, 42, 50, 0.8) 100%)' }}>
            <h3 style={{ color: 'var(--accent)', fontSize: '1.1rem', marginBottom: '12px' }}>Did you know? 💡</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '12px' }}>
              A single household bio-gas digester setup in India offsets over <strong>4.5 tonnes of CO₂ equivalent emissions</strong> annually by converting organic kitchen & agricultural waste directly into green methane cooking fuel!
            </p>
            <Link href="/locator" style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 'bold' }}>
              Find composting & bio-gas hubs nearby →
            </Link>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .spinner {
          border: 4px solid rgba(255, 255, 255, 0.1);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border-left-color: var(--secondary);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 992px) {
          div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
