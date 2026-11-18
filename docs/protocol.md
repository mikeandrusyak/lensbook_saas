# Protocol

## Template (one entry per step)
- **Scenario and requirements:** which axes (complexity, know-how, security, liability) matter and why
- **Prompts:** what I asked the agent, in which mode, which context
- **What the agent did:** short, no code
- **What I fixed or rejected:** and why
- **Security:** what I verified
- **Requirement changes:** what changed and where it is recorded

---

## Step 1.1: Next.js scaffold

- **Scenario and requirements:** Security (supply chain): every new package is a trust decision. Know-how: I must be able to explain every config file.
- **Prompts:** Plan mode; asked for a plan with exact commands, files and every package (name, purpose); then approved with changes.
- **What the agent did:** Dropped create-next-app (non-empty dir with package.json), scaffolds by hand; verified packages via npm view; installed deps; wrote .gitignore, tsconfig.json.
- **What I fixed or rejected:**
  - Agent suggested TypeScript 7.0.2 (published that day, Next support unverified): I required 5.x.
  - I demanded a peer-dependency check; agent found likely conflict eslint 10 vs eslint-config-next (inferred from declared ranges) and switched to eslint 9 without --force. The real install then showed no ERESOLVE.
  - Agent claimed unrs-resolver's postinstall was not run; on my question it admitted it could not prove this (evidence: npm notice, ignore-scripts=false). Script is harmless (checks native binding).
- **Security:** npm audit 0 vulnerabilities; only unrs-resolver has an install script; OSV-Scanner baseline in docs/scan-baseline.md; telemetry disabled.
- **Requirement changes:** None.

---

## Step 1.2: Vitest, `typecheck` and `test` scripts

- **Scenario and requirements:** Security (supply chain): Vitest pulls in Vite and about 25 transitive packages. Know-how: new tool; later it carries the logic tests (statuses, tokens).
- **Prompts:** Plan mode; asked for a plan; agent gave package facts first (name, author, update date, install scripts, peers); approved with "go".
- **What the agent did:** Checked the registry and ran an `npm install --dry-run` before installing; installed `vitest@5.0.5` and `vite@^7`; confirmed `npm run test` failed with the old stub; added `vitest.config.ts` and `lib/sanity.test.ts`; set the `test` and `typecheck` scripts.
- **What I fixed or rejected:** Pinned Vite to 7 instead of the 8.3.5 npm would pick (released 7 days earlier, same reasoning as TypeScript 7 in step 1.1). Install scripts of `esbuild` (and `unrs-resolver`) were not approved with `npm install-scripts approve`; Vitest works without them because the esbuild binary comes as the separate `@esbuild/darwin-arm64` package.
- **Security:** `npm audit` 0 vulnerabilities; OSV-Scanner: no issues (519 packages); packages with install scripts: `unrs-resolver`, `esbuild` (both not run); `fsevents` was not installed (optional, macOS).
- **Requirement changes:** None.

---

## Step 1.3: shadcn/ui foundation (manual setup)

- **Scenario and requirements:** Security (supply chain): the `shadcn` CLI has about 40 dependencies and fetches from the network, so I avoided it. Know-how: I must be able to explain `cn()`, the theme tokens and the Button variants.
- **Prompts:** Plan mode; asked for a plan; agent gave package facts first (name, author, update date, install scripts); approved the plan; then approved the install after a dry-run; went file by file with "go".
- **What the agent did:** Checked the registry for `shadcn`, `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`; installed the last four (no install scripts); wrote `lib/utils.test.ts` first (red), then `lib/utils.ts` (green); added `components.json`, theme tokens in `app/globals.css`, `components/ui/button.tsx` and a demo in `app/page.tsx`.
- **What I fixed or rejected:** Rejected `npx shadcn init` (large dependency tree, network access, many files at once). Left out `lucide-react`, `radix-ui` and `asChild` until a component needs them. Dropped `@custom-variant dark` (no dark theme in scope). After a visual check I found the hover effect too weak; `--accent` was darkened (0.97 to 0.91) and the hover opacity of `default` and `destructive` was lowered.
- **Security:** `npm audit` 0 vulnerabilities; OSV-Scanner: no issues (523 packages); lockfile gained only the 4 packages, no new install scripts; `esbuild`, `unrs-resolver` still not approved; `fsevents` not installed.
- **Requirement changes:** None.

---

## Step 2.1: `profiles` table with RLS

