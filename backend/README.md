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
- **Email verification & password reset:** When `RESEND_API_KEY` is set, the backend sends verification and password-reset emails via [Resend](https://resend.com). In development, if the key is not set, the API still returns `debugOtpCode` in the response so you can test without email.
- Before production: add rate limiting and brute-force protection.

## Email (Resend)

To send verification and password-reset emails:

1. Sign up at [resend.com](https://resend.com) and create an API key.
2. Add to `.env`: `RESEND_API_KEY=re_xxxxxxxxxxxx`
3. Optionally set `EMAIL_FROM` (default: `GoQuote <onboarding@resend.dev>`). For production, [verify your domain](https://resend.com/domains) and use an address like `noreply@yourdomain.com`.

## Prisma + Database

- Schema: `prisma/schema.prisma`
- Create and apply local migration:
  - `npm run prisma:migrate -- --name init`
- For production deploy migrations:
  - `npm run prisma:deploy`

## Render Deploy

### 1. Create a PostgreSQL database on Render

- In the Render dashboard: **New** → **PostgreSQL**.
- Create the database (e.g. name `goquote-db`).
- After it’s created, open the database and copy the **Internal Database URL** (use this for services in the same Render account).

### 2. Create a Web Service for the backend

- **New** → **Web Service**, connect this repo.
- **Root Directory:** `backend`
- **Build Command:** `npm run render-build`  
  (This runs `npm install`, `npm run build`, and `prisma migrate deploy` so the DB schema is applied.)
- **Start Command:** `npm run start`
- **Environment variables** (use Render’s “Environment” tab):

| Key            | Value / notes |
|----------------|----------------|
| `PORT`         | `4000` (or leave blank; Render sets this) |
| `NODE_ENV`     | `production` |
| `JWT_SECRET`   | A long random string (e.g. from `openssl rand -hex 32`) |
| `DATABASE_URL` | The **Internal Database URL** from your Render PostgreSQL instance |
| `CORS_ORIGIN`  | Your frontend origin(s), e.g. `https://goquote.cloud,https://www.goquote.cloud` |
| `RESEND_API_KEY` | Your Resend API key (optional; for emails) |
| `EMAIL_FROM`   | e.g. `GoQuote <info@goquote.cloud>` (optional) |

After the first deploy, the database will have all tables from your Prisma migrations. For future deploys, `render-build` will run new migrations automatically.
