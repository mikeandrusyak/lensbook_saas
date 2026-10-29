# KIP: implementation plan (v2, 24 October 2026)
 
Replaces the plan of 5 October. Main change: Supabase runs as a cloud dev project, because the macOS VM has no Docker.
 
## What changed compared to v1
 
| Was | Now | Why |
| --- | --- | --- |
| Ubuntu VM, Docker, local Supabase | macOS VM, no Docker, cloud Supabase dev project | Docker in a macOS guest usually does not work (no nested virtualization) |
| Migrations via `db diff` | Migrations written by hand, applied with `db push` | `db diff` and `db pull` need a local shadow database |
| Nothing about tokens in the VM | Rules for tokens and keys (section "Security") | The VM now has access to a real (if dev) database |
| Phases 0–1 in SW4–SW5 | Phase 0 finishes in SW6, schedule shifted | Actual progress |
| Exposé as a single Phase 0 item | Separate section with the structure from the PDF | The PDF has 6 mandatory sections |
 
**For the protocol and the report (LE1):** this is a change of requirements. Record: what changed, why, which axes it affected (Security: higher, because the database is reachable from the internet; Know-how: cloud setup added), and how it was compensated. Inform the lecturer (the security requirement was agreed with them).
 
## Goal and scope
 
We are building a minimal CRM for wedding photographers where the main point is not the number of features but the security of client data and understanding every line of code. Everything that is 100% part of the submission is marked Must.
 
**Decisions made so far**
 
- Agreed with the lecturer: security (so that client data, especially gallery links, does not leak by accident) and a scan of the libraries used.
- The application does not store photos. `Gallery Delivered` means the photographer pastes a link to an external gallery.
- Payments (Stripe) are Nice-to-have. In Must, the photographer sets the `Retainer Paid` status manually.
- All requests are counted from `event_date`, not from lead creation.
- **New:** the database is a cloud Supabase dev project, with fictional data only.
**Must have (numbers are used in the phases)**
 
1. Protection of client data and gallery links: RLS, SQL isolation tests, long random token, no sensitive data in logs or URLs.
2. Library scan: `npm audit` + OSV-Scanner, Dependabot, lockfile, manual check of new packages.
3. Multi-tenant DB schema + RLS.
4. Sign-up and login (email + password, Supabase Auth).
5. Projects with 5 statuses: `Inquiry`, `Consultation`, `Retainer Paid`, `Awaiting Event`, `Gallery Delivered`.
6. Service packages: editing + automatic seed on sign-up.
7. Booking flow `/book/[token]`: package selection, couple's details, typed signature.
8. Manual deposit confirmation by the photographer.
9. `Gallery Delivered` with an external link, visible to the couple via token.
**Out of scope:** photo storage, kanban boards, general-purpose CRM, real payments.
 
## Exposé by SW6 (1–2 pages, by email)
 
Structure from the Mini-Challenge v1.1 PDF. Draft with the contents of this plan:
 
1. **Title and description (3–4 sentences):** CRM for wedding photographers; security of client data as the central requirement.
2. **Project description:** what we build, which problem it solves (scattered spreadsheets and emails, risk of data leaks), stack.
3. **Scenario per LE1** (scales from the PDF):
   - Knowledge of the solution: partly familiar (web stack), new: RLS and access tokens.
   - Need to understand details: high for security parts, medium for UI.
   - Cybersecurity level: critical (personal data, public route, database reachable from the internet).
   - Hidden consequences of bugs: yes (an RLS policy error is not visible in the UI).
   - Consequences of problems: harmful (leak of client data).
   - Liability: moderate (learning prototype, fictional data; high in real production).
4. **Why it is hard even with AI** (the lecturer grades this section, see "Lernpotenzial" and "KI-Grenzen testen"). Candidates for AI limits:
   - RLS policies: the code looks correct but lets other people's rows through (swapped `client_id`, `security definer` without `search_path`). The error is visible only through a test.
   - Status transition trigger and signature idempotency.
   - Tokens: hash in the database, regeneration, no leakage via logs and `Referer`.
   - Supply chain: AI recommends packages that must be checked manually.
   - The part that is new to me: RLS, pgTAP, `security definer` functions.
