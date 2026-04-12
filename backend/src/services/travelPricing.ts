/**
 * Fetches live flight and hotel options from goquotes API.
 * Stores all returned flights (and hotels) in the DB so filters give useful results;
 * estimate default uses 2nd-cheapest. UI may show a subset (e.g. top 3) in summary.
 */

import type { getFlights, getHotels } from 'goquotes-server/api.js';

type GoquotesFlights = Awaited<ReturnType<typeof getFlights>>;
type GoquotesHotels = Awaited<ReturnType<typeof getHotels>>;

export type ProjectFlightInput = {
  airline: string;
  flightNumber: string;
  departureTime: string;
  duration: string;
  numberOfChanges: number;
  priceCents: number;
  sortOrder: number;
  returnDepartureTime?: string | null;
  returnDuration?: string | null;
};

export type ProjectHotelInput = {
  name: string;
  address: string;
  stars: number;
  priceCents: number;
  sortOrder: number;
  distanceKm?: number | null;
};

export type TravelPricingResult = {
  flights: ProjectFlightInput[];
  hotels: ProjectHotelInput[];
  /** 2nd cheapest flight total price (round-trip) in cents; null if < 2 offers */
  secondCheapestFlightCents: number | null;
  /** 2nd cheapest hotel total stay price in cents; null if < 2 offers */
  secondCheapestHotelCents: number | null;
};

function parsePriceToCents(value: string | number | undefined): number {
  if (value == null) return 0;
  const s = typeof value === 'string' ? value.trim() : String(value);
  const num = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return Math.round(num * 100);
}

/** Parse Amadeus flight offer into our DB shape. One row per offer (round-trip). */
function parseFlightOffer(
  offer: GoquotesFlights['flights'][number],
  dictionaries: GoquotesFlights['dictionaries'],
  sortOrder: number
): ProjectFlightInput {
  const price = (offer as { price?: { grandTotal?: string; total?: string; base?: string; currency?: string } }).price;
  // Use full price (grandTotal or total); prefer over base so we show $460 not $400 when base=400, total=460
  const totalPriceString = price?.grandTotal ?? price?.total ?? price?.base;
  const priceCents = parsePriceToCents(totalPriceString);

  const itineraries = (offer as { itineraries?: Array<{ duration?: string; segments?: Array<{ departure?: { at?: string }; carrierCode?: string; number?: string }> }> }).itineraries ?? [];
  const firstItin = itineraries[0];
  const returnItin = itineraries[1];
  const segments = firstItin?.segments ?? [];
  const firstSeg = segments[0];
  const returnSegments = returnItin?.segments ?? [];
  const returnFirstSeg = returnSegments[0];

  const departureAt = firstSeg?.departure?.at ?? '';
  const duration = firstItin?.duration ?? '';
  const returnDepartureAt = returnFirstSeg?.departure?.at ?? null;
  const returnDuration = returnItin?.duration ?? null;

  let totalChanges = 0;
  for (const it of itineraries) {
    const segs = it.segments?.length ?? 0;
    totalChanges += Math.max(0, segs - 1);
  }

  const carrierCode = firstSeg?.carrierCode ?? '';
  const number = firstSeg?.number ?? '';
  const carriersMap = (dictionaries as { carriers?: Record<string, string> })?.carriers;
  const airline = (carrierCode && carriersMap?.[carrierCode]) ?? carrierCode;

  return {
    airline,
    flightNumber: `${carrierCode}${number}`.trim() || '—',
    departureTime: departureAt,
    duration,
    numberOfChanges: totalChanges,
    priceCents,
    sortOrder,
    returnDepartureTime: returnDepartureAt ?? null,
    returnDuration: returnDuration ?? null
  };
}

