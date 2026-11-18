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
- **Security:** The query has no `photographer_id` filter on purpose: RLS decides. Checked manually: user A sees their 3 demo projects, user B sees an empty list. The raw `error.message` is neither shown nor logged. The list selects no token hash and no gallery link. Only fictional data (`*@example.test`); `.env.local` not read; no service_role key; no new packages.
- **Requirement changes:** UI language is English only (decided in this step, no other document records it).

---

## Steps 4.3–4.4: project form schema, `create_project` function, create form (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (multi-tenant isolation, data protection): the first step that writes client personal data; the photographer must come from the session, not from the form; client and project must be created together or not at all; no personal data in logs or error messages. Complexity: a function that runs with the caller's rights so RLS still applies. Know-how: `security invoker` vs `security definer`, `useActionState`, server actions.
- **Prompts:** Plan mode; approved a plan for each step (4.3 schema, 4.4a SQL function with pgTAP first, 4.4b action, form, button) with "go"; ran the red test, `db push` and the green tests myself in the SQL Editor; checked the form in the browser and asked to bring the date picker back.
- **What the agent did:** `projectFormSchema` (zod, 9 tests first, red then green; `email` exported from `auth.ts`); `supabase/tests/create_project.test.sql` (13 checks, run red) and migration `create_project_function` (security invoker, empty `search_path`, photographer from `auth.uid()`, execute revoked from `public` and `anon`); server action `createProject` (validates, calls `rpc`, generic errors); form page `/projects/new`; "New project" button on `/dashboard`. 72 tests, typecheck, lint, build green. No new packages.
- **What I fixed or rejected:**
  - The first test run of the schema failed: Vitest does not know the `@/` alias (only `tsconfig` does). Fixed with a relative import instead of changing the test config. Typecheck was green while the test failed: the two checks catch different things.
  - The agent replaced `type="date"` with a text field to get an English hint (the native field shows `дд.мм.рррр` in the browser language) without asking. I rejected it: the calendar is more useful. The hint stays in the browser language.
  - Test check 13 (no client left after a failed call) does not prove the rollback of the second insert, because the first insert already fails. The atomicity comes from the function being one transaction; the test comment says so.
- **Security:** RLS applies to the function (not `security definer`); `anon` cannot execute it (pgTAP and `anon_privileges.test.sql` green); the form sends no photographer id; the server validates again with zod (length limits, real date); HTML in names stays plain text (React escapes it); the action returns generic errors and logs nothing. Manual check in the browser: a project is created and listed. Only fictional data (`*@example.test`); no service_role key; `.env.local` not read; no new packages. Supabase grants `execute` on new functions to `anon` by default, so the explicit `revoke` is needed.
- **Requirement changes:** none.

---

## Step 4.5: edit a project (`update_project`, `/projects/[id]`) (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (IDOR): the project id comes from the URL and a hidden field, so the user controls it; another photographer's project must be neither readable nor editable, and the error must not reveal whether it exists. Complexity: two tables edited together (client and project). Know-how: `params` as a Promise in Next 16, `maybeSingle()`, server vs client components.
- **Prompts:** Plan mode; agent recommended one atomic SQL function instead of two updates; approved the plan with "go"; ran the red test, `db push` and the green tests myself; checked the page in the browser.
- **What the agent did:** `supabase/tests/update_project.test.sql` (14 checks, run red) and migration `update_project_function` (security invoker, empty `search_path`, status not a parameter, `no_data_found` when RLS hides the row, execute revoked from `public` and `anon`); `projectIdSchema` (uuid, test first); server action `updateProject`; page `/projects/[id]` with `notFound()`; shared `ProjectFields` component (also used by the create form); link from the project list. 74 tests, typecheck, lint, build green. No new packages.
- **What I fixed or rejected:**
  - After the first click the page crashed with `Cannot read properties of undefined (reading 'safeParse')`. The code was correct (tests and `build` green); the dev server had been started before the new export was added and kept an old copy of the module. Fixed by restarting `npm run dev`. Lesson: green tests and build do not cover a stale dev server.
  - A real database error and "project not found" both give a 404 on this page. This keeps the existence of other people's projects hidden but makes a real error harder to notice. Accepted for this prototype.
  - The query result is cast by hand (`as unknown as`), as on the dashboard; generated DB types are still an open decision.
