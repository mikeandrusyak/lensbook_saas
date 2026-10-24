# Protocol

## Template (one entry per step)
- **Scenario and requirements:** which axes (complexity, know-how, security, liability) matter and why
- **Prompts:** what I asked the agent, in which mode, which context
- **What the agent did:** short, no code
- **What I checked and understood:** tests, diff reading, own explanation
- **What I fixed or rejected:** and why
- **Security:** what I verified
- **Requirement changes:** what changed and where it is recorded

---

## Step 1.1: Next.js scaffold

- **Scenario and requirements:** Security (supply chain): every new package is a trust decision. Know-how: I must be able to explain every config file.
- **Prompts:** Plan mode; asked for a plan with exact commands, files and every package (name, purpose); then approved with changes.
- **What the agent did:** Dropped create-next-app (non-empty dir with package.json), scaffolds by hand; verified packages via npm view; installed deps; wrote .gitignore, tsconfig.json.
- **What I checked and understood:** Read the agent's explanation of tsconfig options
  and accepted it; at this point I understand it conceptually only (strict = stricter
  type checks, paths = import alias). isolatedModules and moduleResolution: bundler
  are a black box for now.
- **What I fixed or rejected:**
  - Agent suggested TypeScript 7.0.2 (published that day, Next support unverified): I required 5.x.
  - I demanded a peer-dependency check; agent found likely conflict eslint 10 vs eslint-config-next (inferred from declared ranges) and switched to eslint 9 without --force. The real install then showed no ERESOLVE.
  - Agent claimed unrs-resolver's postinstall was not run; on my question it admitted it could not prove this (evidence: npm notice, ignore-scripts=false). Script is harmless (checks native binding).
- **Security:** npm audit 0 vulnerabilities; only unrs-resolver has an install script; OSV-Scanner baseline in docs/scan-baseline.md; telemetry disabled.
- **Requirement changes:** None.
