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
