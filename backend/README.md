# GoQuote Backend

Express + TypeScript backend for auth flows used by the frontend.

## Quick Start

1. Copy environment file:
   - `cp .env.example .env`
2. Set `JWT_SECRET` in `.env` to a strong value.
3. Set `DATABASE_URL` to your Postgres connection string.
4. Install dependencies:
   - `npm install`
5. Generate Prisma client:
   - `npm run prisma:generate`
6. Start dev server:
   - `npm run dev`

Default local URL: `http://localhost:4000`

## Endpoints

- `GET /health`
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-otp`
- `POST /api/auth/reset-password`

## Notes

- User and OTP data are persisted in PostgreSQL via Prisma.
- Responses include `debugOtpCode` on signup/forgot-password to speed up testing.
- Before production:
  - Send OTP emails through a provider (Resend).
  - Remove `debugOtpCode` from API responses.
  - Add rate limiting and brute-force protection.

## Prisma + Database

- Schema: `prisma/schema.prisma`
- Create and apply local migration:
  - `npm run prisma:migrate -- --name init`
- For production deploy migrations:
  - `npm run prisma:deploy`

## Render Deploy

- Create a new Web Service in Render from this repo.
- Set root directory to `backend`.
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Add environment variables from `.env.example`.
