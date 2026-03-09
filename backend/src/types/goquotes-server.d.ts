declare module 'goquotes-server/api.js' {
  type Query = Record<string, string | number | undefined>;

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