5. **MVP and stretch:** Must 1–9 and Nice-to-have (section below).
6. **Strategy:** planning mode before code, TDD for RLS and status transitions, small iterations, critical modules line by line, protocol from day one, VM without access to the host system.
**Deadline:** SW6 ends on 25 October. The contact hour on 22 October has already passed, so send it by email soon and ask to discuss it at the next contact hour. Add the environment change (cloud dev project) to the email.
 
## Stack and environment
 
| Layer | Decision | Purpose |
| --- | --- | --- |
| Environment | macOS VM (a real VM, not Docker), Homebrew | Lecturer's requirement; the agent has no access to the host system |
| Tools | `brew install node@<LTS> git gitleaks osv-scanner` | Check the LTS version on nodejs.org |
| Editor | VS Code + Claude Code extension | See every change in the code |
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | Widespread stack; server side in the same repo |
| Backend | Supabase cloud (dev project): Postgres + Auth + RLS; logic in the database (RPC) and in route handlers | No second stack and no Docker |
| Supabase CLI | `npm install supabase --save-dev` (in the project, not global) | Version in the lockfile and under scan |
| Tests | `supabase test db` (pgTAP) for RLS; Vitest for logic | Proof of data isolation |
| Dependency security | `npm audit`, OSV-Scanner, Dependabot, lockfile | Agreed requirement |
| Secrets | `.env.local` outside git, only URL and anon key; gitleaks | Avoid leaks |
| Hosting | Run the app locally in the VM; database in the cloud; app deployment (Vercel) only if time remains | Deployment is not required |
 
**Cloud project setup (one time)**
 
- Separate project `kip-dev`, region Zurich or Frankfurt. Database password only in the password manager.
- Authentication → Email: turn "Confirm email" off for development (the built-in mail has limits).
- Authentication → URL: allow only `http://localhost:3000`.
- Database → Extensions: enable `pgtap`.
- CLI login: `npx supabase login` (Supabase account, token stays in Keychain), `npx supabase link --project-ref <ref>` (database password).
**Migration workflow**
 
```bash
npx supabase migration new <name>   # empty file in supabase/migrations
# write the SQL by hand and read every policy
npx supabase db push                 # apply to the dev project
npx supabase test db --linked        # pgTAP (check the flag via --help)
```
 
Write pgTAP tests in a `begin; ... rollback;` block so they leave no data behind. Run the database tests manually from the VM, not in CI: otherwise the Supabase token would have to be put into GitHub Secrets.
 
## Rules for working with Claude Code
 
Each phase is split into small steps following one cycle: 2000 lines at once cannot be understood and then explained at the exam.
 
**Step cycle**
 
1. **Plan.** In planning mode: step, expected result, tests. No code without an approved plan.
2. **Test first** (RLS, status transitions, tokens): a failing test, then the implementation.
3. **Small implementation.** One module or function at a time.
4. **Manual review.** Read the diff in VS Code; critical modules (RLS, tokens, statuses) line by line.
5. **Verification.** Tests, types, lint and dependency scan are green.
6. **Commit and protocol entry.**
**Agent settings files (Phase 0)**
 
- `CLAUDE.md`: stack, rules (RLS on every table, secrets only on the server, no service-role key, no new packages without my consent, planning mode before code), list of Musts.
- `.claude/settings.json`: start mode `plan`; deny reading `.env*`; deny `curl`/`wget`; deny commands that destroy database data (`supabase db reset`, project deletion); do not enable auto-approval of commands even in the VM.
- Two small custom skills in `.claude/skills/` (no third-party skills, plugins or MCP: they are extra supply-chain surface):
  - `step-log`: generates a protocol entry from a template.
  - `security-check`: `npm audit`, OSV-Scanner, gitleaks, lint, tests, summary.
**Context rules**
 
- New session after each phase: long fixes fill up the context.
- Most capable model for architecture and planning, a cheaper one for small tasks.
- Never show the agent real data: fictional only.
**How we avoid code we do not understand:** ask for an explanation of patterns, write a short summary in my own words and verify it with a test or a code change.
 
## Data model and access
 
Unchanged from v1: an anonymous user never reads tables directly; the couple's access rests on two database functions.
 
