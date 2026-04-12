const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Convert a street address to { lat, lon } using OpenStreetMap Nominatim.
 * Free, no API key required. Rate limit: 1 req/sec (fine for our use case).
 * @param {string} address
 * @returns {Promise<{ lat: number, lon: number }>}
 */
async function geocodeAddress(address) {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'GoQuotes/1.0' }, // Nominatim requires a User-Agent
  });

  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status}): ${await res.text()}`);
  }

  const results = await res.json();

  if (!results.length) {
    throw new Error(`No geocoding results for: "${address}"`);
  }

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
  };
}

export { geocodeAddress };
