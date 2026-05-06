# Release Process

Maintainer-facing playbook for shipping plnt-trmnl releases.

## Cadence

Release on demand. Target ~monthly cadence after v1.0.0.

## Pre-release checklist (every release)

Before tagging:

- [ ] **CHANGELOG accuracy** — `## [Unreleased]` is complete and reads well from a user's perspective.
- [ ] **README accuracy** — features list and screenshots still match shipping reality.
- [ ] **INSTALL.md smoke test** — on a clean machine (or fresh VM), `git clone` + follow steps verbatim. Note any rough edges.
- [ ] **ROADMAP review** — close shipped issues, re-prioritize, add discoveries.
- [ ] **Refactor rotation** — pick the next module from the rotating list (see below). Apply small, targeted improvements.
- [ ] **Test suite green** — `cd packages/api && npx vitest run` AND `cd packages/api/client && npm test`. CI must also pass.

## Refactor rotation

Pick one per release. Rotate through:

1. Renderer (`packages/renderer/`)
2. Scheduling module (`packages/api/src/scheduling/`)
3. Database migrations (`packages/api/src/database/`)
4. Client (`packages/api/client/`)
5. Catalog (`packages/api/catalog/`)
6. TRMNL template (`docs/trmnl-templates/`)

Use the slot to: extract duplicated code, improve naming, backfill tests, simplify. Aim for 1-2 hours of work, not a refactor wave.

## Pre-public-flip checklist (one-time, before v1.0.0)

This is the special one-shot checklist run **once** before the repo flips public.

### 1. History audit

Run the audit script:

```bash
./scripts/pre-flip-audit.sh
```

This will fail (exit non-zero) on the first run because the git history contains personal paths from before the Wave 8 cleanup. **That's expected** — it's the trigger for step 2.

### 2. Surgical history rewrite

```bash
# Install git-filter-repo (one-time): brew install git-filter-repo
git filter-repo --replace-text scripts/filter-repo-replacements.txt
```

Then re-run the audit:

```bash
./scripts/pre-flip-audit.sh
```

Expected: exit 0 — no leaks remaining.

Force-push: `git push origin main --force`. (You must coordinate this with any other maintainers — they'll need to re-clone.)

### 3. GitHub Issues audit

```bash
./scripts/audit-issues.sh
```

Manually edit any flagged issues with `gh issue edit N`.

### 4. README final pass

- No author signatures, no internal-only links, no commits referencing private repos.

### 5. Repo settings flip

GitHub → repo → Settings → General → Visibility → **Change to public**.

### 6. Tag v1.0.0

```bash
git tag -a v1.0.0 -m "v1.0.0 — first public release"
git push origin v1.0.0
```

### 7. GitHub Release

Draft a release on GitHub from CHANGELOG `[1.0.0]` content. Publish.

### 8. Announce

- TRMNL Discord
- TRMNL forum thread
- (Optional) Hacker News, /r/houseplants, /r/selfhosted.

## Post-release watch

For one week after a release:

- Watch GitHub Issues for community-reported install bugs.
- Patch release (`v1.0.1`) if any block install. Don't sit on broken installs.
- Update INSTALL.md with any newly-discovered gotchas.
