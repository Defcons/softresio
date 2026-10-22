#!/usr/bin/env bash
# The production stack in its real shape: deploy/compose.yaml as the server runs it, on the image built from this
# checkout and tagged the way that file names it (so nothing is pulled). The app must turn up as uid 1993 on a
# read-only filesystem with no capabilities, serve the page, and answer a request that needs the database. Only the
# database folder is swapped for a temporary one. Needs Docker and sudo, as on CI's runner:
#   bash tests/container-smoke.sh
set -euo pipefail
cd "$(dirname "$0")/.."
D="$(mktemp -d)"
export DATABASE_PASSWORD="$(openssl rand -hex 12)" JWT_SECRET="$(openssl rand -hex 16)"
cat > "$D/override.yml" <<EOF
services:
  database:
    volumes:
      - $D/pgdata:/var/lib/postgresql/18/docker
EOF
C="docker compose -p softresio-smoke -f deploy/compose.yaml -f $D/override.yml"
fail() { echo "FAIL: $*" >&2; exit 1; }
trap 'rc=$?; [ "$rc" -eq 0 ] || $C logs --tail 80 >&2 || true; $C down -v --remove-orphans >/dev/null 2>&1 || true; sudo rm -rf "$D"' EXIT

docker build -t ghcr.io/defcons/softresio:latest .
$C up -d --wait --wait-timeout 180

url=http://127.0.0.1:3015
page=$(curl -fsS --retry 30 --retry-delay 2 --retry-connrefused "$url/") || fail "the page is not served"
grep -qi '<html' <<< "$page" || fail "the page is not the app's index.html"
api=$(curl -fsS "$url/api/instances") || fail "a request that needs the database does not answer"
grep -q '"data"' <<< "$api" || fail "the instances request answered without data"
uids=$(docker top softresio -o pid,uid | awk 'NR>1{print $2}' | sort -u | tr '\n' ' ')
[ "$uids" = "1993 " ] || fail "the container's processes run as uid(s) $uids, not 1993 alone"
[ "$(docker inspect -f '{{.HostConfig.ReadonlyRootfs}}' softresio)" = true ] || fail "the root filesystem is not read-only"
docker exec softresio sh -c 'echo ok > /tmp/t' || fail "/tmp is not writable"
if docker exec softresio sh -c 'touch /app/written' 2>/dev/null; then fail "the code in /app is writable"; fi
echo "container smoke: PASS (app as 1993 alone, read-only, page and database request answered)"
