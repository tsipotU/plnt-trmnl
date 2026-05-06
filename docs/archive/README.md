# Archive — historical wave plans

This directory holds **shipped** wave plans, designs, and manual-test docs from Waves 1–8 of plnt-trmnl. They're preserved for context (and the occasional "why was this decision made?") but no longer reflect active work.

For the current state, read top-to-bottom:

1. [`../../CHANGELOG.md`](../../CHANGELOG.md) — what shipped when.
2. [`../../ROADMAP.md`](../../ROADMAP.md) — what's next.
3. [`../HANDOFF.md`](../HANDOFF.md) — current snapshot.

## What's in here

| File | Wave | Shipped |
|---|---|---|
| `2026-04-07-plnt-trmnl-plan.md` | Wave 1 — initial scaffold | v0.0.1 |
| `2026-04-22-feedback-system-plan.md` | feedback feature | v0.1.0 (#19) |
| `2026-04-22-wave-3-plan.md`, `2026-04-22-wave-3-design.md` | Wave 3 — batch water + calendar + bin-packer | v0.3.0 |
| `2026-04-22-wave-progress.md` | running tracker (closed) | v0.x |
| `2026-04-23-feedback-triage-plan.md` | one-off triage (closed) | n/a |
| `2026-04-24-issue-36-design.md` | growing-season + dormancy | v0.5.0 |
| `2026-04-24-wave-5-{plan,manual-test}.md` | Wave 5 — catalog + facts rotation | v0.5.0 |
| `2026-04-24-wave-6-{design,plan,manual-test}.md` | Wave 6 — nav shell + PLNT branding | v0.6.0 |
| `2026-04-25-wave-7-{design,plan}.md` | Wave 7 — n8n removal | v0.7.0 |
| `2026-04-25-wave-8-{design,plan,manual-test}.md` | Wave 8 — community-installable | merged 2026-04-25 |

## When to read these

- You're investigating why a particular pattern exists (`git blame` will surface the relevant plan).
- You're starting a new wave that touches the same area and want to see prior decisions.
- You're writing a retrospective.

Otherwise: skip them. The current docs cover what you need.