- **Scenario and requirements:** Security (data isolation): the `profiles` table is the base for every `auth.uid()` policy, and the database is reachable from the internet, so RLS is the only barrier. Know-how: pgTAP and RLS are new to me; I must be able to explain every policy line.
- **Prompts:** Plan mode; asked what Phase 2 contains; approved a 7-step breakdown and the detailed plan for 2.1 (test first); approved each command that touches the cloud DEV project.
- **What the agent did:** Wrote `supabase/tests/profiles_rls.test.sql` (7 checks) and ran it red (table missing); wrote the migration `create_profiles` (table, RLS in the same migration, `revoke` from `anon`, select/insert/update policies, no delete policy); applied it with `db push --linked`; the test was green in the SQL Editor. Updated `CLAUDE.md` and `docs/plan.md` with the real test workflow.
- **What I fixed or rejected:**
  - `supabase test db --linked` fails with `docker: command not found` (it runs `pg_prove` in a container). The plan assumed it works; I chose to run pgTAP by hand in the SQL Editor instead of installing Docker/Podman or new tools.
  - First test version used `with u as (update ...)` inside a subquery: Postgres rejects data-modifying CTEs below the top level. Rewrote tests 5–7 as a plain `update` plus a separate check.
  - The SQL Editor shows only the last result set, so a passing run looked empty. Added a temp table `pg_temp.results` that collects all assertions and prints them at the end.
  - The editor's "Potential issue detected" dialog (temp table without RLS): chose "Run without RLS", because the table is temporary and rolled back. Earlier error `relation "results" does not exist` was probably the editor running `alter table` in a separate statement (hypothesis, not proven).
  - An agent edit dropped a space (`pg_temp.resultsselect`); caught when I pasted the file, fixed and checked with grep.
  - Network: `db push`/`test db` timed out from the first network (pooler port blocked or timing out); worked from a phone hotspot. Dashboard showed no network bans or restrictions; the exact cause in the first network was not identified.
- **Security:** RLS enabled in the same migration before any row exists; `anon` has no privileges (tested); A cannot read, update or insert B's profile (tested, `42501` for the forged insert); only fictional data (`*@example.test`), tests end with `rollback`; no service_role key, no `.env*` read; no new packages. Security Advisor review is planned for step 2.7.
- **Requirement changes:** pgTAP is run manually in the SQL Editor, not with `supabase test db --linked`; recorded in `CLAUDE.md` and `docs/plan.md` (Migration workflow, Phase 2 table).

## Steps 2.2–2.7: enum + `clients`, `projects`, status trigger, `packages` + `contracts`, seed on sign-up, `anon` checks (11.11.2026) — DRAFT

- **Scenario and requirements:** Security (multi-tenant isolation): every table needs RLS with `photographer_id = auth.uid()` and `with check`; related rows (`client_id`, `package_id`) must belong to the same photographer; the status flow is enforced by a DB trigger, not by the UI. Complexity: triggers and cross-table checks. Know-how: pgTAP and RLS are still new to me.
- **Prompts:** Plan mode; asked whether Phase 2 could continue without testing; then asked what is needed to close the yellow steps; ran `db push --linked` myself and pasted the output; ran each test file by hand in the SQL Editor and reported failures with screenshots.
- **What the agent did:** Wrote tests and migrations for 2.2–2.7 (enum `project_status`, `clients`, `projects`, status trigger, `packages`, `contracts`, seed trigger, schema-wide `anon` test). Told me the run order (`db push` first, `anon_privileges` last) and diagnosed each failure below.
- **What I fixed or rejected:**
  - `42P01: relation "results" does not exist` in `clients_rls.test`: the editor was run with "Run and enable RLS". Fix: "Run without RLS" (already known from step 2.1).
  - `anon_privileges.test` check 5 failed with `42809: "clients" is not a sequence`: Postgres does not guarantee the order of `where` conditions, so `has_sequence_privilege` was also called for tables. Fix: wrap the call in `case when c.relkind = 'S' then ... else false end`.
  - `profiles_rls.test` failed with `23505 duplicate key ... profiles_pkey`: the editor tab held an old copy without `on conflict`; since 2.6 the sign-up trigger already creates the profiles. Fix: paste the current file from the repo. Lesson: tabs with an unsaved-changes dot can hold stale copies; a green run of an old copy proves nothing.
  - Earlier commits already tightened the schema: `anon` checks over the whole `public` schema and `revoke execute` on the status trigger function.
- **Security:** `db push` applied 7 migrations without errors; all test files green in the SQL Editor (RLS isolation A/B, forged inserts rejected, `anon` has no table, sequence or function access except the planned booking functions); Security Advisor: 0 errors, 0 warnings, 0 suggestions; only fictional data, tests end with `rollback`; no service_role key, no `.env*` read, no new packages. Note: the dashboard shows the `main` branch with a PRODUCTION badge; this is the DEV project by our agreement.
- **Requirement changes:** none.

---

