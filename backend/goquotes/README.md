# Goquotes (embedded)

Travel API logic (flights, hotels, transfers) via Amadeus. This folder is part of the Goquote backend and is not a separate service.

**Environment:** Set in the backend root `.env`:

- `AMADEUS_API_KEY` – Amadeus API key
- `AMADEUS_API_SECRET` – Amadeus API secret
- `AMADEUS_BASE_URL` – optional; default `https://test.api.amadeus.com`, use `https://api.amadeus.com` for production

The backend imports `goquotes-server/api.js` and uses `getFlights`, `getHotels`, `getTransfers` for live pricing and the `/api/flights`, `/api/hotels`, `/api/transfers` routes.
