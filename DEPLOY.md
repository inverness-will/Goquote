# Deploying GoQuote

## Backend on Render (database)

1. **Create a PostgreSQL database on Render**
   - Dashboard → **New** → **PostgreSQL**
   - Create the DB, then copy its **Internal Database URL**

2. **Create a Web Service for the API**
   - **New** → **Web Service** → connect this repo
   - **Root Directory:** `backend`
   - **Build Command:** `npm run render-build`  
     This installs deps, builds TypeScript, and runs **`prisma migrate deploy`** so your schema is applied to the Render Postgres DB.
   - **Start Command:** `npm run start`
   - In **Environment**, set at least:
     - `DATABASE_URL` = the Internal Database URL from step 1
     - `JWT_SECRET` = a long random secret (e.g. `openssl rand -hex 32`)
     - `CORS_ORIGIN` = your frontend URL(s), e.g. `https://goquote.cloud,https://www.goquote.cloud`
     - `NODE_ENV` = `production`
   - Optional: `RESEND_API_KEY`, `EMAIL_FROM` for emails

Full details: **backend/README.md** (Render Deploy section).

---

## Frontend (static build and favicon)

The web build already generates and wires up the favicon:

- **Build command:** `npm run build:web`
- This script:
  1. Generates `favicon.ico` (and PNG) from `assets/favicon.svg` into `public/`
  2. Runs `expo export --platform web --output-dir dist`
  3. Copies `public/*` into `dist/` so the favicon is served
  4. Injects `<link rel="icon" href="/favicon.ico" />` into `dist/index.html`

So for **GitHub Pages**, **Render Static Site**, or any host that serves the `dist` folder:

- Use **Build command:** `npm run build:web`
- Use **Publish directory:** `dist`
- Set **EXPO_PUBLIC_API_BASE_URL** in the build environment to your backend URL (e.g. `https://your-app.onrender.com`)

No extra step is needed for the favicon as long as you use `npm run build:web` and deploy the contents of `dist/`.
