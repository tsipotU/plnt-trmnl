# Security Policy

## Reporting a vulnerability

If you've found a security issue, **please don't open a public GitHub issue**. Email the maintainers privately first so we can fix it before disclosure.

**Contact:** open a [GitHub Security Advisory](https://github.com/tsipotU/plant-trmnl/security/advisories/new) on this repo, or DM a maintainer if you can't use the advisory flow.

We aim to acknowledge within 72 hours and to either ship a fix or share a clear timeline within 14 days. Critical issues (RCE, data exfiltration, auth bypass on internet-exposed deployments) get priority.

## Scope

plant-trmnl is **designed for LAN / local-network use**. The default deployment has **no authentication on the API**, including the enrichment endpoints. Users are expected to keep `:3900` off the open internet. We do not currently treat "no auth + exposed to the internet" as a vulnerability — see "Out of scope" below.

In scope:
- Authentication / authorization bypass on endpoints that *do* claim to enforce something (TRMNL push auth, future user auth in v1.1).
- SQL injection or path-traversal in any route.
- Server-side RCE via input.
- Cross-site scripting in the SPA.
- Sensitive data leakage (catalog data, plant data, log content).
- Supply-chain compromise of the dependency graph (we run `dependabot` weekly).

Out of scope:
- "I exposed `:3900` to the internet without a reverse proxy and someone wrote to my plants." That's working as designed; first-class auth is on the v1.1 roadmap. See the "Limitations" section of `INSTALL.md`.
- Issues that require physical access to the host running plant-trmnl.
- Self-DOS via excessive client requests.

## Disclosure

After a fix ships:
- We credit reporters in the release notes (CHANGELOG `[X.Y.Z]` ## Security section), unless they prefer anonymity.
- We coordinate disclosure dates if the issue affects deployed instances.

## Versions

Security fixes ship to `main` and the current released line. We don't backport to older minor versions before v1.0.0.
