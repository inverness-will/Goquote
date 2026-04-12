/**
 * Shared API layer: callable logic for flights, hotels, transfers.
 * Used by the Goquote backend when importing directly.
 * Query objects can come from Express (req.query) or Fastify (request.query).
 */

import { amadeusGet, amadeusPost } from './lib/amadeus.js';
import { geocodeAddress } from './lib/geocode.js';

/**
 * @param {Record<string, string|number|undefined>} query
 * @returns {Promise<{ count: number, flights: object[], dictionaries: object }>}
 */
async function getFlights(query) {
  const {
    origin, destination, departureDate, returnDate,
    adults = 1, travelClass, nonStop, currencyCode, max = 10,
  } = query;

  const params = {
    originLocationCode: String(origin).toUpperCase(),
    destinationLocationCode: String(destination).toUpperCase(),
    departureDate: String(departureDate),
    adults: String(adults),
    max: String(max),
  };

  if (returnDate) params.returnDate = String(returnDate);
  if (travelClass) params.travelClass = String(travelClass);
  if (nonStop !== undefined) params.nonStop = String(nonStop);
  if (currencyCode) params.currencyCode = String(currencyCode).toUpperCase();

  const data = await amadeusGet('/v2/shopping/flight-offers', params);

  return {
    count: data.data?.length ?? 0,
    flights: data.data ?? [],
    dictionaries: data.dictionaries ?? {},
  };
}

/**
 * @param {Record<string, string|number|undefined>} query
 * @returns {Promise<{ count: number, hotels: object[], geocode?: { lat: number, lon: number } }>}
 */
async function getHotels(query) {
  const {
    address, latitude, longitude, checkInDate, checkOutDate,
    adults = 1, radius = 250, ratings, currencyCode,
  } = query;

  let lat, lon;
  const latNum = latitude != null && latitude !== '' ? parseFloat(latitude) : NaN;
  const lonNum = longitude != null && longitude !== '' ? parseFloat(longitude) : NaN;

  if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
    lat = latNum;
    lon = lonNum;
  } else if (address) {
    const geocoded = await geocodeAddress(String(address));
    lat = geocoded.lat;
    lon = geocoded.lon;
  } else {
    throw Object.assign(new Error('Provide either address or latitude+longitude'), { statusCode: 400 });
  }

  const hotelListParams = {
    latitude: String(lat),
    longitude: String(lon),
    radius: String(radius),
    radiusUnit: 'KM',
  };
  if (ratings) hotelListParams.ratings = String(ratings);

  const hotelListData = await amadeusGet(
    '/v1/reference-data/locations/hotels/by-geocode',
    hotelListParams,
  );

  let hotels = hotelListData.data ?? [];
  if (!hotels.length) {
    return { count: 0, hotels: [], geocode: { lat, lon } };
  }

  // Amadeus by-geocode may return distance as { value: number, unit: "KM" } or a number
  const toKmNumber = (d) => {
    if (d == null) return null;
    if (typeof d === 'number' && !Number.isNaN(d)) return d;
    if (typeof d === 'object' && d != null && typeof d.value === 'number') return d.value;
    return null;
  };
  hotels = hotels.slice().sort((a, b) => (toKmNumber(a.distance) ?? Infinity) - (toKmNumber(b.distance) ?? Infinity));

  const topHotels = hotels.slice(0, 50);
  const distanceByHotelId = new Map(topHotels.map((h) => [h.hotelId, toKmNumber(h.distance)]));
  const hotelIds = topHotels.map((h) => h.hotelId).join(',');

  const offerParams = {
    hotelIds,
    checkInDate: String(checkInDate),
    checkOutDate: String(checkOutDate),
    adults: String(adults),
  };
  if (currencyCode) offerParams.currency = String(currencyCode).toUpperCase();

  const offersData = await amadeusGet('/v3/shopping/hotel-offers', offerParams);

  // Amadeus v3 may return array under .data or elsewhere
  let offers = Array.isArray(offersData.data) ? offersData.data : [];
  if (offers.length === 0 && offersData.offers && Array.isArray(offersData.offers)) {
    offers = offersData.offers;
    console.log('[goquotes api] hotel-offers: used offersData.offers, length =', offers.length);
  }
  if (offers.length === 0 && hotelListData.data?.length > 0) {
    console.log('[goquotes api] hotel-offers returned 0 offers (requested', hotelIds.split(',').length, 'hotelIds). Test sandbox often has no availability for future dates.');
  }
  offers.sort((a, b) => {
    const distA = distanceByHotelId.get(a.hotel?.hotelId) ?? Infinity;
    const distB = distanceByHotelId.get(b.hotel?.hotelId) ?? Infinity;
    return (distA ?? Infinity) - (distB ?? Infinity);
  });

  // Attach distance from job site (km) as a number for display
  const hotelsWithDistance = offers.map((o) => {
    const km = distanceByHotelId.get(o.hotel?.hotelId) ?? null;
    return { ...o, distanceFromAddressKm: km != null ? km : null };
  });

  return {
    count: hotelsWithDistance.length,
    hotels: hotelsWithDistance,
    geocode: { lat, lon },
  };
}

/**
 * @param {Record<string, string|number|undefined>} query
 * @returns {Promise<{ count: number, transfers: object[] }>}
 */
async function getTransfers(query) {
  const {
    airportCode, startDateTime, transferType = 'PRIVATE',
    passengers = 1, endAddress, endCityName, endCountryCode,
  } = query;

  const body = {
    startLocationCode: String(airportCode).toUpperCase(),
    startDateTime: String(startDateTime),
    transferType: String(transferType),
    passengers: Number(passengers),
  };

  if (endAddress) body.endAddressLine = String(endAddress);
  if (endCityName) body.endCityName = String(endCityName);
  if (endCountryCode) body.endCountryCode = String(endCountryCode).toUpperCase();

  const data = await amadeusPost('/v1/shopping/transfer-offers', body);

  return {
    count: data.data?.length ?? 0,
    transfers: data.data ?? [],
  };
}

export { getFlights, getHotels, getTransfers };