## Steps 3.1–3.8: login, route protection, logout, CI fixes (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (authentication, access control): the app must not show protected pages without a verified session, the login form must not reveal which emails exist, and `?next=` must not become an open redirect. Complexity: session cookies have to be refreshed in the proxy and survive redirects. Know-how: `proxy.ts` (Next 16 name for middleware) and `@supabase/ssr` are new to me.
- **Prompts:** Asked "what is next"; asked for the whole Phase 3 at once, the agent went to plan mode and I approved a plan with 8 steps; then approved each step with "далі" (one module per step, tests first for the redirect helper and the route rules); later "do what is missing" and reported that the CI pipeline was red; approved the osv ignore and the `npm audit` change.
- **What the agent did:** Added the `login` action and `/login` page (3.1, 3.2); `safeRedirectPath` (3.3); `/dashboard` placeholder with `getUser()` (3.4); `logout` action and button (3.5); `decideAccess` (default deny, public: `/`, `/login`, `/signup`, `/book/*`) and `proxy.ts` that refreshes cookies and redirects (3.6); `href="/login"` on the start page (3.7). Tests for 3.3 and 3.6 were written first and run red. No new packages.
- **What I fixed or rejected:**
  - Agent left out `?next=` in the proxy (one protected page only; keeps paths out of URLs); `safeRedirectPath` is ready but not wired yet. Wire it in Phase 4 when there are several protected pages.
  - CI was red for three reasons: (1) osv-scanner found `GHSA-fc5q-39xc-vjpf` (`picomatch`, high, dev-only, no fixed version): ignored in `osv-scanner.toml` with reason and expiry 2027-01-03, same pattern as `minimatch`; (2) `next build` failed in CI because `/dashboard` read the Supabase env before `cookies()`, so Next tried to prerender it: swapped the two lines in `lib/supabase/server.ts`, so the build needs no Supabase variables and no secrets in CI; (3) `npm audit --audit-level=high` saw the same `picomatch` and has no ignore list: changed to `--omit=dev` (production dependencies only; dev dependencies stay covered by osv-scanner). I chose this over lowering the level to `critical` or removing the job.
  - The agent could not read the CI log (no `gh`) and could not look up the advisory text (request denied); it worked from the local osv-scanner output and reproduced the build error with empty env variables.
- **Security:** Generic login error for wrong password, unknown email and invalid input; no email, password or token in logs, URLs or returned state; server checks use `getUser()`; proxy and page both check the session; `/book/` prefix ends with a slash, so `/booking` is not public; open redirect cases tested (`//host`, `\`, tabs); no service_role key, `.env.local` not read. Manual check passed (anonymous `/dashboard` goes to login, session survives reload, logout works, logged-in user is kept off `/login`, second user sees only own data). CI green after the fixes. Accepted risks: two dev-only advisories (`minimatch`, `picomatch`), re-check before 2027-01-03; brute-force limits are Supabase Auth settings, not built here.
- **Requirement changes:** none.

---

## Steps 4.1–4.2: days until the event, status map, projects list on `/dashboard` (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (multi-tenant isolation): the list must show only the logged-in photographer's projects, and the page must not leak data through error messages. Complexity: calendar-day arithmetic (time zones, daylight saving, invalid dates). Know-how: Supabase nested select (`clients(names)`) and why Tailwind class names must be written out in full.
- **Prompts:** Plan mode; asked "what is next"; approved a split of Phase 4 into 8 small steps; for each step approved a plan (files, tests, expected result) with "go"; decided that the UI is English only; ran the SQL for demo data myself in the SQL Editor and checked the page with two users.
- **What the agent did:** Tests first, run red, then code: `daysUntil` (UTC midnight arithmetic, rejects invalid dates), `formatDaysUntil` ("today", "tomorrow", "in N days", "N days ago"), `lib/projects/status.ts` (5 statuses in enum order, labels, badge classes), `StatusBadge`; rewrote `/dashboard` as a read-only project list (sorted by `event_date`, projects without a date last, empty state, generic error text); removed the temporary badge strip from the start page. 63 tests, typecheck, lint and build green. No new packages.
- **What I fixed or rejected:**
  - The first demo-data SQL inserted projects with different statuses and failed with `a new project must start with status inquiry`: the status trigger from step 2.4 also applies in the SQL Editor. Nothing was written (one statement, rolled back). Fixed: insert all as `inquiry`, then move statuses one step per `UPDATE`. This showed that the trigger works as intended.
  - The query result is cast with `as unknown as ProjectRow[]` because there are no generated DB types; this trusts the shape of the query and does not validate it. Accepted for a read-only list; generated types (`supabase gen types`) stay an option for later and need a separate decision.
  - Empty-state and day labels in English only (my plan first had one Ukrainian text by mistake).
- **What I checked and understood:** _to fill in by me._
- **Security:** The query has no `photographer_id` filter on purpose: RLS decides. Checked manually: user A sees their 3 demo projects, user B sees an empty list. The raw `error.message` is neither shown nor logged. The list selects no token hash and no gallery link. Only fictional data (`*@example.test`); `.env.local` not read; no service_role key; no new packages.
- **Requirement changes:** UI language is English only (decided in this step, no other document records it).
