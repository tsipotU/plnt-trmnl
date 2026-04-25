#!/usr/bin/env bash
# Pre-public-flip GitHub Issues audit.
# Lists issues whose title or body contains personal-info patterns.
# Edit flagged issues with `gh issue edit N --body @-` before flipping public.
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "FAIL — gh CLI not installed. Install from cli.github.com."
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "FAIL — jq not installed. brew install jq."
  exit 1
fi

PATTERNS='Users/|192\.168\.|baristi|CampingHappy|sk-ant-'

echo "Fetching all issues (open + closed) and grepping for personal-info patterns..."
echo

HITS=$(gh issue list --limit 200 --state all --json number,title,body \
  | jq -r '.[] | "#\(.number) \(.title)\n\(.body)\n---"' \
  | grep -nE "$PATTERNS" || true)

if [ -z "$HITS" ]; then
  echo "OK — no flagged issues."
  exit 0
fi

echo "Flagged issues (review and edit before flipping public):"
echo "$HITS"
exit 1
