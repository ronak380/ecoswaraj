/**
 * @fileoverview Geofencing service for tracking user proximity to green zones.
 * Utilizes the Haversine formula to compute distance and match coordinates.
 */

export interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description: string;
  type: 'ev_station' | 'biogas_plant' | 'compost_center' | 'green_park';
  pointsReward: number;
}

// Preset eco-friendly coordinates in India for geofence simulation.
export const INDIAN_ECO_GEOFENCES: GeofenceZone[] = [
  {
    id: 'delhi-lodhi-garden',
    name: 'Lodhi Garden Green Zone (Delhi)',
    latitude: 28.5900,
    longitude: 77.2202,
    radiusMeters: 500,
    description: 'A massive public green cover. Absorb fresh oxygen and log zero emissions!',
    type: 'green_park',
    pointsReward: 15
  },
  {
    id: 'mumbai-ev-tata',
    name: 'Tata Power EV Charging Station (Mumbai)',
    latitude: 19.0267,
    longitude: 72.8553,
    radiusMeters: 100,
    description: 'Fast charging hub for Electric Vehicles. Support clean mobility!',
    type: 'ev_station',
    pointsReward: 20
  },
  {
    id: 'bangalore-compost-hub',
    name: 'HSR Layout Composting & Recycling Center (Bangalore)',
    latitude: 12.9103,
    longitude: 77.6433,
    radiusMeters: 200,
    description: 'Community composting and biogas distribution plant.',
    type: 'compost_center',
    pointsReward: 25
  },
  {
    id: 'pune-katraj-biogas',
    name: 'Katraj Organic Waste & Bio-gas Facility (Pune)',
    latitude: 18.4529,
    longitude: 73.8554,
    radiusMeters: 150,
    description: 'Local municipal waste-to-energy biogas digester plant.',
    type: 'biogas_plant',
    pointsReward: 30
  }
];

export class GeofenceService {
  /**
   * Calculates the distance in meters between two lat/lon pairs using the Haversine formula.
   */
  public static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Evaluates if coordinates lie within any active eco-geofence zone.
   * @param latitude - User's current latitude.
   * @param longitude - User's current longitude.
   * @returns The matched zone or null.
   */
  public static checkGeofences(latitude: number, longitude: number): GeofenceZone | null {
    for (const zone of INDIAN_ECO_GEOFENCES) {
      const distance = this.calculateDistance(latitude, longitude, zone.latitude, zone.longitude);
      if (distance <= zone.radiusMeters) {
        return zone;
      }
    }
    return null;
  }
}
