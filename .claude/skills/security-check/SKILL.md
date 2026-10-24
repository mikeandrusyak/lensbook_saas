---
name: security-check
description: Run the project's security and quality checks (dependency audit, secret scan, lint, tests) and summarise the result.
---
Run, in this order, and report each result briefly:
1. npm audit --audit-level=high
2. osv-scanner scan --lockfile package-lock.json
3. gitleaks dir . --redact
4. npm run lint, then npm test (only if the scripts exist)
Do not fix anything automatically and do not install packages.
Finish with a list: what passed, what failed, what needs a human decision.
