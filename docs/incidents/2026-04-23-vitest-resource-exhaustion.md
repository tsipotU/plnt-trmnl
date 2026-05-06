# Incident: Vitest Resource Exhaustion → System Freeze

**Date:** 2026-04-23 (second occurrence; first was 2026-04-22)
**Severity:** High — system unresponsive, recovery required SSH intervention
**Context:** Wave 4b work on plnt-trmnl

## What happened

During test execution, multiple long-running Vitest worker processes were spawned, causing severe resource exhaustion on the Mac Mini.

Observed:
- Several `node (vitest …)` processes in parallel
- One worker reached ~800MB RAM, others ~100–250MB each
- Combined CPU usage >80%
- macOS entered heavy memory pressure (compression + swap activity)
- UI became unresponsive (beachball, VNC froze)
- Offending PIDs killed via SSH: 60755, 60715, 60984, 60756

OrbStack was **not** the cause — its processes remained at ~50–60MB.

## Root cause

Vitest defaulted to unbounded worker parallelism (pool size ≈ CPU count). With plnt-trmnl's heavy deps (Claude Agent SDK, better-sqlite3 native bindings, full module graphs per worker), each worker's resident set was large enough that the aggregate crossed the memory-pressure threshold before any test suite could finish.

Contributing factors:
- No `maxForks` / `maxWorkers` cap in any of the three vitest configs
- No `testTimeout` / `hookTimeout` — hung tests could run indefinitely
- `threads` pool (default) shares native state awkwardly with `better-sqlite3` and the Claude Agent SDK

## Fix applied

1. **All three vitest configs** now use `pool: 'forks'` with `maxForks: 2, minForks: 1` and 10s timeouts:
   - `packages/api/vitest.config.ts`
   - `packages/api/client/vitest.config.ts`
   - `packages/renderer/vitest.config.ts` (created — previously missing)

2. **`CLAUDE.md`** now has a "Test Execution Rules (Resource Safety)" section codifying:
   - `npm test` only, never bare `vitest` or `--watch` on this machine
   - Tiered response to long runs: check progress before killing
   - `sample <pid> 3` for stack-trace diagnosis
   - Hard ceiling: 3GB total vitest RSS = unconditional kill
   - Never call real Claude Agent SDK inside tests without mocks

3. **Package scripts** were already correct: `test` = `vitest run`, `test:watch` explicit. No change needed there.

## What to watch for

- If a future contributor raises `maxForks` for speed, verify it under load on this machine before merging.
- The Claude Agent SDK mock hygiene rule is the one most likely to be violated — a single un-mocked SDK call in a test can re-introduce the 800MB-worker pattern even with the fork cap in place.
- If a third occurrence happens despite these controls, escalate to Layer 3: a launchd watchdog that kills any process over 3GB RSS for >60s.
