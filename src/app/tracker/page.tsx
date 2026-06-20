'use client';

/**
 * @fileoverview Daily Carbon Footprint Tracker and Log History.
 * Collects transportation, energy, waste, and planting logs.
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { FirestoreService, CarbonFootprintLog } from '@/services/firestore';
import { Logger } from '@/services/logger';

export default function Tracker() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<CarbonFootprintLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vehicleType, setVehicleType] = useState<CarbonFootprintLog['transport']['vehicleType']>('none');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [electricityKwh, setElectricityKwh] = useState<number>(0);
  const [lpgCylinders, setLpgCylinders] = useState<number>(0);
  const [solarAdopted, setSolarAdopted] = useState<boolean>(false);
  const [foodWasteKg, setFoodWasteKg] = useState<number>(0);
  const [composted, setComposted] = useState<boolean>(false);
  const [biogasAdopted, setBiogasAdopted] = useState<boolean>(false);
  const [plantsGrown, setPlantsGrown] = useState<number>(0);
  const [disasterAwarenessCompleted, setDisasterAwarenessCompleted] = useState<boolean>(false);

  // Status Alerts
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await loadLogs(user);
    });
    return () => unsubscribe();
  }, []);

  const loadLogs = async (user: User | null) => {
    setLoading(true);
    try {
      const activeId = user ? user.uid : 'demo_user';
      const userLogs = await FirestoreService.getCarbonLogs(activeId);
      setLogs(userLogs);
    } catch (err) {
      Logger.error('Failed to load carbon logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);

    const logEntry: Omit<CarbonFootprintLog, 'totalFootprintKg' | 'pointsEarned'> = {
      date,
      transport: {
        vehicleType,
        distanceKm: Number(distanceKm)
      },
      energy: {
        electricityKwh: Number(electricityKwh),
        lpgCylinders: Number(lpgCylinders),
        solarAdopted
      },
      foodAndWaste: {
        foodWasteKg: Number(foodWasteKg),
        composted,
        biogasAdopted
      },
      mitigation: {
        plantsGrown: Number(plantsGrown),
        disasterAwarenessCompleted
      }
    };

    try {
      const activeId = currentUser ? currentUser.uid : 'demo_user';
      const result = await FirestoreService.logCarbonFootprint(activeId, logEntry);
      
      setStatusMsg({
        type: 'success',
        text: `Log saved successfully! Total footprint: ${result.totalFootprintKg} kg CO₂, Points: ${result.pointsEarned} pts.`
      });

      // Reload log list
      await loadLogs(currentUser);
      
      // Reset form variables (except date)
      setVehicleType('none');
      setDistanceKm(0);
      setElectricityKwh(0);
      setLpgCylinders(0);
      setSolarAdopted(false);
      setFoodWasteKg(0);
      setComposted(false);
      setBiogasAdopted(false);
      setPlantsGrown(0);
      setDisasterAwarenessCompleted(false);
    } catch (err) {
      Logger.error('Failed to submit carbon log entry', err);
      setStatusMsg({ type: 'error', text: 'Error saving log. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      <header style={{ marginBottom: '32px' }} role="banner">
        <h1 className="glow-text" style={{ fontSize: '2.2rem', marginBottom: '8px', color: 'var(--primary)' }}>
          Daily Carbon Tracker
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Record your daily actions. Green actions (composting, bio-gas, planting trees, charging EVs) earn points and offset household emissions!
        </p>
      </header>

      {statusMsg && (
        <div 
          role="alert" 
          style={{
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '24px',
            background: statusMsg.type === 'success' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 75, 92, 0.1)',
            border: `1.5px solid ${statusMsg.type === 'success' ? 'var(--primary)' : 'var(--danger)'}`,
            color: 'var(--text-primary)'
          }}
        >
          {statusMsg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
        {/* Left Side Form */}
        <section aria-labelledby="tracker-form-heading">
          <div className="card">
            <h2 id="tracker-form-heading" style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--secondary)' }}>
              Log Actions for Today
            </h2>
            <form onSubmit={handleSubmit} aria-label="Log daily carbon activity form">
              {/* Date selection */}
              <div className="form-group">
                <label className="form-label" htmlFor="log-date">Log Date</label>
                <input
                  type="date"
                  id="log-date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  aria-label="Select date of logs"
                />
              </div>

              {/* Transport section */}
              <fieldset style={{ border: 'none', marginBottom: '24px' }}>
                <legend style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '12px' }}>
                  Transportation Commute
                </legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="vehicle-type">Primary Commute mode</label>
                    <select
                      id="vehicle-type"
                      className="form-control"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as CarbonFootprintLog['transport']['vehicleType'])}
                      aria-label="Select vehicle fuel type"
                    >
                      <option value="none">No vehicle used (Walk/Cycle)</option>
                      <option value="petrol">Petrol Vehicle (Car/Bike)</option>
                      <option value="diesel">Diesel Vehicle (Car/SUV)</option>
                      <option value="ev">Electric Vehicle (EV)</option>
                      <option value="public">Public Transport (Metro/Auto/Bus)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="distance-km">Distance traveled (Km)</label>
                    <input
                      type="number"
                      id="distance-km"
                      className="form-control"
                      min="0"
                      step="any"
                      value={distanceKm || ''}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      placeholder="e.g. 15"
                      aria-label="Distance traveled in kilometers"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Household Energy Section */}
              <fieldset style={{ border: 'none', marginBottom: '24px' }}>
                <legend style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '12px' }}>
                  Household Energy Use
                </legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="electricity-kwh">Grid Electricity units (kWh)</label>
                    <input
                      type="number"
                      id="electricity-kwh"
                      className="form-control"
                      min="0"
                      step="any"
                      value={electricityKwh || ''}
                      onChange={(e) => setElectricityKwh(Number(e.target.value))}
                      placeholder="e.g. 5"
                      aria-label="Electricity consumption in units"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="lpg-cylinders">LPG cylinder fraction used</label>
                    <input
                      type="number"
                      id="lpg-cylinders"
                      className="form-control"
                      min="0"
                      max="1"
                      step="0.01"
                      value={lpgCylinders || ''}
                      onChange={(e) => setLpgCylinders(Number(e.target.value))}
                      placeholder="Fraction e.g. 0.03"
                      aria-label="Fraction of 14.2kg LPG cylinder consumed"
                    />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="solar-adopted"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    checked={solarAdopted}
                    onChange={(e) => setSolarAdopted(e.target.checked)}
                    aria-label="Toggle if solar rooftop power was active"
                  />
                  <label htmlFor="solar-adopted" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Active Solar Rooftop Power (Offsets Coal Grid emissions)
                  </label>
                </div>
              </fieldset>

              {/* Waste & Composting Section */}
              <fieldset style={{ border: 'none', marginBottom: '24px' }}>
                <legend style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '12px' }}>
                  Kitchen Waste & Offsets
                </legend>
                <div className="form-group">
                  <label className="form-label" htmlFor="food-waste">Food waste generated (Kg)</label>
                  <input
                    type="number"
                    id="food-waste"
                    className="form-control"
                    min="0"
                    step="any"
                    value={foodWasteKg || ''}
                    onChange={(e) => setFoodWasteKg(Number(e.target.value))}
                    placeholder="e.g. 1.2"
                    aria-label="Kitchen food waste in kilograms"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="composted"
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      checked={composted}
                      onChange={(e) => setComposted(e.target.checked)}
                      aria-label="Toggle if food waste was composted"
                    />
                    <label htmlFor="composted" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Composted organic waste (Reduces decay emissions)
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="biogas-adopted"
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      checked={biogasAdopted}
                      onChange={(e) => setBiogasAdopted(e.target.checked)}
                      aria-label="Toggle if organic waste feeds bio-gas plants"
                    />
                    <label htmlFor="biogas-adopted" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Feed waste to Bio-Gas reactor (Big offsets!)
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* Climate Mitigation Section */}
              <fieldset style={{ border: 'none', marginBottom: '28px' }}>
                <legend style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '12px' }}>
                  Positive Climate Actions
                </legend>
                <div className="form-group">
                  <label className="form-label" htmlFor="plants-grown">New plants / saplings planted today</label>
                  <input
                    type="number"
                    id="plants-grown"
                    className="form-control"
                    min="0"
                    step="1"
                    value={plantsGrown || ''}
                    onChange={(e) => setPlantsGrown(Number(e.target.value))}
                    placeholder="e.g. 2"
                    aria-label="Number of saplings planted"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="disaster-awareness"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    checked={disasterAwarenessCompleted}
                    onChange={(e) => setDisasterAwarenessCompleted(e.target.checked)}
                    aria-label="Toggle disaster preparedness modules completion"
                  />
                  <label htmlFor="disaster-awareness" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Completed Natural Disaster Preparedness check (Earthquake/Flood guidelines)
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px' }}
                disabled={submitting}
                aria-label="Submit daily metrics"
              >
                {submitting ? 'Saving Metrics...' : 'Calculate and Log Entry'}
              </button>
            </form>
          </div>
        </section>

        {/* Right Side: Log History List */}
        <section aria-labelledby="history-heading">
          <div className="card" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
            <h2 id="history-heading" style={{ fontSize: '1.4rem', marginBottom: '24px', color: 'var(--secondary)' }}>
              Recent Logs History
            </h2>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading carbon logs history...</p>
            ) : logs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No logs recorded yet. Use the form to start logging!</p>
            ) : (
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} aria-label="Carbon Log Entries Table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <th style={{ padding: '12px 8px' }}>Date</th>
                      <th style={{ padding: '12px 8px' }}>Transport</th>
                      <th style={{ padding: '12px 8px' }}>Carbon</th>
                      <th style={{ padding: '12px 8px' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px 8px', fontWeight: '500' }}>{log.date}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                          {log.transport.vehicleType === 'none' ? 'None' : `${log.transport.vehicleType.toUpperCase()} (${log.transport.distanceKm}km)`}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ fontWeight: '800', color: log.totalFootprintKg > 10 ? 'var(--danger)' : 'var(--secondary)' }}>
                            {log.totalFootprintKg}
                          </span>{' '}
                          kg
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: '800', color: 'var(--primary)' }}>
                          +{log.pointsEarned} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