- **Security:** pgTAP: A edits own project; B's attempt on A's project fails with the same error as a non-existent id and leaves A's rows unchanged (checked as table owner, otherwise RLS would hide them); `anon` cannot execute the function (`anon_privileges.test.sql` green); the status is untouched by editing. The id is validated as uuid on the page and in the action; the page query has no photographer filter (RLS decides); generic error texts, nothing logged; no token hash or gallery link selected. Only fictional data; no service_role key; `.env.local` not read; no new packages.
- **Requirement changes:** none.

---

## Step 4.6: change the status by one step (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (forged input, status integrity): the status must move only one step forward or back, and the UI must not be the only guard. Complexity: three layers that all know the rule (UI buttons, server action, database trigger). Know-how: submit buttons that send their own name and value, `revalidatePath`.
- **Prompts:** Plan mode; approved a three-part plan (pure function, action, buttons) with "go"; asked for words ("Back"/"Next") instead of arrows; checked the buttons in the browser.
- **What the agent did:** `neighborStatus` (3 tests first, red then green; 77 tests in total); server action `changeStatus` (validates `projectId` as uuid and `direction` as enum, reads the current status from the database, picks the neighbour, updates, generic errors, `revalidatePath`); client component `StatusControls` (Back/Next, disabled at the ends and while sending, `aria-label` with the target status); buttons added to every row of the project list. No new packages, no schema change.
- **What I fixed or rejected:**
  - The action does not take the current status from the form: a user could fake it. It is read from the database; the trigger from step 2.4 checks the rule again.
  - No separate SQL function and no new pgTAP test: it is one table and one statement, and the trigger is already covered by `project_status_trigger.test.sql`.
  - Known limit: "Next" on `Awaiting Event` always fails for now (`Gallery Delivered` needs a gallery link, which has no input yet); the user sees the generic error. Phase 7 adds the link field and a clearer message.
- **Security:** forged `projectId` or `direction` gives the same generic error; someone else's project is invisible through RLS; skipping a step is rejected by the trigger; no `error.message` shown or logged; no personal data in the response. Manual check in the browser: stepping forward and back, buttons disabled at the ends, error on `Awaiting Event` → `Gallery Delivered`. Only fictional data; no service_role key; `.env.local` not read; no new packages.
- **Requirement changes:** none.

---

## Step 4.7: booking token (`lib/tokens.ts`, "Booking link") (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (secrets, data leak): the token opens a page with the couple's data, so it must be unguessable and must not be recoverable from a leaked database; it must not appear in logs or URL parameters. Complexity: the hash is computed in two places (Node now, Postgres later in `get_booking`) and must match. Know-how: `node:crypto`, base64url, `bytea` through PostgREST.
- **Prompts:** Plan mode; agent compared two options (generate in Next vs in Postgres) and recommended Next; I chose option A ("варіант А") and accepted narrowing step 4.8; approved with "go"; checked the page and the database by hand.
- **What the agent did:** `lib/tokens.ts` with `generateToken` (32 bytes, base64url, 43 characters), `hashToken` (SHA-256) and `hashToPostgres` (`\x` + hex); 6 tests first, red then green, including the known SHA-256 vector for "abc" (83 tests in total). Server action `createAccessLink` (validates the id, stores only the hash, returns the token once). Client component `AccessLink` ("Create link" / "New link", token in React state only, "Copy" button). The project page reads the hash only to learn whether a link exists. No new packages.
- **What I fixed or rejected:**
  - Rejected generating the token inside Postgres: the token would travel back from the database, and `pgcrypto` lives in the `extensions` schema, which is awkward with an empty `search_path`.
  - An `update` on someone else's project raises no error under RLS, it just touches no row. The action therefore checks that a row came back (`.select("id")`); otherwise it would show a token that opens nothing.
  - The page now selects `access_token_hash` (earlier steps selected no token data on purpose). It stays on the server and only a yes/no goes to the browser.
- **Security:** only the SHA-256 hash is stored (32 bytes, checked in the SQL Editor: the stored value differs from the token on screen); the token is neither stored, logged nor put into a URL parameter, and it is gone after a reload; a new token replaces the hash; someone else's project gives a 404 and no link; generic error texts. Not yet proven: that an old token stops working end to end, because `get_booking` does not exist before Phase 6. Only fictional data; no service_role key; `.env.local` not read; no new packages.
- **Requirement changes:** step 4.8 narrowed (confirmation before a new link; the end-to-end check of the old token moves to Phase 6). Recorded in `docs/plan.md`.

