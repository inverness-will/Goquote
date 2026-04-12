declare module 'goquotes-server/api.js' {
  /** Query string params; booleans are stringified by goquotes (e.g. nonStop). */
  type Query = Record<string, string | number | boolean | undefined>;

  export function getFlights(query: Query): Promise<{
    count: number;
    flights: object[];
    dictionaries: object;
  }>;

  export function getHotels(query: Query): Promise<{
    count: number;
    hotels: object[];
    geocode?: { lat: number; lon: number };
  }>;

  export function getTransfers(query: Query): Promise<{
    count: number;
    transfers: object[];
  }>;
}
