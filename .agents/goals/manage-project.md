# Manage Project — GROOM Workflow

## Goal

Review and improve Plant TRMNL's project health using local specs and the GitHub issues. Keeps the backlog honest, surfaces drift between specs and issues, and produces opinionated recommendations.

**This is a read-then-confirm workflow.** No GitHub changes without user confirmation.

**GROOM** is a 5-step process:

| Step | Phase | What You Do |
|------|-------|-------------|
| **G** | Gather | Load state: local docs, GitHub issues, milestones |
| **R** | Review | Health check: milestones, blockers, stale issues |
| **O** | Overlay | Compare specs (docs/specs/, docs/plans/) with issues; find gaps |
| **O** | Opine | Re-assess priorities; produce opinionated next steps |
| **M** | Make changes | Present report, confirm, apply approved changes |

## G — Gather

### Load local context
1. Read `CLAUDE.md` — conventions, stack decisions, gotchas
2. Read `docs/specs/` — design specifications (source of truth for features)
3. Read `docs/plans/` — implementation plans (sequencing and tasks)
4. Note open items in plans (unchecked boxes = not yet built)

### Load GitHub state
1. Milestones: `gh api repos/{owner}/plant-trmnl/milestones --paginate`
2. Issues: `gh issue list --repo {owner}/plant-trmnl --state all --limit 200 --json number,title,labels,milestone,state,updatedAt,body`
3. Recent commits: `gh api repos/{owner}/plant-trmnl/commits?per_page=20`

> Replace `{owner}` with the actual GitHub username/org.

## R — Review

### Milestone health
- Progress ratio per milestone (closed vs open issues)
- Missing specs (issues without matching design doc coverage)
- Blockers (issues blocking multiple others)
- Orphan issues (no milestone assigned)

### Issue health
- Stale (>2 weeks without update during active development)
- Empty bodies (missing acceptance criteria)
- Duplicate signals
- Issues that are done but not closed

### Container scope clarity
Every issue should be clearly scoped to:
- `plant-api` — API, database, business logic
- `plant-renderer` — TRMNL display, screenshot, cron
- `both` — cross-cutting (Docker Compose, config, infra)

Flag issues where the container scope is ambiguous.

## O — Overlay

### Spec -> Issue
For each feature in `docs/specs/`: does a matching issue exist? Flag gaps.

### Issue -> Spec
For each open issue: is it covered by the design spec or plan? Flag issues that have drifted from the spec.

### Plan -> Issue
For each unchecked task in `docs/plans/`: is there a matching open issue? Surface tasks that have no issue tracking them.

### Body drift
Has the spec changed significantly since an issue was written? Flag issues with outdated acceptance criteria.

## O — Opine

Be direct. One recommendation per paragraph. State what to do and why.

Consider:
1. Recent commits changing what comes next
2. Spec gaps in the active milestone (blockers to shipping)
3. CLAUDE.md gotchas that should be reflected in issue acceptance criteria
4. Milestone balance (over-scoped? under-specced?)
5. Hidden dependency chains between plant-api and plant-renderer features

Priority signals for Plant TRMNL:
- **Data correctness first** — archived plant leaks and scheduling bugs block everything
- **Mobile UX second** — watering log is primary daily interaction
- **TRMNL display third** — valuable but not blocking core use
- **Enrichment (n8n) last** — nice-to-have, degrades gracefully

## M — Make changes

Present report, ask: "Which actions should I apply?"
- "All" -> apply everything
- Named items -> apply only those
- "None" -> report only

Actions via `gh` CLI:
| Action | Command |
|--------|---------|
| Create issue | `gh issue create --repo {owner}/plant-trmnl --title "..." --body "..."` |
| Update body | `gh issue edit N --repo {owner}/plant-trmnl --body "..."` |
| Re-milestone | `gh api repos/{owner}/plant-trmnl/issues/N --method PATCH --field milestone=M` |
| Close issue | `gh issue close N --repo {owner}/plant-trmnl` |
| Add label | `gh issue edit N --repo {owner}/plant-trmnl --add-label "..."` |

## Anti-Patterns
- Don't make changes without confirming
- Don't be vague in recommendations
- Don't skip the Overlay step
- Don't flag everything as urgent — pick top 3-5
- Don't assess priority without reading recent commits
- Don't create issues for CLAUDE.md gotchas — those are dev conventions, not features
