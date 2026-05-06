# Contributing to plnt-trmnl

Thanks for considering a contribution. plnt-trmnl is a small project
with a small team — this doc keeps coordination cheap and tells you
where the project's conventions live so you can land a PR that won't
churn in review.

## Welcome + scope

The project is **pre-v1.0**. Right now we want PRs that:

- **Fix bugs** — even drive-by ones. No issue needed for one-line
  fixes.
- **Improve the design system catalog** — a missing variant, a
  story we forgot to ship, a Foundations page we missed.
- **Improve docs** — install gotchas, missing conventions, broken
  links.
- **Land a feature from the ROADMAP** — see
  [`ROADMAP.md`](ROADMAP.md). Comment on the relevant issue first
  so we can align on shape.

We are **not** looking for:

- Large refactors of working code without a documented motivation.
- New features outside the roadmap. Open an issue first.
- Test-coverage churn that doesn't change behavior.

## Before you start

Read these in order — about 15 minutes total:

1. [`README.md`](README.md) — what the project does and the
   architecture diagram.
2. [`docs/conventions.md`](docs/conventions.md) — the canonical
   conventions and gotchas reference. **Most contributor traps live
   here.** Read it before opening your first PR.
3. [`ROADMAP.md`](ROADMAP.md) — what we're working toward.
4. [`docs/HANDOFF.md`](docs/HANDOFF.md) — the current snapshot.
   What's in flight, what just shipped.

If you'll be touching the React frontend, also browse the live
catalog:

→ **Storybook: <https://tsipotU.github.io/plnt-trmnl/>**

The catalog has 9 atoms, 26 molecules, and 6 Foundations docs
pages (Composition, Naming, Color, Accessibility, Theming, Adding a
molecule). Read **Adding a molecule** before building a new
component.

## Local setup

```bash
git clone https://github.com/tsipotU/plnt-trmnl.git
cd plnt-trmnl
nvm use                                # pins Node 24 (.nvmrc)
npm ci                                 # API + renderer workspaces
cd packages/api/client && npm ci       # client is NOT a workspace; install separately

cp .env.example .env                   # edit before running
```

Run dev servers from the project root in three terminals:

```bash
# API on :3900 — also serves the SPA
npx tsx watch packages/api/src/index.ts

# Renderer on :3901 — TRMNL screenshot generator
npx tsx watch packages/renderer/src/index.ts

# Storybook on :6006 — live catalog
cd packages/api/client && npm run storybook
```

Run tests:

```bash
# API + renderer suites (vitest, node env)
cd packages/api && npm test

# Client suite (vitest + jsdom)
cd packages/api/client && npm test
```

Both suites must be green. CI ([`.github/workflows/test.yml`](.github/workflows/test.yml))
runs them on every push and PR.

**Resource cap.** Vitest is configured with `pool: 'forks'` +
`maxForks: 2` — do not raise without reading
[`docs/incidents/2026-04-23-vitest-resource-exhaustion.md`](docs/incidents/2026-04-23-vitest-resource-exhaustion.md).

## Repo layout