---

## Step 4.8: confirmation before a new booking link (18.11.2026) — DRAFT

- **Scenario and requirements:** Security and data integrity: replacing the token silently breaks a link that was already sent to the couple. Know-how: local React state for a two-step action without a dialog package.
- **Prompts:** Plan mode; approved a two-step button instead of a modal ("Cancel" / "Yes, create new link"); checked the flow and the database by hand.
- **What the agent did:** Changed `AccessLink`: with no link the button creates one directly; with a link, "New link" first shows a warning and a confirm button. After a new token the "Copied" label resets. No new packages.
- **What I fixed or rejected:** Rejected the shadcn dialog: it needs `radix-ui` (a new package) for one warning. Rejected a `window.confirm`: it cannot be styled and is hard to test.
- **Security:** Cancel leaves the stored hash unchanged (checked in the SQL Editor); a confirmed new link changes it. **Not proven here:** that the old token stops working end to end, because `get_booking` does not exist before Phase 6; recorded as a "Done when" item of Phase 6. No new packages; only fictional data.
- **Requirement changes:** none beyond the narrowing recorded in step 4.7.

---

## Phase 4 summary: four axes (DRAFT, to confirm)

- **Complexity:** medium. Three layers know the status rule (buttons, server action, database trigger). Two tables must change together, so `create_project` and `update_project` are single functions.
- **Know-how:** new to me: `security invoker` functions with an empty `search_path`, server actions with `useActionState`, `bytea` through PostgREST, and hashing a token in Node and Postgres identically.
- **Security:** critical. Personal data of couples, a secret token, and an id taken from the URL (IDOR). Protections: RLS on every call, ids validated as uuid, generic errors, only the hash stored, tests with two users.
- **Liability:** moderate for a prototype with fictional data; in production high (personal data of clients, a link that gives access to their booking).
- **Where the agent or I made mistakes:** wrong demo SQL (status trigger), an `@/` alias missing in Vitest, a date field replaced without asking, a stale dev server that looked like a code bug.

---

## Step 4.9: wire `?next=` after login (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (open redirect, phishing): `?next=` comes from the URL and from a hidden form field, both forgeable, so a link on our own domain must never send the user to another site. Complexity: three places take part (proxy, login page, login action). Know-how: server page reading `searchParams` (a Promise in Next 16) and passing it to a client form.
- **Prompts:** Asked "what is next"; chose to close two open points from Phase 3/4 (`?next=` and generated types); approved the plan for part A with "так"; asked what the open-redirect check means; confirmed it works in the browser ("все працює").
- **What the agent did:** `loginRedirectUrl` in `lib/auth/login-url.ts` (4 tests first, red then green; 87 tests in total); `proxy.ts` sends visitors to `/login?next=<pathname>` (pathname only, no query string; `/`, `/login`, `/signup` get a plain `/login`); `/login` split into a server `page.tsx` and a client `login-form.tsx` with a hidden `next` field; the `login` action ends with `redirect(safeRedirectPath(formData.get("next")))`. No new packages.
- **What I fixed or rejected:**
  - A client page with `useSearchParams` would need `<Suspense>` for `build`; a server page passing a prop is simpler.
  - The URL-building logic is a separate function so it can be tested; in `proxy.ts` it would not be.
  - Side effect: `/login` is now dynamic in `build` (it reads `searchParams`).
- **What I checked and understood:** _to fill in by me._
- **Security:** `safeRedirectPath` runs on the server in the action, after the form is submitted, so a forged hidden field gives the same result as a forged URL. Manual check: `?next=https://evil.com` and `?next=//evil.com` both end on `/dashboard`; a protected page such as `/projects/<id>` returns there after login. Only the path is put into `next`, no query string, token or personal data; `/book/...` is public and never goes through login. Only fictional data; no service_role key; `.env.local` not read; no new packages.
- **Requirement changes:** none. The open point from Phase 3 is closed in `docs/plan.md`.

---

## Step 4.10: generated database types instead of manual casts (18.11.2026) — DRAFT

