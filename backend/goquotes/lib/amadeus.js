const BASE_URL = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
const API_KEY = process.env.AMADEUS_API_KEY;
const API_SECRET = process.env.AMADEUS_API_SECRET;

let token = null;
let tokenExpiresAt = 0;

async function authenticate() {
  if (token && Date.now() < tokenExpiresAt) {
    console.log('[Amadeus] Using cached token');
    return token;
  }

  console.log('[Amadeus] POST /v1/security/oauth2/token (requesting new token)');
  console.log('using the following API_KEY', API_KEY);
  const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: API_KEY,
      client_secret: API_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[Amadeus] Auth failed:', res.status, body);
    throw new Error(`Amadeus auth failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  token = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  console.log('[Amadeus] Token received, expires in', data.expires_in, 's');
  return token;
}

/**
 * Make an authenticated GET request to the Amadeus API.
 * @param {string} path - e.g. '/v2/shopping/flight-offers'
 * @param {Record<string, string>} params - query parameters
 */
async function amadeusGet(path, params = {}) {
  const accessToken = await authenticate();
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}${qs ? '?' + qs : ''}`;

  console.log('[Amadeus] GET', path, 'params:', JSON.stringify(params));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[Amadeus] GET', path, 'failed:', res.status, body.slice(0, 200));
    throw new Error(`Amadeus GET ${path} failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const count = data.data?.length ?? (Array.isArray(data) ? data.length : null);
  console.log('[Amadeus] GET', path, 'OK', res.status, count != null ? `(${count} result(s))` : '');
  if (count === 0 || count == null) {
    const keys = data && typeof data === 'object' ? Object.keys(data) : [];
    console.log('[Amadeus] GET', path, 'response keys:', keys.join(', '));
    if (data.data !== undefined) console.log('[Amadeus] GET', path, 'data.length =', data.data?.length);
  }
  return data;
}

/**
 * Make an authenticated POST request to the Amadeus API.
 * @param {string} path
 * @param {object} body - JSON body
 */
async function amadeusPost(path, body) {
  const accessToken = await authenticate();
  const url = `${BASE_URL}${path}`;

  console.log('[Amadeus] POST', path, 'body:', JSON.stringify(body).slice(0, 200));
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Amadeus] POST', path, 'failed:', res.status, text.slice(0, 200));
    throw new Error(`Amadeus POST ${path} failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const count = data.data?.length ?? (Array.isArray(data) ? data.length : null);
  console.log('[Amadeus] POST', path, 'OK', res.status, count != null ? `(${count} result(s))` : '');
  return data;
}

module.exports = { amadeusGet, amadeusPost };
