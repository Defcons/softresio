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
# Discord login on with a made-up app, so the login routes run; nothing here reaches Discord.
export DISCORD_LOGIN_ENABLED=true DISCORD_CLIENT_ID=smoke DISCORD_CLIENT_SECRET=smoke
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
page=$(curl -fsS --retry 30 --retry-delay 2 --retry-all-errors "$url/") || fail "the page is not served"
grep -qi '<html' <<< "$page" || fail "the page is not the app's index.html"
api=$(curl -fsS "$url/api/instances") || fail "a request that needs the database does not answer"
grep -q '"data"' <<< "$api" || fail "the instances request answered without data"
uids=$(docker top softresio -o pid,uid | awk 'NR>1{print $2}' | sort -u | tr '\n' ' ')
[ "$uids" = "1993 " ] || fail "the container's processes run as uid(s) $uids, not 1993 alone"
[ "$(docker inspect -f '{{.HostConfig.ReadonlyRootfs}}' softresio)" = true ] || fail "the root filesystem is not read-only"
docker exec softresio sh -c 'echo ok > /tmp/t' || fail "/tmp is not writable"
if docker exec softresio sh -c 'touch /app/written' 2>/dev/null; then fail "the code in /app is writable"; fi

# A raid id that is not one is refused before the WebSocket upgrade: "constructor" used to find Object.prototype's
# member in the client map and crash the app. A real raid id still upgrades, and the app keeps answering.
ws=(-H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==')
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${ws[@]}" "$url/api/ws/constructor" || true)
[ "$code" = 400 ] || fail "a WebSocket to /api/ws/constructor answered $code, not 400"
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "${ws[@]}" "$url/api/ws/ABCDE" || true)
[ "$code" = 101 ] || fail "a WebSocket to /api/ws/ABCDE answered $code, not 101"
curl -fsS "$url/api/instances" > /dev/null || fail "the app stopped answering after the WebSocket checks"

# The Discord login: /api/discord/login sets the state cookie and sends the browser to Discord with that state. The
# callback refuses a state it did not set (login CSRF) and only redirects to a path on this site.
login=$(curl -sS -o /dev/null -D - "$url/api/discord/login?return=%2FSR%2FABCDE") || fail "/api/discord/login does not answer"
state=$(grep -i '^location: https://discord.com/oauth2/authorize?' <<< "$login" | grep -o 'state=[0-9a-f-]*' | cut -d= -f2 || true)
cookie=$(grep -i '^set-cookie: oauth_state=' <<< "$login" | sed 's/^[^:]*: //; s/;.*//' | tr -d '\r' || true)
[ -n "$state" ] && [ -n "$cookie" ] || fail "/api/discord/login sent no state to Discord or set no state cookie"
loc() { curl -sS -o /dev/null -D - "$@" | grep -i '^location:' | sed 's/^[^:]*: //' | tr -d '\r'; }
[ "$(loc "$url/api/discord?code=x&state=$state")" = / ] || fail "the callback took a state without its cookie"
[ "$(loc "$url/api/discord?code=x&state=%2F%2Fevil.example")" = / ] || fail "the callback redirected off the site"
[ "$(loc -H "Cookie: $cookie" "$url/api/discord?error=access_denied&state=$state")" = /SR/ABCDE ] ||
  fail "the callback refused the state it set"

echo "container smoke: PASS (app as 1993 alone, read-only, page and database request answered, bad raid id and foreign login state refused)"