- **Scenario and requirements:** Security and data integrity: a hand-written type is a promise the compiler cannot check; if the schema changes, the code still compiles and fails at runtime. Complexity: the generated types also checked the `rpc` calls and found a mismatch. Know-how: `supabase gen types --linked` (no Docker), a typed client with `createServerClient<Database>`, how Postgres function defaults appear in TypeScript.
- **Prompts:** Chose this as the second open point; approved the plan ("так", "далі"); chose the option "migration with `default null`" when the types disagreed with the SQL functions; ran the pgTAP files by hand (one red, then three green after the migration).
- **What the agent did:** generated `lib/supabase/database.types.ts` (read completely: schema only, no data, no secrets); passed `Database` to the server and browser clients; removed both `as unknown as` casts and the hand-written `ProjectRow` types (the join `clients(...)` is inferred correctly); added `npm run types`. The types then rejected 4 `rpc` calls: `create_project` and `update_project` accepted null for date and location, the generator typed them as plain `string`. Fix: pgTAP check first (red), migration `project_functions_optional_args` (`default null` on the last two parameters, same behaviour for callers passing null), regenerated types, call sites pass `?? undefined`. No new packages.
- **What I fixed or rejected:**
  - Rejected `as string` at the 4 call sites: it would bring back the same kind of lie the casts were.
  - Rejected hiding the mismatch: the types showed a real difference between SQL and the app, which is the point of generating them.
  - Known limit: the generated file ages after every migration; `npm run types` must be run again (also on the checklist for schema steps).
- **What I checked and understood:** _to fill in by me._
- **Security:** the migration is `create or replace`, so owner, `security invoker`, empty `search_path` and grants stay; `anon_privileges.test.sql`, `create_project.test.sql` (14 checks) and `update_project.test.sql` (15 checks) green after the push. The generated file contains only names and types of tables, columns, enum values and functions. Only fictional data; no service_role key; `.env.local` not read; no new packages.
- **Requirement changes:** none. The open point about types is closed in `docs/plan.md`.

---

## Steps 5.1–5.4: service packages (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (IDOR, integrity): a package id comes from the URL and from a hidden form field, and a photographer must never see or change another photographer's package. Complexity: low, because the database part (table, RLS, seed, composite foreign key) already existed from Phase 2. Know-how: numbers typed in a form arrive as strings, so the limits of `numeric(10,2)` and `numeric(4,1)` must be checked before conversion.
- **Prompts:** Plan mode; asked to start Phase 5; the agent proposed 5 steps (schema, read-only list, create, edit and hide, check); approved with "go" and then "далі" for each step. Asked whether the Ukrainian text "Заповніть це поле." in the form comes from the browser; decided to keep it.
- **What the agent did:** `packageFormSchema` and `packageIdSchema` in `lib/validation/package.ts` (10 tests first, red then green; 97 tests in total). `/packages` list (active first, hidden ones greyed with "(Hidden)"), `/packages/new` with action `createPackage`, `/packages/[id]` with actions `updatePackage` and `setPackageActive` (Hide/Show), shared `PackageFields`, a "Packages" button on the dashboard. No migration, no SQL function, no new packages.
- **What I fixed or rejected:**
  - Rejected `Number()` on the raw string: `Number("1e3")` is 1000 and `Number("")` is 0. A regex checks the form first, then the string is converted.
  - Rejected a new SQL function for packages: one row in one table is covered by RLS `with check`; `create_project` exists only because it changes two tables together.
  - Kept the browser's native "required" message (language comes from the browser, like the date field); the server checks everything again with English generic texts.
  - Known limit: if Hide/Show fails, the page just reloads without a message.
- **Security:** `photographer_id` comes from `getUser()` on insert and is not part of any update; `is_active` is changed only by `setPackageActive`, which accepts only the literal values "true" and "false". On update, RLS hides someone else's row without an error, so both update actions check that exactly one row came back (same lesson as step 4.7). Someone else's package and a missing one give the same 404. No delete (revoked in the migration). Generic error texts. Only fictional data; no service_role key; `.env.local` not read; no new packages.
- **Manual check with two accounts (Done when):** _to fill in by me:_ (1) a new user has 3 packages; (2) user B cannot open or change user A's package by its id (404); (3) a package of another photographer cannot be assigned to one's own project (already proven in `contracts_rls.test.sql`, test 7).
- **Requirement changes:** none.

---

## Steps 6.1–6.8: booking flow `/book/[token]` (18.11.2026) — DRAFT

