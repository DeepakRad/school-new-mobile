# Backend Deployment

This folder contains the shared backend logic for the Expo mobile app.
The actual Vercel serverless entrypoints live in the repo root `api/` directory so they can reuse the existing root Prisma schema.

## Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/home`
- `GET /api/attendance`
- `GET /api/calendar`
- `GET /api/academics`
- `GET /api/notifications`
- `POST /api/notifications/mark-read`
- `GET /api/notifications/unread-count`
- `GET /api/profile`
- `GET /api/fees`

## Environment Variables

Set these in Vercel project settings:

- `DATABASE_URL`
- `DIRECT_URL`
- `MOBILE_JWT_SECRET`

## Deploy

1. Create a Vercel project with the repository root as the root directory.
2. Add the environment variables above.
3. Deploy from the repository root with `npx vercel --prod`.
4. Set the mobile app `EXPO_PUBLIC_API_BASE_URL` to the deployed backend URL.

## Local Dev

```bash
npm install
npx prisma generate
npm run dev
```
