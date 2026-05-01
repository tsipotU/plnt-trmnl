# `docs/` — what lives where

Index for the documentation directory. Most of these grow over time;
this file shouldn't.

## Always-current

| File | Purpose |
|---|---|
| [`conventions.md`](conventions.md) | Canonical reference for architecture, conventions, and every gotcha that's been catalogued. **Read this before your first PR.** |
| [`HANDOFF.md`](HANDOFF.md) | Current snapshot — what just shipped, what's in flight, what's blocked. Updated at every session wrap. |
| [`RELEASE-PROCESS.md`](RELEASE-PROCESS.md) | Maintainer playbook for cutting a release. |

## Wave-scoped (rotates over time)

| Directory | Purpose |
|---|---|
| [`specs/`](specs/) | Design specs for the active and recent waves. One file per spec, dated. |
| [`plans/`](plans/) | Implementation plans for waves currently in flight. |
| [`archive/`](archive/) | Past wave plans + specs (Waves 1–8). Reference only — don't modify. |

## Append-only

| Directory | Purpose |
|---|---|
| [`incidents/`](incidents/) | Post-mortems. Each file documents one incident: what happened, what we changed to prevent recurrence. Institutional memory. |
| [`mockups/`](mockups/) | Design mockups referenced from README and specs. |
| [`trmnl-templates/`](trmnl-templates/) | Liquid templates for the TRMNL plugin (paste into the device's Plugin → Full view). |

## When in doubt

Top-level repo docs — `README.md`, `INSTALL.md`, `CONTRIBUTING.md`,
`ROADMAP.md`, `CHANGELOG.md`, `CLAUDE.md` — handle the things every
contributor needs first. Anything specialist enough to live in a
subdirectory of `docs/` is one of the categories above.