See [`docs/conventions.md#directory-layout`](docs/conventions.md#directory-layout)
for the full tree. The headlines:

- `packages/api/` — Express API + SQLite + the React SPA inside
  `client/` (NOT an npm workspace; install it separately as above).
- `packages/renderer/` — TRMNL screenshot renderer.
- `docs/` — design specs, plans, incidents, this file's neighbours.
- `scripts/` — repo hygiene scripts.

## Test conventions

We follow TDD. Tests live next to the code they cover
(`Foo.tsx` + `Foo.test.tsx`). Useful patterns:

- **Mock fetch with `vi.stubGlobal`** in `beforeEach`. The pattern
  is repeated across most page tests; copy from a recent one.
- **Test pages by querying for the molecule's accessible names**
  rather than asserting on classnames. See "Testing through
  molecules" in
  [Composition](https://tsipotU.github.io/plnt-trmnl/?path=/docs/foundations-composition--docs).
- **`Element.prototype.scrollIntoView = vi.fn()`** in `beforeEach`
  for components that scroll on mount — jsdom doesn't implement it.
- **Never mix runners.** Client `.test.tsx` files only run under
  the client config (jsdom + Testing Library). API tests run under
  the API config (node env, no DOM).

For a quick reference of the project-specific test traps see
[`docs/conventions.md#frontend`](docs/conventions.md#frontend).

## Filing issues

Use the templates: **Bug report** or **Feature request**. They ask
for what we need.

For bugs, include:

- What you expected to happen.
- What actually happened (full error / stack trace if applicable).
- A minimal reproduction (curl, steps in the SPA, log line).
- Your environment: OS, Node version, plnt-trmnl commit SHA.

For features, include:

- The user need (not the implementation).
- How it'd interact with existing flows (Today, calibration,
  enrichment, archive, …).
- An optional sketch of UI shape if it's a frontend ask.

Labels are applied by maintainers — don't worry about them when
filing.

## Filing PRs

Size guidance:

- **Trivial fixes** (typo, copy edit, one-line bug fix): open a
  PR, no issue needed.
- **Anything user-visible or that touches multiple files**: open an
  issue first so we can align on approach. Saves rework on both
  sides.
- **Anything that touches a wave currently in flight** (see
  `docs/plans/`): comment on the wave's issue / PR first.

PR title: `<type>: <brief description> (#<issue>)`. Examples:
`feat: add origin field to AddPlant (#35)`,
`fix: undo countdown stuck at 15s (#26)`.

PR body: what changed and why. If your PR adds a catalog primitive,
include a Storybook link to the new story. If you changed a public
API, note it.

We squash-merge. Your commit history during review can be messy —
the squashed commit message is what we keep.

### Commit messages

Conventional-ish, not strict:

- `feat:` user-visible feature
- `fix:` bug fix
- `refactor:` no behavior change
- `docs:` doc-only change
- `test:` test-only change
- `chore:` housekeeping
- `ci:` CI / build config

One-line summary; optional body. Reference the issue
(`Closes #N` / `Refs #N`) when relevant.

## Working with the design system

The catalog ships in `packages/api/client/src/components/atoms/` and
`molecules/`. Every component has a sibling `.stories.tsx` —
**story coverage is 100% and we keep it that way.**

Before building a new component:

1. Browse the live catalog at
   <https://tsipotU.github.io/plnt-trmnl/>.
2. If the thing you need exists, compose it.
3. If it doesn't, decide between **page-local** or **molecule**.
   Read the **Adding a molecule** Foundations page for the
   decision tree.

Conventions in short (full version on the Foundations pages):

- Every CSS class begins with `p7l-`. See
  [Naming](https://tsipotU.github.io/plnt-trmnl/?path=/docs/foundations-naming--docs).
- Components consume only semantic tokens (`--ink`, `--bg`,
  `--accent`, …) — never raw scales. See
  [Color in practice](https://tsipotU.github.io/plnt-trmnl/?path=/docs/foundations-color--docs).
- A new molecule = `<Name>/<Name>.tsx` + `<Name>.css` +
  `<Name>.stories.tsx` + (optional) `<Name>.test.tsx`. No
  `index.ts` re-exports.
- Light/dark theme is a re-mapping in `tokens.css`; verify both in
  the Storybook toolbar before opening your PR.

### Promotion from page-local

If you're extracting a page-local component into the catalog
because a second consumer arrived, see the **Promotion from
page-local** section of the Adding-a-molecule cookbook in
Storybook. Three concrete steps: extract → generalize the API →
update both consumers + add a story.

### `@legacy` tagged components

Some files in `packages/api/client/src/components/` predate the
catalog and carry a `@legacy` JSDoc tag. They still work, but new
code should compose catalog primitives instead of copying their
inline-styled patterns. If you're modifying a `@legacy` file
substantially, consider rebuilding it from catalog primitives in
the same PR.

## Working with the API

- `packages/api/src/routes/` — one file per resource. Express 5,
  async handlers, pino logs.
- Schema migrations: every column needs both the `CREATE TABLE`
  entry **and** a call to `addColumnIfMissing` at the bottom of
  `initializeSchema`. See
  [`docs/conventions.md#schema-migrations`](docs/conventions.md#schema-migrations).
- `next_water_date` mutations must funnel through
  `scheduleNextWater(...)` + `logScheduleEvents(...)`. See
  [`docs/conventions.md#database--scheduling`](docs/conventions.md#database--scheduling).
- All scheduling queries must filter `WHERE archived = 0`.
- Auth: the `requireAuth` middleware is **scoped to `/api/*`**.
  Don't re-mount it globally — see the auth-gate gotcha in
  conventions.md.

## Working with the catalog (the species data, not the components)

The 444-species catalog lives at
`packages/api/catalog/plants.json`. It is **strict-validated at
boot** — the API will not start if validation fails.

Adding a new species entry requires:

- One of the 12 valid categories (`foliage`, `flowering`, …)
- A unique kebab-case slug.
- Exactly 15 conditions, exactly 15 unique facts, exactly 4
  placement_tips.
- A `light_profile` with values from the 4-element light enum.

The validator at `packages/api/src/catalog/loader.ts` is your
source of truth for what's required.

## Code of conduct

By contributing, you agree to abide by
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Security

Don't open a public issue for security findings. See
[`SECURITY.md`](SECURITY.md).

## Maintainer notes

For wave planning, release process, and the post-merge ritual see
[`docs/RELEASE-PROCESS.md`](docs/RELEASE-PROCESS.md).