/** Parse Amadeus hotel offer into our DB shape. */
function parseHotelOffer(
  hotelItem: GoquotesHotels['hotels'][number],
  sortOrder: number
): ProjectHotelInput {
  const hotel = (hotelItem as { hotel?: { name?: string; cityCode?: string; rating?: string; address?: { lines?: string[]; cityName?: string; postalCode?: string; countryCode?: string } } }).hotel;
  const offer = (hotelItem as { offers?: Array<{ price?: { total?: string } }> }).offers?.[0];
  const rawDistance = (hotelItem as { distanceFromAddressKm?: number | null | { value?: number } }).distanceFromAddressKm;
  // Amadeus may return distance as { value: number, unit: "KM" }; normalize to number
  const distanceKm =
    rawDistance == null
      ? null
      : typeof rawDistance === 'number'
        ? rawDistance
        : typeof (rawDistance as { value?: number })?.value === 'number'
          ? (rawDistance as { value: number }).value
          : null;

  const name = hotel?.name ?? 'Hotel';
  const rating = hotel?.rating != null ? parseInt(String(hotel.rating), 10) : 3;
  const stars = Math.min(5, Math.max(2, isNaN(rating) ? 3 : rating));

  const addressParts: string[] = [];
  const addr = hotel?.address;
  if (addr?.lines?.length) addressParts.push(addr.lines[0]);
  if (addr?.cityName) addressParts.push(addr.cityName);
  if (addr?.postalCode) addressParts.push(addr.postalCode);
  if (addr?.countryCode) addressParts.push(addr.countryCode);
  const address = addressParts.length ? addressParts.join(', ') : (hotel?.cityCode ?? name);

  const priceCents = parsePriceToCents(offer?.price?.total);

  return {
    name,
    address,
    stars,
    priceCents,
    sortOrder,
    distanceKm
  };
}

/**
 * Fetch flights and hotels from goquotes API; return all offers (by price order).
 * All are stored in the DB for filtering; 2nd-cheapest is used for the estimate default.
 */
