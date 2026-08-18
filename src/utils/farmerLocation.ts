import { FarmerLocation } from '../types/farmer';

/**
 * Coordinate registry for major Indian agricultural districts and hubs
 */
const AGRI_DISTRICT_COORDS: Record<string, { lat: number; lng: number; state: string }> = {
  lakhimpur: { lat: 27.9468, lng: 80.7788, state: 'Uttar Pradesh' },
  'lakhimpur kheri': { lat: 27.9468, lng: 80.7788, state: 'Uttar Pradesh' },
  bareilly: { lat: 28.3670, lng: 79.4304, state: 'Uttar Pradesh' },
  varanasi: { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh' },
  gorakhpur: { lat: 26.7606, lng: 83.3732, state: 'Uttar Pradesh' },
  meerut: { lat: 28.9845, lng: 77.7064, state: 'Uttar Pradesh' },
  anand: { lat: 22.5645, lng: 72.9289, state: 'Gujarat' },
  mehsana: { lat: 23.5880, lng: 72.3693, state: 'Gujarat' },
  junagadh: { lat: 21.5222, lng: 70.4579, state: 'Gujarat' },
  banaskantha: { lat: 24.1724, lng: 72.4346, state: 'Gujarat' },
  kheda: { lat: 22.7533, lng: 72.6869, state: 'Gujarat' },
  surat: { lat: 21.1702, lng: 72.8311, state: 'Gujarat' },
  rajkot: { lat: 22.3039, lng: 70.8022, state: 'Gujarat' },
  ludhiana: { lat: 30.9010, lng: 75.8573, state: 'Punjab' },
  amritsar: { lat: 31.6340, lng: 74.8723, state: 'Punjab' },
  bhatinda: { lat: 30.2110, lng: 74.9455, state: 'Punjab' },
  karnal: { lat: 29.6857, lng: 76.9905, state: 'Haryana' },
  hisar: { lat: 29.1492, lng: 75.7217, state: 'Haryana' },
  nashik: { lat: 19.9975, lng: 73.7898, state: 'Maharashtra' },
  kolhapur: { lat: 16.7050, lng: 74.2433, state: 'Maharashtra' },
  nagpur: { lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  solapur: { lat: 17.6599, lng: 75.9064, state: 'Maharashtra' },
  indore: { lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
  bhopal: { lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh' },
  ujjain: { lat: 23.1765, lng: 75.7885, state: 'Madhya Pradesh' },
  patna: { lat: 25.5941, lng: 85.1376, state: 'Bihar' },
  muzaffarpur: { lat: 26.1209, lng: 85.3647, state: 'Bihar' },
  guntur: { lat: 16.3067, lng: 80.4365, state: 'Andhra Pradesh' },
  mandya: { lat: 12.5218, lng: 76.8951, state: 'Karnataka' },
  thanjavur: { lat: 10.7870, lng: 79.1378, state: 'Tamil Nadu' },
  jaipur: { lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  sri_ganganagar: { lat: 29.9038, lng: 73.8772, state: 'Rajasthan' },
  bardhaman: { lat: 23.2324, lng: 87.8615, state: 'West Bengal' },
  palakkad: { lat: 10.7867, lng: 76.6548, state: 'Kerala' },
};

/**
 * Resolves coordinates from village/district/state input
 */
export function resolveAgriCoordinates(
  districtOrCity: string,
  stateHint?: string
): { lat: number; lng: number; state: string } {
  const query = districtOrCity.trim().toLowerCase().replace(/\s+/g, ' ');

  if (AGRI_DISTRICT_COORDS[query]) {
    return AGRI_DISTRICT_COORDS[query]!;
  }

  // Check if any key is contained
  for (const [key, value] of Object.entries(AGRI_DISTRICT_COORDS)) {
    if (query.includes(key) || key.includes(query)) {
      return value;
    }
  }

  // Fallback to regional coordinates if state is provided
  if (stateHint) {
    const s = stateHint.toLowerCase();
    if (s.includes('uttar pradesh')) return { lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' };
    if (s.includes('punjab')) return { lat: 31.1471, lng: 75.3412, state: 'Punjab' };
    if (s.includes('haryana')) return { lat: 29.0588, lng: 76.0856, state: 'Haryana' };
    if (s.includes('maharashtra')) return { lat: 19.7515, lng: 75.7139, state: 'Maharashtra' };
    if (s.includes('madhya pradesh')) return { lat: 22.9734, lng: 78.6569, state: 'Madhya Pradesh' };
    if (s.includes('bihar')) return { lat: 25.0961, lng: 85.3131, state: 'Bihar' };
    if (s.includes('karnataka')) return { lat: 15.3173, lng: 75.7139, state: 'Karnataka' };
    if (s.includes('tamil nadu')) return { lat: 11.1271, lng: 78.6569, state: 'Tamil Nadu' };
    if (s.includes('rajasthan')) return { lat: 27.0238, lng: 74.2179, state: 'Rajasthan' };
    if (s.includes('west bengal')) return { lat: 22.9868, lng: 87.8550, state: 'West Bengal' };
    if (s.includes('kerala')) return { lat: 10.8505, lng: 76.2711, state: 'Kerala' };
  }

  // Default coordinate (Gujarat Agri Basin)
  return { lat: 22.5645, lng: 72.9289, state: stateHint || 'Gujarat' };
}

/**
 * Builds a structured FarmerLocation model
 */
export function createFarmerLocation(
  village: string,
  district: string,
  state: string,
  source: 'CURRENT_LOCATION' | 'MANUAL' | 'SAVED',
  customLat?: number,
  customLng?: number
): FarmerLocation {
  const resolved = resolveAgriCoordinates(district, state);
  const latitude = customLat !== undefined ? customLat : resolved.lat;
  const longitude = customLng !== undefined ? customLng : resolved.lng;

  return {
    city: district,
    village: village || district,
    district,
    state: state || resolved.state,
    country: 'India',
    latitude,
    longitude,
    formattedAddress: `${village ? `${village}, ` : ''}${district}, ${state || resolved.state}`,
    source,
  };
}
