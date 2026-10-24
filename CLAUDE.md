# KIP project: CRM for wedding photographers

Learning project (FHNW KIP module). The owner must understand and be able to
explain every line orally, so work in small steps.

## Stack
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui.
Supabase cloud DEV project (Postgres + Auth + RLS). No Docker, no local Supabase.
Tests: pgTAP (`npx supabase test db --linked`) for RLS, Vitest for logic.

## Working rules
- Always start in plan mode: describe the step, expected result and tests, then wait for approval.
- Write the test first for RLS, status transitions and tokens.
- One module or function per step. Never generate large amounts of code at once.
- Explain non-trivial code when asked; do not refactor unrelated code.
- Do not install any new package without asking me first. State the exact name,
  author, last update and whether it has install scripts.
- Never read, print or write real secrets. Never touch .env.local.
- Use only fictional client data.
- Never run destructive DB commands (db reset, deleting projects).

## Security rules (agreed with the lecturer)
- RLS enabled on EVERY table, before any data is inserted.
- Policies: photographer_id = auth.uid(); `with check` on writes.
- Related rows (client_id, package_id) must belong to the same photographer.
- No service_role key anywhere. Only URL and anon/publishable key.
- Public booking access only via security definer functions get_booking(token)
  and submit_booking(...) with empty search_path; anon has no table access.
- Token: 32 random bytes (base64url), only the SHA-256 hash is stored.
- Tokens, gallery links and personal data never appear in logs or URL params.
- Gallery URL must be https:// only.
- Project status is an enum with 5 values; the DB trigger allows one step
  forward or back; Gallery Delivered requires gallery_url.

## Scope (Must)
1 data protection + RLS tests, 2 dependency scanning, 3 multi-tenant schema,
4 auth (email + password), 5 projects with 5 statuses driven by event_date,
6 service packages + seed on signup, 7 booking flow /book/[token] with typed signature,
8 manual deposit confirmation (Retainer Paid), 9 Gallery Delivered with external link.
Out of scope: photo storage, kanban, real payments.

## Statuses
Inquiry, Consultation, Retainer Paid, Awaiting Event, Gallery Delivered
