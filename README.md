# Lensbook

A small CRM for wedding photographers. A photographer keeps clients and projects,
sends the couple a private booking link, receives a typed signature, confirms the
deposit by hand and finally delivers an external gallery link.

Learning project for the FHNW KIP module. All demo data is fictional.

## What it does

- Sign up and log in with email and password (Supabase Auth).
- Clients and projects, each belonging to one photographer.
- Five project statuses, one step forward or back at a time:
  `Inquiry`, `Consultation`, `Retainer Paid`, `Awaiting Event`, `Gallery Delivered`.
- Service packages; a default set is created when a photographer signs up.
- A private booking page `/book/[token]` for the couple: package choice, names,
  location, typed signature and consent. No login.
- Manual deposit confirmation ("Deposit received" sets `Retainer Paid`).
- `Gallery Delivered` needs an external `https://` gallery link; the couple sees it
  on the booking page only in that status.

Out of scope: photo storage, kanban board, real payments.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Supabase cloud
(Postgres, Auth, Row Level Security). Tests: Vitest for logic, pgTAP for the database.
There is no Docker and no local Supabase: the database lives in a Supabase project
in the cloud, so you need your own project to run the app.

## Run it yourself

Requirements: Node.js 24 (the version CI uses) and a free Supabase account.

1. **Create a Supabase project** (a throwaway dev project is enough).
2. **Install the dependencies:** `npm ci`
3. **Environment:** copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Dashboard, Project Settings, API; use the anon / publishable key).
   Never use the `service_role` key anywhere in this project, and never commit `.env.local`.
4. **Create the schema:** log in and link the CLI to your project, then push the
   migrations in `supabase/migrations/`:
   ```
   npx supabase login
   npx supabase link --project-ref <your project ref>
   npx supabase db push --linked
   ```
   Do not use `db reset` (it would erase the database).
5. **Start:** `npm run dev`, open http://localhost:3000, sign up, create a project.

### Production build over plain http (local demo)

The Content Security Policy contains `upgrade-insecure-requests`, which makes a
browser request every asset over `https://`. A production build opened over plain
`http://` (for example a VM address) would then load without styles and scripts.
For such a local demo only, start it with:

```
npm run build
CSP_ALLOW_HTTP=1 npm start
```

Never set `CSP_ALLOW_HTTP` on a real host that serves https.

## Tests and checks

| Command | What it does |
| --- | --- |
| `npm test` | Vitest: validation, tokens, headers, CSP, status rules |
| `npm run typecheck` | TypeScript without emitting files |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

**Database tests (pgTAP).** `supabase test db` needs Docker, so the files in
`supabase/tests/` are run by hand: open the Supabase Dashboard, SQL Editor, paste one
file, choose "Run without RLS" (the file creates a temporary `results` table) and run
it. Every line must start with `ok`; a `not ok` line is a failure. The tests use
fictional photographers and roll back at the end, so no data stays behind.

**Dependency and secret scans** run in CI on every push (`.github/workflows/ci.yml`):
`npm audit`, OSV-Scanner (accepted findings with reason and expiry date are listed in
`osv-scanner.toml`) and gitleaks over the full git history. Dependabot is configured in
`.github/dependabot.yml`.

## Security design

- RLS is enabled on every table; policies check `photographer_id = auth.uid()` and use
  `with check` on writes. Related rows (client, package) must belong to the same photographer.
- The public booking page works only through the security definer functions
  `get_booking(token)` and `submit_booking(...)` with an empty `search_path`; the `anon`
  role has no table access.
- The booking token is 32 random bytes (base64url); only its SHA-256 hash is stored.
  Tokens, gallery links and personal data are kept out of logs and URL parameters.
- Gallery links are stored only if they start with `https://` and carry no credentials.
- Status changes go through a database trigger: one step forward or back, and
  `Gallery Delivered` requires a gallery link.
- Response headers: Content Security Policy with a per-request nonce
  (`proxy.ts`, `lib/security/csp.ts`), `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`. `/book/*` additionally sends `Referrer-Policy: no-referrer`,
  `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.

## Project layout

```
app/            pages and server actions (login, signup, dashboard, projects, packages, book)
components/     shared UI
lib/            validation (zod), tokens, security headers and CSP, Supabase clients
proxy.ts        session refresh, access rules, CSP nonce
supabase/       migrations/ (schema, RLS, functions) and tests/ (pgTAP)
docs/           plan.md (step plan) and protocol.md (development log)
```
