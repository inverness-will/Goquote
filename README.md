# Goquote

## Live web deployment (GitHub Pages)

This project auto-deploys the Expo web build to GitHub Pages from `main` using the workflow in `.github/workflows/deploy-web.yml`.

GitHub Pages URL:

- `https://inverness-will.github.io/Goquote/`

## Connecting frontend to backend

- **Local:** The app uses `http://localhost:4000` as the API base URL by default. Start the backend with `cd backend && npm run dev`, then run the frontend with `npm start` (e.g. `npm run web` for web).
- **Production:** Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL (e.g. your Render backend) so the frontend talks to the live API. For Expo/React Native, use a `.env` at the repo root with `EXPO_PUBLIC_API_BASE_URL=https://your-backend.onrender.com` and rebuild. On Render, set `CORS_ORIGIN` on the backend to your frontend origin (e.g. `https://inverness-will.github.io` for GitHub Pages) so the browser allows requests.

## Backend API (Express + TypeScript)

Backend code now lives in `backend/`.

- Setup and run instructions: `backend/README.md`
