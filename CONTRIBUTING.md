# Contributing to plant-trmnl

Thanks for considering a contribution. plant-trmnl is a small project run on a small team — this doc keeps coordination cheap.

## Before you start

- Read [`README.md`](README.md), [`ROADMAP.md`](ROADMAP.md), and [`docs/HANDOFF.md`](docs/HANDOFF.md) (~10 min total). They cover the architecture and the current state.
- For repo-internal conventions, [`CLAUDE.md`](CLAUDE.md) is the cheat sheet.
- Check [open issues](https://github.com/tsipotU/plant-trmnl/issues) and the [project roadmap](ROADMAP.md). The roadmap is groupings — Waves 9–14 are loose plans that get firmed up as we pick them up.

## Filing issues

Use the issue templates: **Bug report** or **Feature request**. The templates ask for the things we'll need anyway.

For bugs, include:
- What you expected to happen.
- What actually happened (full error / stack trace if applicable).
- A minimal reproduction (curl / steps in the SPA / log line).
- Your environment: OS, Node version, plant-trmnl commit SHA.

## Filing PRs

Small PRs land faster. As a rough guide:

- **Trivial fixes** (typo, copy edit, one-line bug fix): open a PR, no issue needed.
- **Anything user-visible or that touches more than one file**: open an issue first so we can align on approach. Saves rework on both sides.
- **Anything that touches a wave currently in flight** (see `docs/plans/`): comment on the wave's issue / PR first.

PR title format: `<type>: <brief description> (#<issue>)` if there's an issue, e.g. `feat: add origin field to AddPlant (#35)` or `fix: undo countdown stuck at 15s (#26)`.

## Development setup

```bash
git clone https://github.com/tsipotU/plant-trmnl.git
cd plant-trmnl
nvm use            # pins Node 24
npm ci             # installs API + renderer workspaces
cd packages/api/client && npm ci    # client is NOT a workspace; install separately

# .env from template
cp .env.example .env
# edit .env — at minimum set TRMNL_API_KEY and TRMNL_PLUGIN_UUID for renderer testing

# launch dev (from project root)
npx tsx watch packages/api/src/index.ts      # API on :3900
npx tsx watch packages/renderer/src/index.ts  # renderer on :3901
```

API at `http://localhost:3900/`; live SPA at the same URL.

## Tests

We follow TDD; please write tests with your change. The suites are split:

```bash
# from packages/api/
npm test   # API + renderer (vitest, node env)

# from packages/api/client/
npm test   # client (vitest + jsdom)
```

CI (`.github/workflows/test.yml`) runs both on every push and PR. Don't merge with red CI.

**Resource note:** `vitest` is capped at `maxForks: 2` in the configs. Don't raise that without discussing — see `docs/incidents/2026-04-23-vitest-resource-exhaustion.md` for why.

## Style

We use TypeScript everywhere. The repo has an `.editorconfig` and `tsconfig.base.json`; please don't fight them. Notable conventions:

- 2-space indent, LF line endings, UTF-8.
- `pino` for structured logging — no `console.log` in production code.
- `better-sqlite3` is sync; don't mix with async DB patterns.
- Schema migrations: every column needs both the `CREATE TABLE` entry **and** a call to `addColumnIfMissing` at the bottom of `initializeSchema`. See `CLAUDE.md` for details.
- Express 5 style: `async` route handlers, no callback-style error middleware.

## Commit messages

Conventional-ish, but not strict. Useful prefixes:

- `feat:` user-visible feature
- `fix:` bug fix
- `chore:` housekeeping
- `docs:` doc-only change
- `refactor:` no behavior change
- `test:` test-only change

One-line summary, optional body. Reference the issue (`Closes #N` / `Refs #N`) when relevant.

## Wave cadence

We bundle related issues into "waves" — each wave gets a design doc, a plan doc, a single squash-merge PR, and a CHANGELOG entry. See `docs/plans/` for the wave currently in flight, `docs/archive/` for past waves, and `ROADMAP.md` for what's coming.

If your contribution fits an upcoming wave, that's great — flag it and we'll align. If it doesn't fit any wave (small fixes, drive-by improvements), it goes in directly.

## Code of conduct

By contributing, you agree to abide by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Security

Don't open a public issue for security findings. See [`SECURITY.md`](SECURITY.md).
