---
name: step-log
description: Draft an entry for docs/protocol.md after a development step. Use when the user says a step is done or asks for a protocol entry.
---
Ask the user for anything you cannot see in the conversation, then append a draft
entry to docs/protocol.md using the template at the top of that file.
Fields: scenario and requirements (4 axes), prompts, what the agent did,
what I checked and understood, what I fixed or rejected, security, requirement changes.
Rules: be short, no code dumps. Never invent what the user "understood"; leave
that field for the user to fill in or confirm.