| Table | Key fields | Note |
| --- | --- | --- |
| `profiles` | `id` (= auth user), `display_name` | Created by a trigger on sign-up |
| `clients` | `id`, `photographer_id`, `names`, `email` | Minimum of personal data |
| `projects` | `id`, `photographer_id`, `client_id`, `event_date`, `location`, `status`, `access_token_hash`, `gallery_url` | Status is an enum with 5 values |
| `packages` | `id`, `photographer_id`, `name`, `description`, `price`, `duration_hours`, `is_active` | Three packages via seed |
| `contracts` | `id`, `photographer_id`, `project_id` (unique), `package_snapshot`, `signer_name`, `signed_at` | Snapshot of the package at signing time |
 
**RLS rules**
 
- RLS is enabled on every table **before** any data is added. Policies: `photographer_id = auth.uid()` for reads, `with check` for writes.
- Relations between tables (`client_id`, `package_id`) are checked to belong to the same photographer.
- Status transitions are controlled by a trigger: one step forward or back; `Gallery Delivered` requires `gallery_url`.
- **New (cloud):** tables in the `public` schema are reachable through the REST API from the internet, so RLS is the only barrier. A test checks that the `anon` role has no privileges on tables, and that execute on the functions `get_booking` and `submit_booking` is granted only to `anon` and `authenticated`. After migrations, review the Security Advisor in the dashboard.
**Couple's access by token**
 
- Token = 32 random bytes (base64url); only the SHA-256 hash is in the database. The link is shown at generation; for a new one we regenerate the token.
- `get_booking(token)` returns only the photographer's packages, project data and (in `Gallery Delivered`) the gallery link.
- `submit_booking(token, package_id, names, location, signature)` creates the contract once (idempotently) and checks that the package belongs to the same photographer.
- Both functions are `security definer` with an empty `search_path`.
- The signature does not change the project status: the photographer sees a "contract signed" marker and moves the project on themselves.
## Implementation stages
 
Phases 0–8 in strict order; the next one starts when the "Done when" of the previous one is met. Each phase produces a protocol entry.
 
### Phase 0. Environment and exposé (finish by end of SW6)
 
- **Already done:** macOS VM, empty repo, `npm init`, Supabase CLI as dev dependency, `login`, `init`, `link`.
- Remaining: `brew install` (node, git, gitleaks, osv-scanner), VS Code + Claude Code extension, `.gitignore` (with `.env*`), `.env.example`, gitleaks as pre-commit hook, `CLAUDE.md`, `.claude/settings.json`, skills `step-log` and `security-check`, `docs/protocol.md`, first commit.
- Set up the Supabase dev project (section "Stack and environment").
- Send the exposé.
- **Done when:** `npx supabase --version` works, `link` succeeds, Claude Code shows the diff in VS Code, no secrets in the repo, exposé sent.
- **For the protocol:** why a VM and not Docker; why a cloud database instead of a local one (requirement change) and which risks this added.
### Phase 1. Skeleton and security pipeline (Must 2)
 
Rule for new packages: exact spelling of the name (typosquatting, letters from another alphabet), author, update date, install scripts, peer dependencies.
 
| Step | Content | Status |
| --- | --- | --- |
| 1.1 | Next.js skeleton: Next, React, TypeScript, Tailwind, ESLint, configs and `app/` | ✅ Done 24.10.2026 |
| 1.2 | Vitest, `typecheck` and `test` scripts | ✅ Done 29.10.2026 |
| 1.3 | shadcn/ui | ✅ Done 29.10.2026 |
| 1.4 | GitHub Actions (lint, typecheck, tests, `npm audit`, OSV-Scanner, gitleaks), Dependabot; database tests not run in CI | ⬜ |
| 1.5 | Invite the lecturer to the repo, `README.md` stub | ⬜ |
 
