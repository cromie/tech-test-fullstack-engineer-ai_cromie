#!/usr/bin/env bash
# Smoke test for the games REST API. Usage: scripts/smoke-api.sh [base_url]
set -euo pipefail
BASE=${1:-http://localhost:3000}/api/games
req() { echo "\$ $*"; curl -s -w '  -> HTTP %{http_code}\n' "$@"; }

req "$BASE" -o /dev/null
ID=$(curl -s -X POST "$BASE" -H 'content-type: application/json' \
  -d '{"title":"Smoke Test","developer":"QA","genre":"Puzzle","monthly_revenue_usd":100,"monthly_downloads":10,"average_rating":3.5}' | sed -E 's/.*"id":([0-9]+).*/\1/')
echo "created id=$ID"
req "$BASE/$ID"
req -X PATCH "$BASE/$ID" -H 'content-type: application/json' -d '{"average_rating":4.9}'
req -X POST "$BASE" -H 'content-type: application/json' -d '{"title":"","average_rating":9}'
req -X POST "$BASE" -H 'content-type: application/json' -d 'not json'
req "$BASE/abc"
req -X DELETE "$BASE/$ID"
req "$BASE/$ID"
