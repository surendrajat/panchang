// Thin Promise wrapper over the browser Geolocation API.
// No fallback to IP lookup or third-party services (we're offline-first).

export interface GeolocatedPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracyMeters: number;
}

export function requestGeolocation(timeoutMs = 10_000): Promise<GeolocatedPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not available in this environment.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracyMeters: pos.coords.accuracy,
        }),
      (err) => reject(new Error(err.message || 'Geolocation failed.')),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60_000 },
    );
  });
}