**Step 1.1: done (24.10.2026).** `npm run dev`, `lint` and `build` pass, `npm audit` and OSV-Scanner report no problems (447 packages in the lockfile), telemetry disabled. Notes:
- Scaffolded by hand instead of `create-next-app`: the directory is not empty, and `create-next-app` installs everything at once.
- Versions: `typescript@5` (7.x was released the same day, compatibility with Next not confirmed) and `eslint@9` (per the peer dependency declarations, `eslint-config-next` likely conflicts with eslint 10; `--force` was not used).
- The only package with an install script: `unrs-resolver` (dev, transitively via `eslint-config-next`); npm did not approve it, and build and lint work without it.
- Removed from `package.json`: `"type": "commonjs"` (from `npm init -y`, it broke the Turbopack build) and the direct entries `eciesjs` and `jose` (we do not use them in the project; they remain as transitive dev dependencies of the Supabase CLI).
- The dev server also listens on the VM's network interface; later run `next dev -H localhost`.
- Entry in `docs/protocol.md`: step 1.1. The initial scan baseline for the report is taken from the first CI run (step 1.4).
**Step 1.2: done (29.10.2026).** `vitest@5.0.5` and `vite@^7` (7.3.7, not 8.x, which was 7 days old); `npm run test`, `typecheck`, `lint` and `build` pass, `npm audit` and OSV-Scanner report no problems (519 packages in the lockfile). Notes:
- New install scripts in the tree: `esbuild` (via Vite 7), not approved and not needed; `fsevents` is optional and was not installed.
- `lib/sanity.test.ts` is a placeholder that proves the pipeline works; remove it once the first real test exists (Phase 2).
- Entry in `docs/protocol.md`: step 1.2. The field "What I checked and understood" is left for you to fill in.
**Step 1.3: done (29.10.2026).** Manual shadcn setup, `npx shadcn init` was not used (about 40 dependencies, network access). `test`, `typecheck`, `lint` and `build` pass, `npm audit` and OSV-Scanner report no problems (523 packages in the lockfile). Notes:
- New packages (no install scripts): `clsx@2.1.1`, `tailwind-merge@3.7.0`, `class-variance-authority@0.7.1`, `tw-animate-css@1.4.0` (dev). Not installed yet: `lucide-react`, `radix-ui` (add with their own check when a component needs them).
- Files: `lib/utils.ts` (`cn`, with a test), `components.json`, theme tokens in `app/globals.css`, `components/ui/button.tsx` (no `asChild`).
- **TODO, do not forget: the colors in `app/globals.css` (`--primary`, `--accent`) are temporary and were picked only to make hover visible. Replace them in the design step below.** `app/page.tsx` also still shows demo buttons; replace it with the real start page.
- Entry in `docs/protocol.md`: step 1.3. The field "What I checked and understood" is left for you to fill in.
- **Done when:** all five steps are closed, CI is green on `main`, the initial scan report is saved (CI artifact), the lecturer is added to the repo.
### Phase 2. DB schema and RLS (Must 1, 3)
 
- Migrations by hand: tables, enum, foreign keys, index on `event_date`.
- RLS policies, status trigger, seed trigger (profile + 3 packages).
- pgTAP: photographer A cannot see, change or delete B's rows; a foreign `client_id` is rejected; a status jump is rejected; `anon` reads no table.
- **Done when:** tests are green; I can explain every policy in my own words; Security Advisor has no critical warnings.
- **For the protocol:** the most important phase for LE3: where the agent made a mistake or a test revealed a problem.
### Design step (between Phase 2 and Phase 3, before the first real screens)
 
Not a Must; kept small so the UI does not get a random look. Do it before the login form, which is the first real screen.
 
- Mood: minimalism and warmth. One style for the whole app; the couple's page `/book/[token]` gets more whitespace and the accent, the photographer's pages stay calm and businesslike.
- Palette: warm graphite base, sand as accent background, one clear color for links and focus. Write the choice and the reason in 10–15 lines in this section.
- **Replace the temporary colors in `app/globals.css`** (`--primary`, `--accent`, `--accent-foreground`) with the chosen palette; add tokens only when a component needs them.
- Five status colors for the badges (`Inquiry` … `Gallery Delivered`), chosen together with the palette. Check contrast of text on badges.
- Typography: one typeface, via `next/font` or the system font; no new package.
- Replace the demo buttons in `app/page.tsx`.
- Dark theme stays out of scope.
- **Done when:** the palette and status colors are described here and applied in `app/globals.css`, no temporary colors are left.
### Phase 3. Authentication (Must 4)
 
- Supabase Auth (email + password), `@supabase/ssr`, middleware, logout.
- The service-role key is not used and not copied into the VM.
- Login validation via zod.
- **Done when:** an unauthenticated user cannot reach protected routes; the session survives a reload; a second user sees an empty database with three packages.
### Phase 4. Projects and clients (Must 5)
 
