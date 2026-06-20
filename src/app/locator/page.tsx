'use client';

/**
 * @fileoverview Green Locator page implementing Google Maps JS SDK and client-side geofencing.
 * Plugs into Geofencing Service to calculate distances and simulate/reward green zone visits.
 */

import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { GeofenceService, INDIAN_ECO_GEOFENCES, GeofenceZone } from '@/services/geofence';
import { FirestoreService } from '@/services/firestore';
import { Logger } from '@/services/logger';

export default function GreenLocator() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 12.9716, // Bangalore default center
    lng: 77.5946
  });

  const [activeGeofence, setActiveGeofence] = useState<GeofenceZone | null>(null);
  const [geofenceAlert, setGeofenceAlert] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Request browser location on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          checkLocationGeofence(loc.lat, loc.lng);
        },
        (err) => {
          Logger.warn('Geolocation access denied or timed out.', err);
          setErrorMsg('Browser geolocation permission denied. Using simulated location console.');
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize Map
  useEffect(() => {
    let mapsApiKey = '';
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      mapsApiKey = (window as any).__ENV__.MAPS_API_KEY || '';
    } else {
      mapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || '';
    }

    if (!mapsApiKey) {
      Logger.warn('Google Maps API key is missing. Renders fallback graphic simulation maps dashboard.');
      return;
    }

    if (mapRef.current) {
      setOptions({
        key: mapsApiKey,
        v: 'weekly'
      });

      importLibrary('maps').then(() => {
        const google = (window as any).google;
        setMapsLoaded(true);
        const map = new google.maps.Map(mapRef.current!, {
          center: userLocation,
          zoom: 14,
          styles: darkMapStyles
        });

        // Current User location marker
        new google.maps.Marker({
          position: userLocation,
          map,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#00f2fe',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff'
          }
        });

        // Add markers for all green zones
        INDIAN_ECO_GEOFENCES.forEach((zone) => {
          const marker = new google.maps.Marker({
            position: { lat: zone.latitude, lng: zone.longitude },
            map,
            title: zone.name,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: zone.type === 'ev_station' ? '#00f2fe' : '#05ffa3',
              fillOpacity: 0.9,
              strokeWeight: 1,
              strokeColor: '#000000'
            }
          });

          // Info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="color: #0b0f14; padding: 8px;">
                <h4 style="margin-bottom: 4px;">${zone.name}</h4>
                <p style="font-size: 0.85rem; margin-bottom: 6px;">${zone.description}</p>
                <span style="background: #05ffa3; color: #0b0f14; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: bold;">
                  Reward: +${zone.pointsReward} Points
                </span>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        });
      }).catch((err) => {
        Logger.error('Google Maps SDK failed to load', err);
      });
    }
  }, [userLocation]);

  const checkLocationGeofence = async (lat: number, lng: number) => {
    const matchedZone = GeofenceService.checkGeofences(lat, lng);
    if (matchedZone) {
      setActiveGeofence(matchedZone);
      setGeofenceAlert(`🎉 Welcome to ${matchedZone.name}! You are in a ${matchedZone.type.replace('_', ' ')} zone. Awarded +${matchedZone.pointsReward} points!`);
      
      // Save reward points
      const activeId = currentUser ? currentUser.uid : 'demo_user';
      const name = currentUser ? (currentUser.email?.split('@')[0] || 'Eco Warrior') : 'Eco Warrior';
      await FirestoreService.updateLeaderboardPoints(activeId, name, matchedZone.pointsReward);
    } else {
      setActiveGeofence(null);
      setGeofenceAlert(null);
    }
  };

  const handleSimulateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const zoneId = e.target.value;
    if (zoneId === 'none') return;
    
    const zone = INDIAN_ECO_GEOFENCES.find(z => z.id === zoneId);
    if (zone) {
      // Simulate exact location inside radius
      const simLoc = { lat: zone.latitude, lng: zone.longitude };
      setUserLocation(simLoc);
      checkLocationGeofence(simLoc.lat, simLoc.lng);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 24px' }}>
      <header style={{ marginBottom: '32px' }} role="banner">
        <h1 className="glow-text" style={{ fontSize: '2.2rem', marginBottom: '8px', color: 'var(--primary)' }}>
          Green Locator & Geofencing
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Find nearby EV charging networks, local bio-gas plants, organic composting centers, and urban parks. Entering a geofenced area triggers active point awards!
        </p>
      </header>

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
          ℹ {errorMsg}
        </div>
      )}

      {/* Geofencing Notification Banner */}
      {geofenceAlert && (
        <div 
          role="alert" 
          style={{
            padding: '20px',
            background: 'rgba(5, 255, 163, 0.1)',
            border: '1.5px solid var(--primary)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '32px',
            color: 'var(--text-primary)',
            boxShadow: '0 0 20px rgba(5, 255, 163, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '1.8rem' }} aria-hidden="true">🔋</span>
          <div>
            <h4 style={{ color: 'var(--primary)', marginBottom: '4px', fontWeight: 'bold' }}>Geofence Matched!</h4>
            <p style={{ fontSize: '0.95rem' }}>{geofenceAlert}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Left Side: Map / Fallback Dashboard */}
        <section aria-label="Eco Map Dashboard">
          <div className="card" style={{ padding: '12px', height: '500px', display: 'flex', flexDirection: 'column' }}>
            {process.env.NEXT_PUBLIC_MAPS_API_KEY ? (
              <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '12px' }} aria-label="Interactive Google Map showing green landmarks" />
            ) : (
              // Fallback Graphical Coordinates Dashboard
              <div 
                style={{ 
                  flex: 1, 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '24px',
                  textAlign: 'center',
                  border: '1px dashed var(--border-color)'
                }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '16px' }} aria-hidden="true">🗺</div>
                <h3 style={{ marginBottom: '8px' }}>Google Maps Simulation Console</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '0.9rem', marginBottom: '24px' }}>
                  No Google Maps key found. Displaying active coordinate simulation dashboard. Select a location on the right console to trigger client-side geofencing rewards.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', maxWidth: '500px' }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>YOUR LATITUDE</span>
                    <h4 style={{ color: 'var(--secondary)' }}>{userLocation.lat.toFixed(5)}</h4>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>YOUR LONGITUDE</span>
                    <h4 style={{ color: 'var(--secondary)' }}>{userLocation.lng.toFixed(5)}</h4>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Simulation & Landmark Coordinates */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} aria-label="Map Control Console">
          {/* Simulation Box */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--secondary)' }}>Simulate Geolocation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Simulate coordinates to test geofencing mechanics. The browser recalculates Haversine distances to reward points.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="simulate-zone">Jump to Location</label>
              <select
                id="simulate-zone"
                className="form-control"
                onChange={handleSimulateSelect}
                defaultValue="none"
                aria-label="Simulate jumping to a green zone"
              >
                <option value="none">-- Select Zone to Jump --</option>
                {INDIAN_ECO_GEOFENCES.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
            {activeGeofence && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(5, 255, 163, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>ACTIVE INSIDE ZONE</span>
                <h4 style={{ fontSize: '0.95rem', margin: '4px 0' }}>{activeGeofence.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activeGeofence.description}</p>
              </div>
            )}
          </div>

          {/* Landmarks directory */}
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Landmarks Coordinates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {INDIAN_ECO_GEOFENCES.map((zone) => {
                const distance = GeofenceService.calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  zone.latitude,
                  zone.longitude
                );
                return (
                  <div key={zone.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem' }}>{zone.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Type: {zone.type.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--secondary)' }}>
                        {(distance / 1000).toFixed(1)} km
                      </span>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>away</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Custom Dark map theme styling for sleek eco feel
const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0b0f14' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0f14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0f241d' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#161c24' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c3542' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1824' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }]
  }
];
