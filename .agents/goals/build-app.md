# Build App — ATLAS Workflow

## Goal

Build features and capabilities for Plant TRMNL using the GOTCHA framework. Every feature is scoped to one of two containers (plant-api, plant-renderer) and follows the conventions in CLAUDE.md.

**ATLAS** is a 5+2 step process:

| Step | Phase | What You Do |
|------|-------|-------------|
| **A** | Architect | Define problem, users, success metrics, feature scope |
| **T** | Trace | Data schema, integrations map, API contracts, env vars |
| **L** | Link | Validate ALL connections before building (DB access, webhook URLs, env vars) |
| **A** | Assemble | Build routes, DB migrations, React components, tests |
| **S** | Stress-test | Run tests, error paths, security guardrails |
| **+V** | Validate | No hardcoded secrets, token auth on renderer, input sanitization |
| **+M** | Monitor | Health checks, event log, Docker restart policies, backup verification |

## A — Architect

Define what you're building before writing code.

### Questions to Answer

1. **What is this feature?** — One sentence describing what it does
2. **Who is this for?** — Emiel (plant care logging on mobile + TRMNL display)
3. **What does success look like?** — Measurable outcome
4. **Which container does this live in?** — `plant-api` (3900), `plant-renderer` (3901), or both
5. **What are the constraints?** — DB synchronous access, renderer has no direct DB access, archived plants always filtered

### Output
- Feature brief (problem, scope, success criteria, constraints)
- Design doc at `docs/plans/{date}-{name}-design.md`

## T — Trace

### Data Schema
- SQLite tables this feature reads/writes
- WAL mode always enabled (`db.pragma('journal_mode = WAL')`)
- Archived plants always filtered (`WHERE archived = 0`)
- Env vars required (add to `.env.example` if new)

### Integrations Map
| Service | Purpose | Auth Type | Direction |
|---------|---------|-----------|-----------|
| n8n webhook | Plant enrichment (care schedule, species data) | Bearer token | API → n8n |
| TRMNL webhook API | Push plugin payload to e-ink display | Bearer token | renderer → TRMNL |
| plant-api (internal) | Renderer fetches data | API_INTERNAL_URL | renderer → api |

### Edge Cases
- n8n enrichment failure: API must return partial data, not 500
- Empty plant list: renderer must show a friendly empty state
- Network errors between containers: renderer retries with backoff
- TRMNL fetches on its own schedule: renderer pre-renders and serves a static image

## L — Link

### Connection Validation
```
[ ] DB file exists and is readable
[ ] WAL mode pragma confirmed
[ ] All required env vars present in .env.example
[ ] n8n webhook URL reachable (if applicable)
[ ] TRMNL webhook URL and token verified (if applicable)
[ ] API_INTERNAL_URL resolves inside Docker network
[ ] Docker Compose health checks pass for both containers
[ ] No archived plant leaking into any query result
```

## A — Assemble

### Build Order (plant-api)
1. DB migration — new table or column additions
2. Repository layer — typed query functions
3. Route handlers — Express 5 async handlers (no callback-style error handling)
4. Input validation — Zod schemas for request bodies
5. Tests — vitest unit + integration tests (TDD: tests first)
6. Env var — add to `src/config.ts` validation and `.env.example`

### Build Order (plant-renderer)
1. API client — typed fetch against plant-api endpoints
2. React component — mobile-first (iPhone 15 Pro, 393×852)
3. TRMNL screenshot route — screenshot cron + static image serving
4. Tests — vitest for logic, visual smoke test
5. Env var — add to config and `.env.example`

### Quality Checklist
```
[ ] All env vars validated on startup (fail fast)
[ ] No hardcoded secrets or URLs in source files
[ ] Pino used for all logging (no console.log)
[ ] better-sqlite3 used synchronously (no async/await on DB calls)
[ ] Express 5 async route handlers throughout
[ ] WAL pragma applied on DB open
[ ] Archived plants filtered in all scheduling queries
[ ] Touch targets >= 44px for mobile UI elements
```

## S — Stress-test

### Tests
```
[ ] All new tests pass (vitest)
[ ] Existing tests still pass (no regressions)
[ ] Error paths tested: enrichment failure, empty list, network errors
[ ] Archived plant filter tested (archived plants must not appear)
```

### Integration
```
[ ] API routes respond correctly (happy path + error cases)
[ ] Renderer fetches from API via API_INTERNAL_URL correctly
[ ] TRMNL webhook payload matches expected schema
[ ] Docker Compose: both containers start, health checks green
[ ] Cron job triggers on schedule (renderer screenshot cron)
```

## +V — Validate (Production)

```
[ ] No hardcoded secrets, API keys, or internal URLs in source
[ ] Token auth enforced on renderer endpoints (RENDERER_TOKEN)
[ ] All external inputs sanitized (plant names, notes, webhook payloads)
[ ] Zod validation on all API request bodies
[ ] SQL parameters use placeholders (no string interpolation)
[ ] .env.example updated with any new vars (no defaults for secrets)
```

## +M — Monitor (Production)

```
[ ] Docker Compose restart: unless-stopped on both containers
[ ] Health check endpoints respond at /health (api) and /health (renderer)
[ ] Event log (pino structured JSON) captures key lifecycle events
[ ] SQLite backup strategy verified (WAL file included)
[ ] Container logs accessible via docker compose logs
```

## GOTCHA Layer Mapping

| ATLAS Step | GOTCHA Layer |
|------------|--------------|
| Architect | Goals (define the process) |
| Trace | Context (design specs) + Args (env var schema) |
| Link | Args (environment setup) |
| Assemble | Tools (routes, queries, components) + Orchestration (Docker Compose) |
| Stress-test | Orchestration (tests validate) |

## Related Files

- `CLAUDE.md` — Conventions, gotchas, stack decisions
- `docs/specs/2026-04-07-plant-trmnl-design.md` — Design specification
- `docs/plans/2026-04-07-plant-trmnl-plan.md` — Implementation plan
- `.env.example` — All required environment variables
- `docker-compose.yml` — Container orchestration