- List ordered by `event_date` with a status badge and days until the event.
- Create and edit a project with a client; change status by one step (the rule is enforced by the database).
- Token generation: the link is shown once; "new link" regenerates.
- **Done when:** a photographer sees only their own projects; a status cannot be skipped; the old token stops working after regeneration.
- **For the protocol:** assessment along the four axes for this scenario.
### Phase 5. Service packages (Must 6)
 
- List, add, edit; hiding (`is_active`) instead of deleting.
- **Done when:** a new user has 3 packages; another photographer's package cannot be assigned to one's own project.
### Phase 6. Booking flow (Must 7)
 
- `/book/[token]`: `get_booking`, package selection, names and location, typed signature and consent, `submit_booking`, thank-you page.
- An invalid and a non-existent token give the same response.
- `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, token kept out of logs; zod with length limits.
- **Done when:** resubmitting does not duplicate the record; an invalid token is indistinguishable from a non-existent one; a name containing HTML tags is not executed.
### Phase 7. Deposit and gallery (Must 8, 9)
 
- A "Deposit received" button moves the project to `Retainer Paid`.
- Gallery link field: `https://` only; `Gallery Delivered` is impossible without it.
- The couple sees the link only in `Gallery Delivered`, with `rel="noopener noreferrer"`.
- **Done when:** full demo scenario: two photographers, one couple, no data overlap.
### Phase 8. Hardening and submission (Must 1, 2)
 
- Security headers (CSP, `X-Content-Type-Options`, `frame-ancestors`, `Referrer-Policy`).
- Manual abuse tests: IDOR, token guessing, XSS in names, status skipping.
- Final dependency and secret scan, log review, README, demo recording.
- Delete or revoke access tokens after submission (Supabase access token; reset the database password if needed).
- **Done when:** the security checklist is ticked, the scan report is in the protocol.
## Security
 
| Threat | Protection | How we verify |
| --- | --- | --- |
| A photographer sees another's data (IDOR) | RLS on every table, relation checks | pgTAP with two users |
| Guessing or leaking the couple's link | 32-byte token, hash in the database, regeneration, `no-referrer`, `no-store`, no logs | Manual test, log review |
| Leak of the gallery link | Only via token and status; `https://` only | Test on a project without delivery |
| **Database reachable from the internet** | RLS before data, `anon` without table privileges, Security Advisor, fictional data only | pgTAP, Advisor review |
| **Tokens and keys in the VM** | Only URL and anon in `.env.local`; no service-role; access token in Keychain; database password in password manager | File review, gitleaks |
| **Agent destroys database data** | `db reset` and project deletion denied in `settings.json`; no auto-approval; dev project with fictional data | Settings review |
| Malicious library (supply chain) | `npm audit`, OSV-Scanner, Dependabot, lockfile, manual check | CI on every commit |
| Secret leak | `.env*` outside git, gitleaks, `.env*` denied to the agent | History scan |
| XSS via names and location | React escaping, no `dangerouslySetInnerHTML`, CSP, length limits | Manual test |
| Forged status or double signature | Trigger, `unique(project_id)` | pgTAP |
| Agent or package harms the host system | Work only in the VM | Phase 0 requirement |
 
Reviewing every agent command does not guarantee security (a package with a letter from another alphabet looks identical), so the safety net is the VM and the automatic scan.
 
**Checklist before submission**
 
- [ ] RLS tests green, all tables have RLS enabled, `anon` without table privileges
- [ ] `npm audit` and OSV-Scanner without unresolved high/critical
- [ ] gitleaks finds no secrets in the history
- [ ] Tokens and gallery links do not appear in logs, URL parameters or `Referer`
- [ ] Security headers enabled and verified
- [ ] Manual abuse tests recorded in the protocol
- [ ] Only fictional data for the demo
- [ ] No keys in the repo; Supabase access revoked or rotated
- [ ] README with run steps (including setting up your own Supabase project, since the database is in the cloud)
## Nice-to-have
 
Taken only after the Musts and the security checklist, one at a time, following the same cycle.
 
