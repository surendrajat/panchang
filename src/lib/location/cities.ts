// Bundled city list. Phase 1 ships a small, hand-picked seed covering
// India's major metros plus a sample diaspora set. The full
// GeoNames cities500 list (~10K entries) is wired through scripts/
// build-cities.ts in Phase 2 — see ARCHITECTURE.md §14 (Open Decisions).
//
// Sources: Wikipedia "List of cities in India by population" + GeoNames
// for IANA timezones. Coordinates are decimal degrees (lat, lng), name
// matches the most common English spelling, altitude is approximate.

import type { Location } from '$lib/panchanga';

export interface City extends Location {
  name: string;
  country: string;
  // Lowercased name for search; recomputed eagerly.
  searchKey: string;
}

function city(
  name: string,
  country: string,
  latitude: number,
  longitude: number,
  altitude: number,
  timezone: string,
): City {
  return {
    name: `${name}, ${country}`,
    country,
    latitude,
    longitude,
    altitude,
    timezone,
    searchKey: `${name} ${country}`.toLowerCase(),
  };
}

export const CITIES: readonly City[] = [
  // India — major metros
  city('Bengaluru', 'India', 12.9716, 77.5946, 920, 'Asia/Kolkata'),
  city('Mumbai', 'India', 19.076, 72.8777, 14, 'Asia/Kolkata'),
  city('New Delhi', 'India', 28.6139, 77.209, 216, 'Asia/Kolkata'),
  city('Chennai', 'India', 13.0827, 80.2707, 6, 'Asia/Kolkata'),
  city('Kolkata', 'India', 22.5726, 88.3639, 9, 'Asia/Kolkata'),
  city('Hyderabad', 'India', 17.385, 78.4867, 542, 'Asia/Kolkata'),
  city('Ahmedabad', 'India', 23.0225, 72.5714, 53, 'Asia/Kolkata'),
  city('Pune', 'India', 18.5204, 73.8567, 560, 'Asia/Kolkata'),
  city('Jaipur', 'India', 26.9124, 75.7873, 431, 'Asia/Kolkata'),
  city('Lucknow', 'India', 26.8467, 80.9462, 123, 'Asia/Kolkata'),
  city('Surat', 'India', 21.1702, 72.8311, 13, 'Asia/Kolkata'),
  city('Kanpur', 'India', 26.4499, 80.3319, 126, 'Asia/Kolkata'),
  city('Nagpur', 'India', 21.1458, 79.0882, 310, 'Asia/Kolkata'),
  city('Indore', 'India', 22.7196, 75.8577, 553, 'Asia/Kolkata'),
  city('Bhopal', 'India', 23.2599, 77.4126, 527, 'Asia/Kolkata'),
  city('Patna', 'India', 25.5941, 85.1376, 53, 'Asia/Kolkata'),
  city('Visakhapatnam', 'India', 17.6868, 83.2185, 45, 'Asia/Kolkata'),
  city('Ludhiana', 'India', 30.901, 75.8573, 244, 'Asia/Kolkata'),
  city('Agra', 'India', 27.1767, 78.0081, 171, 'Asia/Kolkata'),
  city('Nashik', 'India', 19.9975, 73.7898, 565, 'Asia/Kolkata'),
  city('Varanasi', 'India', 25.3176, 82.9739, 80, 'Asia/Kolkata'),
  city('Coimbatore', 'India', 11.0168, 76.9558, 411, 'Asia/Kolkata'),
  city('Madurai', 'India', 9.9252, 78.1198, 101, 'Asia/Kolkata'),
  city('Vijayawada', 'India', 16.5062, 80.648, 23, 'Asia/Kolkata'),
  city('Vadodara', 'India', 22.3072, 73.1812, 39, 'Asia/Kolkata'),
  city('Tirupati', 'India', 13.6288, 79.4192, 153, 'Asia/Kolkata'),
  city('Thiruvananthapuram', 'India', 8.5241, 76.9366, 10, 'Asia/Kolkata'),
  city('Kochi', 'India', 9.9312, 76.2673, 7, 'Asia/Kolkata'),
  city('Mysore', 'India', 12.2958, 76.6394, 763, 'Asia/Kolkata'),
  city('Mangalore', 'India', 12.9141, 74.856, 22, 'Asia/Kolkata'),
  city('Amritsar', 'India', 31.634, 74.8723, 234, 'Asia/Kolkata'),
  city('Chandigarh', 'India', 30.7333, 76.7794, 321, 'Asia/Kolkata'),
  city('Dehradun', 'India', 30.3165, 78.0322, 640, 'Asia/Kolkata'),
  city('Haridwar', 'India', 29.9457, 78.1642, 314, 'Asia/Kolkata'),
  city('Rishikesh', 'India', 30.0869, 78.2676, 372, 'Asia/Kolkata'),
  city('Bhubaneswar', 'India', 20.2961, 85.8245, 45, 'Asia/Kolkata'),
  city('Puri', 'India', 19.8135, 85.8312, 5, 'Asia/Kolkata'),
  city('Guwahati', 'India', 26.1445, 91.7362, 55, 'Asia/Kolkata'),
  city('Imphal', 'India', 24.817, 93.9368, 786, 'Asia/Kolkata'),
  city('Shillong', 'India', 25.5788, 91.8933, 1525, 'Asia/Kolkata'),
  city('Gangtok', 'India', 27.3389, 88.6065, 1650, 'Asia/Kolkata'),
  city('Srinagar', 'India', 34.0837, 74.7973, 1585, 'Asia/Kolkata'),
  city('Jammu', 'India', 32.7266, 74.857, 327, 'Asia/Kolkata'),

  // Diaspora / South Asia neighbours
  city('Kathmandu', 'Nepal', 27.7172, 85.324, 1400, 'Asia/Kathmandu'),
  city('Colombo', 'Sri Lanka', 6.9271, 79.8612, 7, 'Asia/Colombo'),
  city('Dhaka', 'Bangladesh', 23.8103, 90.4125, 4, 'Asia/Dhaka'),
  city('Karachi', 'Pakistan', 24.8607, 67.0011, 8, 'Asia/Karachi'),
  city('Dubai', 'UAE', 25.2048, 55.2708, 2, 'Asia/Dubai'),

  // Diaspora — common destinations
  city('London', 'UK', 51.5074, -0.1278, 25, 'Europe/London'),
  city('New York', 'USA', 40.7128, -74.006, 10, 'America/New_York'),
  city('Toronto', 'Canada', 43.6532, -79.3832, 76, 'America/Toronto'),
  city('San Francisco', 'USA', 37.7749, -122.4194, 16, 'America/Los_Angeles'),
  city('Seattle', 'USA', 47.6062, -122.3321, 56, 'America/Los_Angeles'),
  city('Chicago', 'USA', 41.8781, -87.6298, 181, 'America/Chicago'),
  city('Houston', 'USA', 29.7604, -95.3698, 13, 'America/Chicago'),
  city('Dallas', 'USA', 32.7767, -96.797, 131, 'America/Chicago'),
  city('Atlanta', 'USA', 33.749, -84.388, 320, 'America/New_York'),
  city('Boston', 'USA', 42.3601, -71.0589, 43, 'America/New_York'),
  city('Los Angeles', 'USA', 34.0522, -118.2437, 71, 'America/Los_Angeles'),
  city('Washington', 'USA', 38.9072, -77.0369, 0, 'America/New_York'),
  city('Edison', 'USA', 40.5187, -74.4121, 25, 'America/New_York'),
  city('Vancouver', 'Canada', 49.2827, -123.1207, 70, 'America/Vancouver'),
  city('Sydney', 'Australia', -33.8688, 151.2093, 58, 'Australia/Sydney'),
  city('Melbourne', 'Australia', -37.8136, 144.9631, 31, 'Australia/Melbourne'),
  city('Singapore', 'Singapore', 1.3521, 103.8198, 15, 'Asia/Singapore'),
  city('Hong Kong', 'Hong Kong', 22.3193, 114.1694, 30, 'Asia/Hong_Kong'),
  city('Tokyo', 'Japan', 35.6762, 139.6503, 40, 'Asia/Tokyo'),
  city('Doha', 'Qatar', 25.2854, 51.531, 10, 'Asia/Qatar'),
  city('Frankfurt', 'Germany', 50.1109, 8.6821, 112, 'Europe/Berlin'),
  city('Paris', 'France', 48.8566, 2.3522, 35, 'Europe/Paris'),
  // Southeast Asia + nearby — significant Hindu populations:
  // Indonesia (Bali ~85% Hindu), Malaysia (Tamil Hindu diaspora ~7%),
  // Thailand (Hindu minority + tourists), Philippines (Indian
  // expat community), Vietnam (Cham Hindu communities), Myanmar.
  city('Denpasar', 'Indonesia', -8.6705, 115.2126, 4, 'Asia/Makassar'),
  city('Jakarta', 'Indonesia', -6.2088, 106.8456, 8, 'Asia/Jakarta'),
  city('Kuala Lumpur', 'Malaysia', 3.139, 101.6869, 60, 'Asia/Kuala_Lumpur'),
  city('George Town', 'Malaysia', 5.4141, 100.3288, 5, 'Asia/Kuala_Lumpur'),
  city('Bangkok', 'Thailand', 13.7563, 100.5018, 2, 'Asia/Bangkok'),
  city('Manila', 'Philippines', 14.5995, 120.9842, 16, 'Asia/Manila'),
  city('Cebu', 'Philippines', 10.3157, 123.8854, 16, 'Asia/Manila'),
  city('Ho Chi Minh City', 'Vietnam', 10.8231, 106.6297, 19, 'Asia/Ho_Chi_Minh'),
  city('Yangon', 'Myanmar', 16.8409, 96.1735, 23, 'Asia/Yangon'),
  city('Phnom Penh', 'Cambodia', 11.5564, 104.9282, 12, 'Asia/Phnom_Penh'),
  // Other diaspora centres with prominent Hindu populations.
  city('Port Louis', 'Mauritius', -20.1609, 57.5012, 5, 'Indian/Mauritius'),
  city('Suva', 'Fiji', -18.1248, 178.4501, 6, 'Pacific/Fiji'),
  city('Durban', 'South Africa', -29.8587, 31.0218, 14, 'Africa/Johannesburg'),
  city('Port of Spain', 'Trinidad and Tobago', 10.6549, -61.5019, 12, 'America/Port_of_Spain'),
  city('Paramaribo', 'Suriname', 5.852, -55.2038, 3, 'America/Paramaribo'),
  city('Auckland', 'New Zealand', -36.8485, 174.7633, 30, 'Pacific/Auckland'),
];

// Naïve substring search, sorted by population-ish proxy (declaration order).
export function searchCities(query: string, limit = 12): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  return CITIES.filter((c) => c.searchKey.includes(q)).slice(0, limit);
}

// Find the closest city to a given lat/lon (used after geolocation).
// Returns both the city and the distance in km so callers can decide
// whether the match is close enough to use the city name.
export function nearestCityWithDistance(
  latitude: number,
  longitude: number,
): { city: City; distanceKm: number } {
  let best = CITIES[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of CITIES) {
    const d = haversine(latitude, longitude, c.latitude, c.longitude);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return { city: best, distanceKm: bestDist };
}

// Convenience wrapper (keeps the original one-value return for callers
// that only need the city object).
export function nearestCity(latitude: number, longitude: number): City {
  return nearestCityWithDistance(latitude, longitude).city;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
