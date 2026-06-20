/**
 * @fileoverview Unit tests for Geofence Service.
 */

import { GeofenceService, INDIAN_ECO_GEOFENCES } from '@/services/geofence';

describe('GeofenceService', () => {
  describe('calculateDistance', () => {
    it('should return 0 for identical coordinates', () => {
      const lat = 12.9716;
      const lon = 77.5946;
      const distance = GeofenceService.calculateDistance(lat, lon, lat, lon);
      expect(distance).toBe(0);
    });

    it('should correctly calculate distance between two distinct points', () => {
      // Bangalore to Delhi approx distance is ~1700km
      const bangalore = { lat: 12.9716, lon: 77.5946 };
      const delhi = { lat: 28.6139, lon: 77.2090 };
      const distanceKm = GeofenceService.calculateDistance(
        bangalore.lat,
        bangalore.lon,
        delhi.lat,
        delhi.lon
      ) / 1000;

      expect(distanceKm).toBeGreaterThan(1600);
      expect(distanceKm).toBeLessThan(1800);
    });
  });

  describe('checkGeofences', () => {
    it('should match a preset geofence when coordinates are within radius', () => {
      // Lodhi Garden is at 28.5900, 77.2202. We pass 28.5901, 77.2201 (very close)
      const matched = GeofenceService.checkGeofences(28.5901, 77.2201);
      expect(matched).not.toBeNull();
      expect(matched?.id).toBe('delhi-lodhi-garden');
      expect(matched?.pointsReward).toBe(15);
    });

    it('should return null when coordinates are outside all radii', () => {
      // A random ocean coordinate
      const matched = GeofenceService.checkGeofences(0, 0);
      expect(matched).toBeNull();
    });
  });
});
