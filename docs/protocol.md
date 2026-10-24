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

## Step 0: Environment (2026-10-24)
- **Scenario and requirements:** Security high (personal data, public route); know-how high.
- **Change of requirement:** local Supabase planned, but Docker is not available in
  the macOS VM. Switched to a cloud DEV project with fictional data only.
  Mitigations: only URL + anon key in the VM, access token in Keychain, destructive
  commands denied for the agent, no auto-approval.
- **Why a VM and not Docker:** (write in your own words)