export async function fetchTravelPricing(params: {
  originAirport: string;
  destinationAirport: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string;    // YYYY-MM-DD
  adults: number;
  jobSiteAddress: string;
  checkInDate: string;
  checkOutDate: string;
  hotelQuality?: number; // 2..5 for ratings filter
}): Promise<TravelPricingResult> {
  console.log('[TravelPricing] fetchTravelPricing called', {
    originAirport: params.originAirport,
    destinationAirport: params.destinationAirport,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
    adults: params.adults,
    jobSiteAddress: params.jobSiteAddress?.trim() || null
  });

  const goquotesApi = await import('goquotes-server/api.js');

  const flights: ProjectFlightInput[] = [];
  let secondCheapestFlightCents: number | null = null;

  const hotels: ProjectHotelInput[] = [];
  let secondCheapestHotelCents: number | null = null;

  if (params.originAirport?.trim() && params.destinationAirport?.trim()) {
    try {
      const baseParams = {
        origin: params.originAirport,
        destination: params.destinationAirport,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.adults,
        max: 50  // Amadeus allows up to 250; request more for carrier variety
      };

      // Call once without nonStop (mixed results) and once with nonStop=true so we include direct flights (e.g. JetBlue JFK–LAX)
      console.log('[TravelPricing] Calling getFlights (all)...');
      const [allResult, nonStopResult] = await Promise.all([
        goquotesApi.getFlights(baseParams),
        goquotesApi.getFlights({ ...baseParams, nonStop: 'true', max: 30 })
      ]);

      const allOffers = (allResult.flights as GoquotesFlights['flights']) ?? [];
      const nonStopOffers = (nonStopResult.flights as GoquotesFlights['flights']) ?? [];
      const seenIds = new Set<string>();
      const mergedOffers: GoquotesFlights['flights'] = [];
      for (const o of allOffers) {
        const id = (o as { id?: string }).id ?? '';
        if (id && seenIds.has(id)) continue;
        if (id) seenIds.add(id);
        mergedOffers.push(o);
      }
      for (const o of nonStopOffers) {
        const id = (o as { id?: string }).id ?? '';
        if (id && seenIds.has(id)) continue;
        if (id) seenIds.add(id);
        mergedOffers.push(o);
      }

      // Merge dictionaries (carriers) so we can resolve airline names from both responses
      const baseDict = (allResult.dictionaries ?? {}) as { carriers?: Record<string, string> };
      const nonStopDict = nonStopResult.dictionaries as { carriers?: Record<string, string> } | undefined;
      const dictionaries = {
        ...baseDict,
        carriers: { ...(baseDict.carriers ?? {}), ...(nonStopDict?.carriers ?? {}) }
      };

      const rawCount = mergedOffers.length;
      console.log('[TravelPricing] getFlights merged', allOffers.length, '+', nonStopOffers.length, '->', rawCount, 'offers');

      const sortedFlights = mergedOffers.slice().sort((a, b) => {
        const priceA = (a as { price?: { grandTotal?: string; total?: string } }).price;
        const priceB = (b as { price?: { grandTotal?: string; total?: string } }).price;
        const pa = parsePriceToCents(priceA?.grandTotal ?? priceA?.total);
        const pb = parsePriceToCents(priceB?.grandTotal ?? priceB?.total);
        return pa - pb;
      });

      sortedFlights.forEach((offer, i) => {
        flights.push(parseFlightOffer(offer, dictionaries, i));
      });
      if (sortedFlights.length >= 2) {
        secondCheapestFlightCents = parseFlightOffer(sortedFlights[1], dictionaries, 1).priceCents;
      }
      console.log('[TravelPricing] Parsed', flights.length, 'flights, secondCheapestFlightCents', secondCheapestFlightCents);
    } catch (e) {
      console.error('[TravelPricing] getFlights failed', e);
      // Leave flights empty and secondCheapestFlightCents null
    }
  } else {
    console.log('[TravelPricing] Skipping getFlights (missing origin or destination airport)');
  }

  if (params.jobSiteAddress?.trim()) {
    try {
      console.log('[TravelPricing] Calling getHotels...');
      // Do not pass ratings filter so we get all hotels near the address (like original goquotes).
      // Hotel star rating is still stored and shown per hotel; filtering by quality can be done in UI later if needed.
      const hotelResult = await goquotesApi.getHotels({
        address: params.jobSiteAddress.trim(),
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        adults: params.adults
      });

      const rawCount = (hotelResult.hotels as GoquotesHotels['hotels'])?.length ?? 0;
      console.log('[TravelPricing] getHotels returned', rawCount, 'hotels');

      const sortedHotels = (hotelResult.hotels as GoquotesHotels['hotels']).slice().sort((a, b) => {
        const offerA = (a as { offers?: Array<{ price?: { total?: string } }> }).offers?.[0];
        const offerB = (b as { offers?: Array<{ price?: { total?: string } }> }).offers?.[0];
        const pa = parsePriceToCents(offerA?.price?.total);
        const pb = parsePriceToCents(offerB?.price?.total);
        return pa - pb;
      });

      sortedHotels.forEach((h, i) => {
        hotels.push(parseHotelOffer(h, i));
      });
      if (sortedHotels.length >= 2) {
        secondCheapestHotelCents = parseHotelOffer(sortedHotels[1], 1).priceCents;
      } else if (sortedHotels.length === 1) {
        secondCheapestHotelCents = parseHotelOffer(sortedHotels[0], 0).priceCents;
      }
      console.log('[TravelPricing] Parsed', hotels.length, 'hotels, secondCheapestHotelCents', secondCheapestHotelCents);
    } catch (e) {
      console.error('[TravelPricing] getHotels failed', e);
      // Leave hotels empty
    }
  } else {
    console.log('[TravelPricing] Skipping getHotels (no jobSiteAddress)');
  }

  console.log('[TravelPricing] Returning', { flightsCount: flights.length, hotelsCount: hotels.length });
  return {
    flights,
    hotels,
    secondCheapestFlightCents,
    secondCheapestHotelCents
  };
}