- **Scenario and requirements:** Security (public access, token): the couple has no account, so the token in the URL is the only key and `anon` must reach data only through two `security definer` functions. Complexity: the first public write path in the project (idempotent signature). Know-how: `security definer` with an empty `search_path`, hashing inside Postgres (`sha256`), and why a `<form>` without an action would put personal data into the URL. Liability: the signed contract keeps a snapshot of the package, so later price edits do not change what the couple signed.
- **Prompts:** Plan mode; asked for "phase 6" (the agent first had to clarify it is the booking flow, not the seed on sign-up from step 2.6); approved a 7-step plan and two defaults (only names, no email, returned to the anonymous visitor; core `sha256()` instead of an extension); then "готово, роби N" for each step after running the pgTAP tests and `db push` myself. Asked why the photographer cannot see the booking and the chosen package; this gap led to the added step 6.7.
- **What the agent did:**
  - 6.1 `get_booking(token)` and 6.2 `submit_booking(...)`: pgTAP tests first (13 and 21 checks), migrations after; I ran each test red, pushed, ran it green and regenerated the types.
  - 6.3 `bookingTokenSchema` (exactly 43 base64url characters), `bookingFormSchema` (consent only as `"on"`, limits of 200), tests first.
  - 6.4 public page `/book/[token]` with the same 404 for a malformed and an unknown token; `bookingViewSchema` checks the `Json` answer instead of a cast.
  - 6.5 form, action `submitBooking` (token bound on the server, not a form field), thank-you message in place of the form.
  - 6.6 `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow` on `/book/*` (header list tested in Vitest); log review.
  - 6.7 block "Booking" on `/projects/[id]` with signature, date and package snapshot (`packageSnapshotSchema`, test first).
  - 116 Vitest tests, `tsc`, `eslint` and `next build` pass.
- **What I fixed or rejected:**
  - Moved the form from 6.4 to 6.5: a `<form>` without a server action sends a GET and would put names and signature into the URL.
  - Added step 6.7 after my question: the plan promised a "contract signed" marker, but no step built it. The dashboard marker stays out of scope.
  - The agent wrote the test and the schema for `bookingViewSchema` in one command, so that test was never seen red (the schema is small, but the order "test first" was not kept there).
  - The agent ran Prettier on whole directories and it reformatted five unrelated files; reverted with `git checkout`, only the step's files stayed in the diff.
  - A command that started the dev server in the background was denied, so the headers were not checked with `curl` by the agent.
  - Known limit: the thank-you message is shown in place of the form, not on a separate page (a separate route would be one more URL with the token); a reload shows "already signed". The event date is shown as `2027-05-15`.
- **Security:** `get_booking` and `submit_booking` are `security definer`, empty `search_path`, `execute` revoked from `public` and granted to `anon` and `authenticated` only; the token is hashed in the database and compared with `access_token_hash`, never stored or logged. An invalid, empty, oversized and unknown token give the same answer (`null` / `false`, the same 404 on the page). `get_booking` returns no email, gallery link, photographer id or project id; hidden packages and other photographers' packages are never offered. `submit_booking` checks the package belongs to the same photographer, is active, consent is given, the signature has 1–200 characters; a second call does not duplicate or overwrite (`unique(project_id)` and `on conflict do nothing`); it does not change the project status. `anon` cannot insert into `contracts` directly (`42501`, tested). A token replaced by "New link" stops working in both functions (pgTAP: `get_booking` test 11, `submit_booking` test 20), which closes the item carried over from step 4.8. A signature with HTML tags is stored as plain text (tested) and React escapes it on output. No `console.*` and no logging in `app`, `lib`, `components`; errors are generic; the token does not appear in `searchParams` or redirects. Only fictional data; no service_role key; `.env.local` not read; no new packages.
- **Manual check (Done when):** all 7 points passed on 18.11.2026 (result reported by me; the agent could not run `curl` or the browser flow itself, the commands were denied). Points: (1) full flow in the browser: link → package → signature and consent → thank-you; a reload shows "already signed"; (2) a double click or a second submit leaves one row in `contracts`; (3) `/book/` + a random string and `/book/` + 43 random characters give the same 404; (4) after "New link" the old link gives 404; (5) a signature `<script>alert(1)</script>` is shown as text on `/projects/[id]`; (6) `curl -D -` on `/book/<43 characters>` shows the three headers, and `/login` does not; (7) the second account does not see the first account's project or booking.
- **Requirement changes:** step 6.7 added to Phase 6 in `docs/plan.md` (photographer sees the signed booking); the thank-you page became an in-place message; the end-to-end check of the old token (step 4.8) is covered by pgTAP tests.
