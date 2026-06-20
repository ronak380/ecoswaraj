/**
 * @fileoverview Unit tests for Firestore Carbon Calculator and Logger.
 */

import { calculateFootprint, FirestoreService } from '@/services/firestore';

// Mock Firebase client library
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  setDoc: jest.fn(() => Promise.reject(new Error('Mock network failure for fallback testing'))),
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(() => Promise.reject(new Error('Mock network failure'))),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

describe('Firestore and Footprint Calculation Service', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    jest.clearAllMocks();
  });

  describe('calculateFootprint math', () => {
    it('should calculate higher footprint for petrol/diesel travel and zero offsets', () => {
      const logInput = {
        date: '2026-06-20',
        transport: {
          vehicleType: 'diesel' as const,
          distanceKm: 100
        },
        energy: {
          electricityKwh: 10,
          lpgCylinders: 0.1,
          solarAdopted: false
        },
        foodAndWaste: {
          foodWasteKg: 5,
          composted: false,
          biogasAdopted: false
        },
        mitigation: {
          plantsGrown: 0,
          disasterAwarenessCompleted: false
        }
      };

      const result = calculateFootprint(logInput);
      
      // Expected emissions:
      // Transport: 100 * 0.21 = 21 kg
      // Energy: (10 * 0.82) + (0.1 * 42.5) = 8.2 + 4.25 = 12.45 kg
      // Waste: 5 * 1.9 = 9.5 kg
      // Total = 21 + 12.45 + 9.5 = 42.95 kg
      expect(result.totalFootprintKg).toBeCloseTo(42.95, 1);
    });

    it('should calculate significant offsets when solar and biogas are active', () => {
      const logInput = {
        date: '2026-06-20',
        transport: {
          vehicleType: 'ev' as const,
          distanceKm: 20
        },
        energy: {
          electricityKwh: 2,
          lpgCylinders: 0,
          solarAdopted: true // Solar offsets ~15 kWh * 0.82 = 12.3 kg CO2
        },
        foodAndWaste: {
          foodWasteKg: 1,
          composted: true,
          biogasAdopted: true // Biogas offsets 15 kg CO2
        },
        mitigation: {
          plantsGrown: 5, // Plants offset 5 * 1.2 = 6 kg CO2
          disasterAwarenessCompleted: true
        }
      };

      const result = calculateFootprint(logInput);
      
      // Emissions should be very low or zero due to massive offsets
      expect(result.totalFootprintKg).toBe(0);
      expect(result.pointsEarned).toBeGreaterThan(100);
    });
  });

  describe('FirestoreService self-healing fallbacks', () => {
    it('should write logs to localStorage if firebase rejects', async () => {
      const logInput = {
        date: '2026-06-20',
        transport: {
          vehicleType: 'none' as const,
          distanceKm: 0
        },
        energy: {
          electricityKwh: 0,
          lpgCylinders: 0,
          solarAdopted: false
        },
        foodAndWaste: {
          foodWasteKg: 0,
          composted: false,
          biogasAdopted: false
        },
        mitigation: {
          plantsGrown: 0,
          disasterAwarenessCompleted: false
        }
      };

      // Writing should fall back to localStorage
      const logged = await FirestoreService.logCarbonFootprint('test_user', logInput);
      expect(logged.id).toBe('test_user_2026-06-20');
      
      // Check localStorage backup
      const history = await FirestoreService.getCarbonLogs('test_user');
      expect(history.length).toBe(1);
      expect(history[0].date).toBe('2026-06-20');
    });
  });
});
