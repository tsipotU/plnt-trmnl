#!/usr/bin/env bash
# Pre-public-flip history audit.
#
# Greps the entire git history for sensitive patterns and exits non-zero on
# hits. Run before every release that materially changes history (i.e. after
# any git filter-repo). The post-rewrite repo should pass this clean.
#
# Three categories are excluded from the scan:
#   - docs/archive/   — wave plans that document the cleanup work itself,
#                       so they have to mention the patterns. Self-reference.
#   - scripts/        — the audit + replacement tooling literally contains
#                       the patterns as data. Self-reference.
#   - wave-8 plan/design files in their historical pre-archive locations
#                     — these were authored in docs/plans/ and docs/specs/,
#                       moved to docs/archive/ when wave 8 finished. Older
#                       commits still have them at the original paths.
#                       Same self-referential content, different path.
#
# If you add a new pattern category here, also add it to
# scripts/filter-repo-replacements.txt so the next history rewrite scrubs it.
set -euo pipefail

# Patterns are tightened to the actually-leaky forms:
#   - /Users/admin (the real path), not /Users/ (catches .env.example placeholder)
#   - 192.168.50.x (the actual LAN), not 192.168.x (standard examples are fine)
#   - sk-ant-<20+ chars> (a real-shape API key), not the literal "sk-ant-" string
#     that appears in this very script as an example
#
# We do NOT search for the post-rewrite redaction marker ([private-repo],
# [redacted-path]) — those are by-design information-free placeholders. They
# show up legitimately in archive docs that describe the cleanup. Chasing
# them is noise; if a future leak ever needs cleaning, add the new pattern
# here AND to scripts/filter-repo-replacements.txt.
PATTERNS=(
  '/Users/admin'
  '/Users/emiel'
  '192\.168\.50\.'
  'sk-ant-[a-zA-Z0-9_-]{20,}'
)

echo "Auditing entire git history for sensitive patterns..."
echo "Patterns: ${PATTERNS[*]}"
echo "Excluded paths: docs/archive/, scripts/"
echo

HITS=0
for pattern in "${PATTERNS[@]}"; do
  # Capture full match list once; avoids SIGPIPE from head -3 under pipefail.
  raw=$(git grep -nE "$pattern" $(git rev-list --all) 2>/dev/null || true)
  match_list=$(printf '%s\n' "$raw" | grep -vE ':docs/archive/|:scripts/|:docs/plans/2026-04-25-wave-8-|:docs/specs/2026-04-25-wave-8-' || true)
  if [ -n "$match_list" ]; then
    matches=$(printf '%s\n' "$match_list" | wc -l | tr -d ' ')
    echo "[HIT] pattern '$pattern' — $matches matches across history"
    printf '%s\n' "$match_list" | awk 'NR<=3'
    echo
    HITS=$((HITS + 1))
  fi
done

if [ "$HITS" -eq 0 ]; then
  echo "OK — no sensitive patterns in history (outside excluded paths)."
  exit 0
else
  echo
  echo "FAIL — $HITS pattern(s) found. Either add a new replacement to"
  echo "scripts/filter-repo-replacements.txt and re-run filter-repo, or"
  echo "scrub the offending file in HEAD if the leak is recent."
  exit 1
fi
