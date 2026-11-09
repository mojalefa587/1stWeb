# 1stWeb

A Next.js viewer rewards dashboard with Kick and Discord sign-in, daily check-ins, streak bonuses, Solana payout addresses, and a monthly points raffle.

## Run locally

1. Install Node.js, then run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the values described below.
3. Apply the database migration in `supabase/migrations/20261109000000_viewer_rewards.sql` using the Supabase SQL Editor.
4. Run `npm run dev` and open <http://localhost:3000>.

The production build is `npm run build`.

## Supabase

Create a Supabase project. Set `NEXT_PUBLIC_SUPABASE_URL` to its project URL and `SUPABASE_SERVICE_ROLE_KEY` to its **service_role** key. The service-role key is server-only: never add it to a `NEXT_PUBLIC_` variable, browser code, GitHub, or a message.

Run the SQL migration once in the Supabase SQL Editor. It creates the profile, check-in, point ledger, raffle, and raffle-entry tables, enables row-level security, and adds transaction-safe database functions for check-ins, entries, and draws.

## Discord sign-in

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add this OAuth2 redirect URL:
   - Local: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://YOUR-VERCEL-DOMAIN/api/auth/callback/discord`
3. Copy the application ID to `AUTH_DISCORD_ID` and the OAuth2 client secret to `AUTH_DISCORD_SECRET`.

## Kick sign-in

1. Sign in to Kick, enable two-factor authentication, and open **Account Settings → Developer**.
2. Create a Kick app with the redirect URL:
   - Local: `http://localhost:3000/api/auth/callback/kick`
   - Production: `https://YOUR-VERCEL-DOMAIN/api/auth/callback/kick`
3. Request only the `user:read` scope. The app uses it to verify the Kick account and read its public profile.
4. Copy the Kick Client ID to `AUTH_KICK_ID` and Client Secret to `AUTH_KICK_SECRET`.

Kick requires PKCE for authorization. If its developer portal will not accept a localhost redirect, configure the production Vercel URL first and test the flow there.

## Environment variables

Generate `AUTH_SECRET` locally with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set the same environment variables in `.env.local` for local development and in **Vercel → Project → Settings → Environment Variables** for Preview and Production deployments:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Signs and encrypts the Auth.js session |
| `AUTH_URL` | Full site URL, e.g. `http://localhost:3000` or your Vercel domain |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord OAuth app credentials |
| `AUTH_KICK_ID` / `AUTH_KICK_SECRET` | Kick OAuth app credentials |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server-side Supabase key |
| `RAFFLE_ADMIN_ID` | Owner account ID, for example `kick:123456` |

To find your owner ID, sign in once and look for your `user_id` in the Supabase `profiles` table. Set `RAFFLE_ADMIN_ID` to that exact value, then redeploy. Only that account can trigger a draw.

Keep `.env.local` and all secrets out of GitHub. `.gitignore` excludes local environment files; `.env.example` contains placeholders only.

## Discord callback troubleshooting

The Discord provider returns the authorization-response issuer `https://discord.com`. The app configures this issuer explicitly so Auth.js validates Discord's `iss` response parameter against Discord rather than Auth.js's fallback issuer. If Vercel logs an `unexpected "iss" (issuer) response parameter value` error, deploy the latest commit and retry Discord sign-in.

## Rewards rules

- Check-in days roll over at **00:30 UTC+2**. A check-in awards 10 points.
- Every 7 consecutive check-ins awards an additional 60 points.
- A raffle entry costs 40 points. Each entry is one chance; viewers may enter multiple times if they have enough points.
- Entries close at the end of the calendar month in fixed UTC+2. The configured owner can draw one winner after closing.
- A viewer must save a valid Solana address before entering. The site records the winning entry and wallet; the streamer sends prizes manually. The site never asks for wallet private keys or seed phrases and does not send cryptocurrency.

Kick and Discord sign-ins currently create separate viewer accounts. Viewers should keep using the same provider to retain the same points and entries.
