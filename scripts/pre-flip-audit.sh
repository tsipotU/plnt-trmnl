#!/usr/bin/env bash
# Pre-public-flip history audit.
# Greps the entire git history for sensitive patterns. Exits non-zero on hit.
set -euo pipefail

PATTERNS=(
  '/Users/'
  '192\.168\.'
  '[private-repo]'
  '[private-repo]'
  'sk-ant-'
  '[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.(com|me|org|net|io)'
)

echo "Auditing entire git history for sensitive patterns..."
echo "Patterns: ${PATTERNS[*]}"
echo

HITS=0
for pattern in "${PATTERNS[@]}"; do
  # Capture full match list once; avoids SIGPIPE from head -3 under pipefail.
  match_list=$(git grep -nE "$pattern" $(git rev-list --all) 2>/dev/null || true)
  if [ -n "$match_list" ]; then
    matches=$(printf '%s\n' "$match_list" | wc -l | tr -d ' ')
    echo "[HIT] pattern '$pattern' — $matches matches across history"
    printf '%s\n' "$match_list" | awk 'NR<=3'
    echo
    HITS=$((HITS + 1))
  fi
done

if [ "$HITS" -eq 0 ]; then
  echo "OK — no sensitive patterns in history."
  exit 0
else
  echo
  echo "FAIL — $HITS pattern(s) found. Run scripts/filter-repo-replacements.txt + git filter-repo to fix, then re-run."
  exit 1
fi
