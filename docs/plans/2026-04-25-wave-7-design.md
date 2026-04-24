# Wave 7 Design — n8n removal + AddPlant flake fix

**Date:** 2026-04-25
**Wave:** 7
**Issues touched:** #52 (comment, scope trim), #56 (comment, defer), #58 (comment, defer). No auto-closes.
**Target shape:** single squash-merge PR, branch `feat/wave-7-cleanup`.

## 1. Summary

Wave 7 is a small cleanup wave. It deletes the n8n-specific enrichment client (webhook + retry handlers + their tests + config vars) now that the Claude Agent SDK enrichment (shipped in earlier waves) is the active path. The generic enrichment-complete ingest endpoint at `POST /api/enrichment/callback` (in `enrichment/callback.ts`) is **retained** — its persistence logic (plant update, calibration questions, conditions, facts, scheduling, events) is agent-agnostic, it's used as a test seam in `routes/lifecycle.test.ts`, and it remains a useful integration point for future external agents. Only the two n8n string labels inside it are stripped. Wave 7 also fixes the pre-existing flake in `AddPlant.test.tsx:540` that was surfaced during Wave 6 verification.

Wave 7 does **not** touch the Claude Agent SDK integration, does **not** add new API endpoints, and does **not** implement the community-facing "copy AI setup prompt" UX from #56. Those belong to a later pre-release wave, alongside the remaining pieces of #52 (new enrichment API endpoints, `INSTALL.md`, docker `./backups` path, making Claude SDK optional via config flag).

## 2. Scope & issue resolution

| Item | Action |
|---|---|
| **n8n client code** | Delete `packages/api/src/enrichment/{webhook.ts, webhook.test.ts, retry.ts, retry.test.ts}`. These handled the outbound call to the n8n webhook and its retry logic — dead code since the Claude SDK landed. `webhook.ts` and `retry.ts` are only referenced by each other and their tests; no production caller remains. |
| **Callback endpoint (retained)** | Keep `packages/api/src/enrichment/callback.ts` and `callback.test.ts`. The endpoint's persistence logic is agent-agnostic; it's used as a test seam by `routes/lifecycle.test.ts` (`simulateEnrichment` helper), and it remains a useful generic integration point for future external agents (e.g. community deployments that wire their own LLM and POST the canonical payload back). Only strip the two n8n labels inside `callback.ts`: the comment on line 48 (`// POST /api/enrichment/callback — receives enrichment result from n8n`) and the log reason on line 142 (`reason: 'Enrichment data received from n8n'`). Rewrite as generic ("receives enrichment result" / "Enrichment data received"). `callback.test.ts` contains no n8n references — leave untouched. |
| **Config** | Remove `n8nWebhookUrl` and `n8nMaxRetries` from `packages/api/src/config.ts` (currently lines 7-8 in the interface, 51-52 in the loader). Drop matching cases from `config.test.ts`. Drop `N8N_ENRICHMENT_WEBHOOK_URL` and `N8N_ENRICHMENT_MAX_RETRIES` from `.env.example`. Drop `N8N_ENRICHMENT_*` env passthroughs from `docker-compose.yml` (if any). |
| **Route wiring** | `index.ts:25,81` wires `createEnrichmentRouter` — **keep both lines**. Audit `packages/api/src/index.ts` and `packages/api/src/routes/plants.ts` for any `fireEnrichmentWebhook()` / retry calls. Grep already confirms there are none; any future grep hit on `webhook`/`retry` imports must be removed. Claude SDK enrichment in `claude-enrich.ts` is the only outbound enrichment path. |
| **AddPlant test flake** | The test at `AddPlant.test.tsx:540` ("post-add enrichment splash — shows a splash with species + care preview when enrichment completes") times out on `findByRole('dialog', { name: /Sansevieria trifasciata/i })` intermittently. Likely cause: the component polls `/api/plants/7/enrichment-status` and the default 1000ms `findByRole` timeout is tight relative to the polling interval + `act()` batching. The implementer diagnoses via a few reproducing runs, then applies the **minimal** fix — extending the `findByRole` timeout, flushing timers explicitly with `vi.runAllTimersAsync()` before the assertion, or wrapping the advance in `act()`. No broad AddPlant-test audit. |
| **#52 comment** | Post: *"Wave 7 shipped the n8n removal (dead code since Claude SDK landed). Remaining scope for #52 = community enrichment API endpoints (`GET /api/plants?enrichment=pending`, `POST /api/plants/:id/enrichment`), new `INSTALL.md`, docker-compose `./backups` relative path, and making Claude SDK optional via config flag so community deployments don't require an Anthropic key. Keeping #52 open for a pre-release wave."* |
| **#56 comment** | Post: *"Deferred to pre-release wave — pairs with remaining #52 scope. The copy-AI-setup-prompt button needs the new enrichment API endpoints to exist first (and the prompt itself needs to teach the external AI what endpoints to call)."* |
| **#58 comment** | Post: *"Deferred to pre-release wave alongside #56. `[Maybe]` status retained — we'll revisit after community feedback on #56 ships. If #56 covers 95% of community setups, #58 may close as WONTFIX."* |

