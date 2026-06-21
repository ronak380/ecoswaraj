/**
 * @fileoverview Database service wrapping Firestore operations for carbon tracking.
 * Features automatic localStorage fallback if cloud connection is unavailable.
 */

import { doc, setDoc, collection, query, getDocs, orderBy, limit, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import { Logger } from './logger';

export interface CarbonFootprintLog {
  id?: string;
  date: string; // YYYY-MM-DD
  transport: {
    vehicleType: 'petrol' | 'diesel' | 'ev' | 'public' | 'none';
    distanceKm: number;
  };
  energy: {
    electricityKwh: number;
    lpgCylinders: number;
    solarAdopted: boolean;
  };
  foodAndWaste: {
    foodWasteKg: number;
    composted: boolean;
    biogasAdopted: boolean;
  };
  mitigation: {
    plantsGrown: number;
    disasterAwarenessCompleted: boolean;
  };
  totalFootprintKg: number;
  pointsEarned: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalPoints: number;
  rank?: number;
}

const LOCAL_LOGS_KEY = 'carbon_tracker_logs';
const LOCAL_LEADERBOARD_KEY = 'carbon_tracker_leaderboard';

// Standard emissions coefficients tailored for India (in kg CO2)
// Source references: Central Electricity Authority, BEE India, transport stats
export const EMISSION_FACTORS = {
  petrolKm: 0.17, // Avg car/two-wheeler petrol emission per km
  dieselKm: 0.21, // Avg diesel car per km
  evKm: 0.05,     // EV charging emission per km (coal-dominated grid)
  publicKm: 0.03, // Metro/bus public transport per km
  electricityKwh: 0.82, // CEA grid emission factor for India (0.82 kg/kWh)
  lpgCylinder: 42.5,    // Standard 14.2kg LPG cylinder contains ~42.5 kg CO2 emission when burned
  foodWasteKg: 1.9,     // Methane emission equivalents from food decay
  compostOffsetKg: -0.8, // Reduction per kg composted
  biogasOffsetKg: -15.0,  // Daily bio-gas setup offset
  plantOffsetKg: -1.2,    // Offset per grown plant per day
};

/**
 * Wraps a promise in a timeout check.
 * Rejects the promise if it takes longer than the specified milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))
  ]);
}

/**
 * Calculates carbon footprint in kg CO2 based on Indian household/transport variables.
 */
export function calculateFootprint(log: Omit<CarbonFootprintLog, 'totalFootprintKg' | 'pointsEarned'>): {
  totalFootprintKg: number;
  pointsEarned: number;
} {
  let transportEmissions = 0;
  if (log.transport.vehicleType === 'petrol') {
    transportEmissions = log.transport.distanceKm * EMISSION_FACTORS.petrolKm;
  } else if (log.transport.vehicleType === 'diesel') {
    transportEmissions = log.transport.distanceKm * EMISSION_FACTORS.dieselKm;
  } else if (log.transport.vehicleType === 'ev') {
    transportEmissions = log.transport.distanceKm * EMISSION_FACTORS.evKm;
  } else if (log.transport.vehicleType === 'public') {
    transportEmissions = log.transport.distanceKm * EMISSION_FACTORS.publicKm;
  }

  const energyEmissions = 
    (log.energy.electricityKwh * EMISSION_FACTORS.electricityKwh) +
    (log.energy.lpgCylinders * EMISSION_FACTORS.lpgCylinder);

  let wasteEmissions = log.foodAndWaste.foodWasteKg * EMISSION_FACTORS.foodWasteKg;
  if (log.foodAndWaste.composted) {
    wasteEmissions += log.foodAndWaste.foodWasteKg * EMISSION_FACTORS.compostOffsetKg;
  }

  let offsets = 0;
  if (log.energy.solarAdopted) {
    // Offset standard Indian electricity grid consumption by 15 kWh equivalent daily
    offsets += 15 * EMISSION_FACTORS.electricityKwh;
  }
  if (log.foodAndWaste.biogasAdopted) {
    offsets += Math.abs(EMISSION_FACTORS.biogasOffsetKg);
  }
  offsets += log.mitigation.plantsGrown * Math.abs(EMISSION_FACTORS.plantOffsetKg);

  const totalFootprintKg = Math.max(0, parseFloat((transportEmissions + energyEmissions + wasteEmissions - offsets).toFixed(2)));

  // Points system where lower footprint and positive actions yield higher points
  let points = 100; // Base daily score
  points -= Math.round(totalFootprintKg * 2); // Deduct for footprint
  if (log.transport.vehicleType === 'ev') points += 15;
  if (log.transport.vehicleType === 'public') points += 10;
  if (log.energy.solarAdopted) points += 20;
  if (log.foodAndWaste.biogasAdopted) points += 25;
  if (log.foodAndWaste.composted) points += 15;
  if (log.mitigation.plantsGrown > 0) points += log.mitigation.plantsGrown * 5;
  if (log.mitigation.disasterAwarenessCompleted) points += 20;

  return {
    totalFootprintKg,
    pointsEarned: Math.max(10, points) // Minimum 10 points for participating
  };
}

export class FirestoreService {
  /**
   * Helper checking if active Firebase config uses mock keys.
   */
  private static isMockConfig(): boolean {
    let key = '';
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      key = (window as any).__ENV__.FIREBASE_API_KEY || '';
    } else {
      key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
    }
    return !key || key.includes('mock-api-key') || key === '';
  }

  /**
   * Logs daily carbon footprint entry to Firestore with localStorage fallback.
   */
  public static async logCarbonFootprint(userId: string, entry: Omit<CarbonFootprintLog, 'totalFootprintKg' | 'pointsEarned'>): Promise<CarbonFootprintLog> {
    const { totalFootprintKg, pointsEarned } = calculateFootprint(entry);
    const completeEntry: CarbonFootprintLog = {
      ...entry,
      totalFootprintKg,
      pointsEarned,
      id: `${userId}_${entry.date}`
    };

    if (this.isMockConfig()) {
      Logger.info('Bypassing cloud Firestore write. Storing directly in localStorage.');
      const localLogs = this.getLocalLogs(userId);
      const index = localLogs.findIndex(l => l.date === entry.date);
      if (index > -1) {
        localLogs[index] = completeEntry;
      } else {
        localLogs.push(completeEntry);
      }
      localStorage.setItem(`${LOCAL_LOGS_KEY}_${userId}`, JSON.stringify(localLogs));
      await this.updateLeaderboardPoints(userId, 'Eco Warrior', pointsEarned);
      return completeEntry;
    }

    try {
      const docRef = doc(db, 'users', userId, 'logs', entry.date);
      await withTimeout(setDoc(docRef, completeEntry));
      Logger.info(`Log saved to Firestore for user: ${userId} on date: ${entry.date}`);
    } catch (error) {
      Logger.warn('Firestore write failed, falling back to localStorage.', error);
      const localLogs = this.getLocalLogs(userId);
      const index = localLogs.findIndex(l => l.date === entry.date);
      if (index > -1) {
        localLogs[index] = completeEntry;
      } else {
        localLogs.push(completeEntry);
      }
      localStorage.setItem(`${LOCAL_LOGS_KEY}_${userId}`, JSON.stringify(localLogs));
    }

    // Update leaderboard score
    await this.updateLeaderboardPoints(userId, 'Eco Warrior', pointsEarned);

    return completeEntry;
  }

  /**
   * Fetches user carbon logs.
   */
  public static async getCarbonLogs(userId: string): Promise<CarbonFootprintLog[]> {
    if (this.isMockConfig()) {
      return this.getLocalLogs(userId).sort((a, b) => b.date.localeCompare(a.date));
    }

    try {
      const logsRef = collection(db, 'users', userId, 'logs');
      const q = query(logsRef, orderBy('date', 'desc'), limit(30));
      const querySnapshot = await withTimeout(getDocs(q));
      const logs: CarbonFootprintLog[] = [];
      querySnapshot.forEach((docSnap) => {
        logs.push(docSnap.data() as CarbonFootprintLog);
      });
      if (logs.length > 0) {
        return logs;
      }
    } catch (error) {
      Logger.warn('Firestore read failed, loading logs from localStorage.', error);
    }
    return this.getLocalLogs(userId).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Updates total leader points for a user.
   */
  public static async updateLeaderboardPoints(userId: string, userName: string, pointsEarned: number): Promise<void> {
    if (!this.isMockConfig()) {
      try {
        const entryRef = doc(db, 'leaderboard', userId);
        await withTimeout(setDoc(entryRef, {
          userId,
          userName,
          totalPoints: pointsEarned // In a real app we increment, for simplicity we store the latest
        }, { merge: true }));
      } catch (error) {
        Logger.warn('Firestore leaderboard write failed, updating local leaderboard.', error);
      }
    }

    // Local leaderboard update
    const board = this.getLocalLeaderboard();
    const index = board.findIndex(b => b.userId === userId);
    if (index > -1) {
      board[index].totalPoints = Math.max(board[index].totalPoints, pointsEarned);
    } else {
      board.push({ userId, userName, totalPoints: pointsEarned });
    }
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(board));
  }

  /**
   * Retrieves top leaderboard entries.
   */
  public static async getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!this.isMockConfig()) {
      try {
        const boardRef = collection(db, 'leaderboard');
        const q = query(boardRef, orderBy('totalPoints', 'desc'), limit(10));
        const querySnapshot = await withTimeout(getDocs(q));
        const board: LeaderboardEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          board.push(docSnap.data() as LeaderboardEntry);
        });
        if (board.length > 0) {
          return board.map((item, idx) => ({ ...item, rank: idx + 1 }));
        }
      } catch (error) {
        Logger.warn('Firestore leaderboard read failed, loading local leaderboard.', error);
      }
    }

    // Fallback: Default mock Indian cities leaderboard if empty
    let localBoard = this.getLocalLeaderboard();
    if (localBoard.length === 0) {
      localBoard = [
        { userId: '1', userName: 'Mumbai Green Club', totalPoints: 480 },
        { userId: '2', userName: 'Bengaluru Solar Alliance', totalPoints: 450 },
        { userId: '3', userName: 'Delhi EV Pioneers', totalPoints: 410 },
        { userId: '4', userName: 'Chennai Composting Guild', totalPoints: 390 },
        { userId: '5', userName: 'Pune BioGas Team', totalPoints: 375 },
      ];
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(localBoard));
    }

    return localBoard
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  }

  // Helper local database retrieval routines
  private static getLocalLogs(userId: string): CarbonFootprintLog[] {
    if (typeof window === 'undefined') return [];
    const local = localStorage.getItem(`${LOCAL_LOGS_KEY}_${userId}`);
    return local ? JSON.parse(local) : [];
  }

  private static getLocalLeaderboard(): LeaderboardEntry[] {
    if (typeof window === 'undefined') return [];
    const local = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    return local ? JSON.parse(local) : [];
  }
}
