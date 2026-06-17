# Deploying Vaultcube to Vercel

This project is built on TanStack Start (Vite + Nitro). It works on Vercel by
switching the Nitro build preset to `vercel`. The included `vercel.json` does
this automatically — you only need to set environment variables.

## 1. Import the repo into Vercel
- New Project → Import this Git repository.
- Framework Preset: **Other** (Vercel will pick up `vercel.json`).
- Build command, install command, and output directory are already set in
  `vercel.json` — don't override them.

## 2. Environment variables
Add these in Vercel → Project → Settings → Environment Variables (Production
+ Preview):

Client (must be prefixed `VITE_`, exposed to the browser):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server (used by server functions, never exposed to the browser):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`  ← required for admin/server features
- `SUPABASE_PROJECT_ID`

The current values for the Lovable Cloud backend are in `.env`. You can paste
the same values into Vercel, or point to a different Supabase project.

> `SUPABASE_SERVICE_ROLE_KEY` is not exposed by Lovable Cloud. If you want
> the admin/seed/role features to keep working on Vercel, either generate a
> service-role key from your own Supabase project, or move to a self-managed
> Supabase project where you control all keys.

## 3. Deploy
Push to your default branch (or click "Deploy"). Vercel will run
`NITRO_PRESET=vercel vite build` and serve the output in `.vercel/output`.

## 4. Auth redirect URLs
In Supabase → Authentication → URL Configuration, add your Vercel domain
(e.g. `https://your-app.vercel.app`) to **Site URL** and **Redirect URLs** so
sign-in/OAuth callbacks work in production.

## Notes
- Lovable preview/publish keeps using the Cloudflare preset — `vercel.json`
  is only read by Vercel, so both deploy targets coexist.
- The service worker (`public/sw.js`) only registers on the production host,
  so Vercel preview deployments won't cache aggressively.