1. Dashboard: upcoming weddings and expected deposits.
2. Stripe Checkout (test mode): a webhook with signature verification changes the status to `Retainer Paid`; requires secrets.
3. PDF contract (`pdf-lib`) in private storage with signed links.
4. Reminders based on `event_date`.
5. Rate limiting on `/book/[token]`.
6. Deletion and export of client data.
7. Limited validity period for the couple's gallery link.
8. Sign in with Google.
9. Signature drawn on a canvas.
10. Stripe Connect Express (only after Checkout).
## Schedule and open questions
 
Phase 0 finishes in SW6, so four weeks remain for Phases 1–8 (SW7–SW10), and SW11 is for the report. The pace is higher than in v1, so the report is written gradually from the protocol, not at the end.
 
| Week | Dates (2026) | Work |
| --- | --- | --- |
| SW6 | 19–25 October | Finish Phase 0; send the exposé |
| SW7 | 26 October – 1 November | Phase 1 (skeleton, CI), Phase 2 (schema, RLS, tests) |
| SW8 | 2–8 November | Phase 3 (authentication), Phase 4 (projects) |
| SW9 | 9–15 November | Phase 5 (packages), Phase 6 (booking flow) |
| SW10 | 16–22 November | Phase 7 (deposit, gallery), Phase 8 (hardening) |
| SW11 | 23–29 November | Report, README, repo invitation; deadline Sunday 29 November, 18:00 |
 
If the delay exceeds 3 days, we first simplify the UI styling. Must features are not dropped without talking to the lecturer.
 
**Assumptions and open questions**
 
- Week numbering is derived from the assumption SW1 = 14 September 2026; check against the timetable.
- Check `sysctl kern.hv_support` in the macOS VM (confirm that Docker is really unavailable) and note the result in the protocol.
- Is a cloud dev project instead of a local database acceptable to the lecturer (tell them in the exposé).
- Whether app deployment is needed for submission, or local run and a demo recording are enough.
- Verify the `supabase test db --linked` command and the rule syntax in `settings.json` against current documentation or `--help` before use.
## Protocol for the report and exam preparation
 
The report assesses the process, not the code, so we keep the protocol from day one. One entry per step:
 
```markdown
## Step N: <title> (<date>)
 
**Scenario and requirements:** which axes (complexity, know-how, security, liability) matter here and why
**Prompts:** what I asked the agent, in which mode, which context I gave
**What the agent did:** brief, no code
**What I checked and understood:** tests, diff reading, explanation in my own words
**What I fixed or rejected:** and why
**Security:** what I checked (scan, abuse tests)
**Requirement changes:** what changed and where it is recorded
```
 
**Mapping of the report (8–12 pages, PDF) to the grading criteria**
 
| Report section | Weight | Source in the protocol |
| --- | --- | --- |
| 1. Introduction, result vs. goals | in "Comprehensibility" (25%) | Summary of phases, what did not work |
| 2. Scenario and its development (LE1) | 20% | "Scenario and requirements" field, entry about the cloud database |
| 3. Strategy and use of AI (LE2) | 25% | Prompts, what worked, where the approach changed, model limits |
| 4. Understanding and ownership (LE3) | 25% | "What I checked and understood"; depth-of-understanding table per component; risks and security (4.5) |
| 5. Quality assurance | 5% | pgTAP, Vitest, scans, manual tests |
| 6. Conclusions | in "Comprehensibility" | Summary at the end |
 
For section 4.5 ("how did you ensure sensitive data did not reach the AI"), the evidence: fictional data, `.env*` denied to the agent, only the anon key in the VM, VM without access to the host system.
 
Submission: repository (README, clean commit history, no secrets, invitation to the lecturer) + report as PDF.
 
**Questions to answer without code in front of me**
 
- Why is the token stored as a hash, and what happens if the database leaks?
- How does RLS prevent photographer A from seeing photographer B's projects, and how is this proven by a test?
- Why does the application not store photos, and which risks does that remove?
- Why a VM and not Docker, and why is reviewing the agent's commands not enough?
- Why is the database in the cloud, which risks did that add (open REST API, tokens) and how are they closed?
- What are the four axes for the project and how would they change in production with payments?
- Where did the agent make a mistake or propose an unsafe solution, and how was it noticed?
- How did the requirements change along the way and what was done about it?
