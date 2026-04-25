## Summary

<!-- One paragraph: what does this PR do and why. -->

## Changes

<!-- Bullet list of notable changes. -->

-

## Testing

<!-- How did you verify this works? Tests added / commands run / manual flows. -->

- [ ] `npm test` passes in `packages/api`
- [ ] `npm test` passes in `packages/api/client`
- [ ] Manually verified the user-facing change

## Related issues

<!-- Closes #123 / Refs #456 -->

## Checklist

- [ ] CHANGELOG.md `[Unreleased]` updated (if user-visible)
- [ ] Docs touched where relevant (`README.md`, `INSTALL.md`, `CLAUDE.md`, `docs/HANDOFF.md`)
- [ ] No `console.log` in production code (use `pino`)
- [ ] New env vars (if any) added to `.env.example` and validated on startup
- [ ] Schema migrations: column added to both the `CREATE TABLE` and `addColumnIfMissing` paths
