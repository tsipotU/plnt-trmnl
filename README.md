# 🪴 p7l — plnt-trmnl

A houseplant care companion for [TRMNL](https://usetrmnl.com/) e-ink
displays + a mobile-first web app.

p7l shows you which plants need water today on your TRMNL screen,
learns each plant's actual cadence in YOUR home through quick
calibration taps, and surfaces care suggestions when something looks
off. It's designed for the 30-second "am I watering today?" check at
the kitchen sink — and to look quietly beautiful on your wall the
rest of the day.

![p7l mockup](docs/mockups/watering-1-plant.png)

## What it does

Two surfaces, one source of truth:

1. **A TRMNL e-ink screen** that shows the day's watering plan and a
   rotating plant fact, dithered for the device.
2. **A mobile-first web app** for quick logging — water, undo,
   calibrate, log notes — designed for one-handed use at the sink.

Schedules adapt to your home: every watering produces a 1–5
calibration tap that nudges the interval; growing-season + heating-
season modifiers stack on top. Plant care data comes from a curated
444-species catalog with free-text fallback for anything not in it.

## Status

**Pre-v1.0.** Repo is public, OSS-readiness work is in, design-system
catalog is live at the Storybook URL below. The PWA install + offline
support shipped in Wave 15 (#59) — installable home-screen app with
the design-system app icon + Background Sync queue for offline writes.
The TRMNL e-ink identity work (#7, Wave 14) was reframed mid-design
when we surfaced a brand-bridge gap: Storybook is the canonical brand
catalog for the web/PWA surface but doesn't extend onto the e-ink
rendering surface. That's tracked as #197 in the v1.1 backlog.
Battle-tested on a single household with ~100 plants over six months.

- See [`ROADMAP.md`](ROADMAP.md) for what's next.
- See [`CHANGELOG.md`](CHANGELOG.md) for what shipped.

## Quickstart

```bash
git clone https://github.com/tsipotU/plnt-trmnl.git
cd plnt-trmnl
cp .env.example .env       # edit TRMNL keys + admin password
docker compose up -d
open http://localhost:3900 # claim the instance with the setup token from the API logs
```

For the long version (TRMNL plugin setup, AI tool wiring, backups,
troubleshooting), see [`INSTALL.md`](INSTALL.md).

## Storybook

The component catalog (9 atoms · 26 molecules · 3 nav · 7 Foundations docs
pages) is published on every push to `main`:

→ **<https://tsipotU.github.io/plnt-trmnl/>**

A new contributor can browse every primitive, see every variant,
and read the conventions before cloning.

## Architecture at a glance

Two services in one Docker Compose network. SQLite database, no
external service dependencies.

| Service | Port | Purpose |
|---|---|---|
| `plant-api` | 3900 | REST API + SQLite + serves the SPA |
| `plant-renderer` | 3901 | TRMNL screenshot renderer + push cron |

**Enrichment is pull-based.** plnt-trmnl owns plant state; an
external AI tool (Claude Desktop scheduled task is the canonical
recipe) polls for pending enrichments and POSTs results back. There
is no in-process LLM, no API key, no metered billing.

For deeper architecture see
[`docs/conventions.md`](docs/conventions.md).

## Tech stack

- **Runtime:** Node.js 24 + TypeScript
- **API:** Express 5, better-sqlite3 (WAL mode)
- **Frontend:** React 19 + Vite, design system in Storybook 10
- **Tests:** vitest (jsdom for client, node for API)
- **Infra:** Docker Compose, deployable to any Linux host or Pi

## Documentation map

| File | What's in it |
|---|---|
| [`README.md`](README.md) | This file |
| [`INSTALL.md`](INSTALL.md) | Self-host walkthrough + AI tool recipes |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to land a PR |
| [`docs/conventions.md`](docs/conventions.md) | Architecture, conventions, every gotcha |
| [`ROADMAP.md`](ROADMAP.md) | Forward plan |
| [`CHANGELOG.md`](CHANGELOG.md) | What shipped when |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Current snapshot for new contributors |
| [`docs/RELEASE-PROCESS.md`](docs/RELEASE-PROCESS.md) | Maintainer playbook |
| [`SECURITY.md`](SECURITY.md) | Reporting security issues |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Community expectations |

## Contributing

Issues and PRs welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for
local setup, test conventions, and how the design system catalog
works. Browse [`Storybook`](https://tsipotU.github.io/plnt-trmnl/)
to see what's already in the catalog before building something new.

## License

MIT. See [`LICENSE`](LICENSE).

## Commercial use

MIT means you can technically do whatever, but plnt-trmnl is a
community project that exists because hobbyist self-hosters wanted
something nice for their plants. A few asks that aren't legally
binding but matter:

- **If you fork it, contribute back the fixes.** Especially anything
  in the catalog (new species, better facts, image improvements).
  The 444-species catalog is hand-curated and improves through use.
- **If you build a commercial product on it, talk to me first.**
  Not to ask permission — to coordinate. I'd rather know than read
  about it on Hacker News.
- **Credit the project.** A "built on plnt-trmnl" line in your
  README, settings page, or about screen is enough.

If something here goes against the spirit of how you're thinking
about using it, that's signal — open an issue and we'll talk.
