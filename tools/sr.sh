#!/usr/bin/env bash
# Run a site-reforge stage against this project with the project-local block ledger enforced.
#   bash tools/sr.sh <stage> [args...]      e.g.  bash tools/sr.sh sr-extract
# fetchx refuses every host in audit/scan-blocked-hosts.json before the first request
# (capecodcannabis.com since the 2026-10-12 firewall lockout; see that file).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJ="$(cd "$HERE/.." && pwd)"
STAGE="$1"; shift
export SR_BLOCK_LEDGER="$PROJ/audit/scan-blocked-hosts.json"
exec node "$HOME/.claude/skills/site-reforge/scripts/$STAGE.mjs" --project "$PROJ" "$@"
