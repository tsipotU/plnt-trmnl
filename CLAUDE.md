# Plant TRMNL — agent entry point

Both human contributors and AI agents share the same conventions
file. Read **[`docs/conventions.md`](docs/conventions.md)** first —
project overview, architecture, directory layout, conventions,
test-execution rules, and every gotcha that's been catalogued.

For status: [`ROADMAP.md`](ROADMAP.md) (forward) +
[`CHANGELOG.md`](CHANGELOG.md) (back) +
[`docs/HANDOFF.md`](docs/HANDOFF.md) (current snapshot).

## Agent-specific notes

These don't belong in human-facing docs but agents working on this
repo should know them:

- **Parallel agents share the working directory.** Without explicit
  worktree isolation, 2+ concurrent agents will clobber each other's
  branches and produce stale checkouts. Either serialize agents or
  set `isolation: "worktree"` in the dispatcher config when
  spawning.
- **Don't push without an explicit user instruction.** The default
  here is local-only commits. The user pushes when they're ready.
- **CLAUDE.md updates are non-negotiable.** When you learn something
  new, fix an issue, or create docs, update `docs/conventions.md`
  (or this file for agent-specific items). Treat it as part of the
  task, not an afterthought.
