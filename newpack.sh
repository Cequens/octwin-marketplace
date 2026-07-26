#!/usr/bin/env bash
# newpack.sh <pack-id> <project-slug> "<description>" "<Display Name>"
#
# Scaffolds an external pure-YAML pack, provisions a dedicated project on the
# `test` workspace so each pack is independently chattable, pins pack.json at it,
# and clears the scaffold flows so the author writes from a clean slate.
set -euo pipefail

ID="$1"; PROJ="$2"; DESC="$3"; DISPLAY="${4:-$1}"
ROOT="/c/projects/octwin-marketplace"
ENVF="/c/projects/ammar 2/.env"
ADMIN=$(grep -E "^PLATFORM_ADMIN_TOKEN=" "$ENVF" | cut -d= -f2- | tr -d '\r"')

cd "$ROOT"
octwin init "./$ID" --id "$ID" --description "$DESC" --display-name "$DISPLAY" >/dev/null
cd "$ID"
# The scaffold's example flows/prompt are replaced wholesale by the author.
rm -f manifest.yaml flows/tools/*.yaml prompts/identity.md README.md locale.ar.yaml messages.ar.yaml
cat > pack.json <<EOF
{
  "platform_url": "http://localhost:3000",
  "tenant": "test",
  "project": "$PROJ"
}
EOF
curl -s -m 60 -X POST \
  -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" \
  -d "{\"slug\":\"$PROJ\",\"name\":\"$DISPLAY Demo\",\"packs\":[]}" \
  "http://localhost:3000/api/admin/tenants/test/projects" >/dev/null
echo "ready: $ROOT/$ID  →  project '$PROJ'"