### Explicitly out of scope for Wave 7
- Any change to `packages/api/src/enrichment/claude-enrich.ts` or the Claude Agent SDK integration.
- New API endpoints (`GET /api/plants?enrichment=pending`, `POST /api/plants/:id/enrichment`).
- `INSTALL.md`.
- `docker-compose.yml` backups-path rewrite (Blocker C — community-release hygiene).
- Personal-path cleanup in `docs/specs/2026-04-07-plant-trmnl-design.md` and `docs/plans/2026-04-07-plant-trmnl-plan.md` (Blocker B — community-release hygiene).
- The clipboard-copy setup prompt button in the client (#56).
- The per-plant manual paste flow (#58).
- Broad audit of other potentially-flaky AddPlant tests.

## 3. File inventory

```
DELETE:
  packages/api/src/enrichment/webhook.ts
  packages/api/src/enrichment/webhook.test.ts
  packages/api/src/enrichment/retry.ts
  packages/api/src/enrichment/retry.test.ts

MODIFY:
  packages/api/src/enrichment/callback.ts         (strip 2 n8n labels; logic untouched)
  packages/api/src/config.ts
  packages/api/src/config.test.ts
  .env.example
  docker-compose.yml                              (if any N8N_* passthroughs exist)
  packages/api/client/src/pages/AddPlant.test.tsx (flake fix)

PRESERVE (intentional):
  packages/api/src/enrichment/callback.test.ts    — no n8n references; tests generic endpoint
  packages/api/src/enrichment/claude-enrich.ts    — Claude SDK enrichment stays active
  packages/api/src/index.ts                       — keeps lines 25 + 81 wiring createEnrichmentRouter
  packages/api/src/routes/lifecycle.test.ts       — uses callback endpoint as test seam
```

The "audit-and-trim" notes mean: before writing, `grep` each file for n8n/webhook references and only edit what actually exists. If `index.ts` has no n8n wiring (because Wave-earlier cleanup already removed it), leave it untouched.

## 4. Testing

- **API + renderer baseline:** currently 507 + 43 = 550 passing. After deletion, count drops by the number of tests in `webhook.test.ts` + `retry.test.ts` only (`callback.test.ts` stays and should keep passing — the two label changes in `callback.ts` don't touch behaviour). Remaining API tests: all pass, no regressions. `lifecycle.test.ts` must continue to pass unchanged.
- **Client baseline:** currently 109 passing + 1 flaky (AddPlant 540). After the flake fix: **110 passing, no flake**, confirmed by running the client suite 3 times consecutively.
- **Config tests:** the cases that exercised `n8nWebhookUrl` / `n8nMaxRetries` are removed; the "config-required-vars-on-startup" coverage still exists for everything that remains.
- **No new tests required.** Wave 7 is deletion + one diagnostic fix.

## 5. Rollout

- **Branch:** `feat/wave-7-cleanup`.
- **PR title:** `chore: Wave 7 — remove n8n enrichment path + fix AddPlant flake`.
- **PR body:**
  - Lists each deleted file.
  - Confirms Claude SDK integration is untouched.
  - Describes the flake diagnosis and the chosen fix.
  - Reports the three GitHub comments posted (#52, #56, #58) with their content.
- **Merge:** squash, delete branch.
- **Post-merge memory update:** add a Wave 7 line to `project_plant_trmnl.md` noting the n8n removal + flake fix, and capture "Claude SDK still active; community API lives in the still-open #52."

## 6. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `POST /api/plants` silently depended on an n8n webhook fire that's now gone | Low | Audit `routes/plants.ts` during implementation; Claude SDK replaced that path. If a smoke test shows plants stop getting enriched, revert the relevant change and investigate. |
| Flake fix treats the symptom, not the cause | Medium | Implementer runs the test 3× after the fix to confirm; if the flake recurs, re-dispatch with broader investigation (escalation to approach B from brainstorming). |
| Hidden references to `n8nWebhookUrl` elsewhere (renderer, cron) | Low | `grep -rn "n8n\|N8N\|n8nWebhook\|n8nMaxRetries" packages/ .env.example docker-compose.yml` as the final step before commit — should return zero hits (the two `callback.ts` n8n labels are rewritten to generic strings in this wave, so they drop out of the grep too). |
| Some n8n test uses test helpers that get removed and break unrelated suites | Low | After deletion, run the full API test suite; if anything else fails, check for shared fixtures. |

## 7. Open questions

None — scope confirmed with Emiel on 2026-04-25.
