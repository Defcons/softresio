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

# Hardening: response headers, sign-out only by POST, a damaged login cookie, a request body over the size limit.
hdrs=$(curl -sS -o /dev/null -D - "$url/") || fail "the page does not answer"
grep -qi '^x-content-type-options: nosniff' <<< "$hdrs" || fail "the page has no nosniff header"
grep -qi '^content-security-policy: .*frame-ancestors' <<< "$hdrs" || fail "the page has no frame-ancestors policy"
if curl -fsS "$url/api/signout" | grep -q '"user"'; then fail "GET /api/signout still signs out"; fi
curl -fsS -X POST "$url/api/signout" | grep -q '"user"' || fail "POST /api/signout does not answer"
code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Cookie: auth=garbage' "$url/api/instances")
[ "$code" = 200 ] || fail "a damaged auth cookie answered $code, not 200"
code=$(head -c 40000 /dev/zero | tr '\0' 'x' | curl -s -o /dev/null -w '%{http_code}' -X POST --data-binary @- "$url/api/raid/create")
[ "$code" = 413 ] || fail "a 40 KB body answered $code, not 413"

# One attendee cannot overwrite another's reserves: a character name belongs to whoever reserved with it first.
# (The cookie names this site's domain, so curl's own jar would not keep it on 127.0.0.1: send it by hand.)
anon() { curl -sS -o /dev/null -D - "$url/api/instances" | grep -i '^set-cookie: auth=' | sed 's/^[^:]*: //; s/;.*//' | tr -d '\r'; }
authA=$(anon); authB=$(anon)
[ -n "$authA" ] && [ -n "$authB" ] && [ "$authA" != "$authB" ] || fail "no two different anonymous users"
post() { curl -sS -w '\n%{http_code}' -X POST -H 'Content-Type: application/json' -H "Cookie: $2" --data "$1" "$url$3"; }
raid=$(post '{"hardReserves":[],"allowDuplicateSr":false,"useSrPlus":false,"description":"","time":"2030-01-01T00:00:00.000Z","instanceId":24,"srCount":2}' "$authA" /api/raid/create)
raidId=$(grep -o '"raidId":"[A-Z0-9]*"' <<< "$raid" | cut -d'"' -f4 || true)
[ -n "$raidId" ] || fail "could not create a raid: $raid"
sr="{\"raidId\":\"$raidId\",\"character\":{\"name\":\"Bob\",\"class\":\"Warrior\",\"spec\":\"Arms\"},\"selectedItemIds\":[17966]}"
mine=$(post "$sr" "$authA" /api/sr/create | tail -1)
[ "$mine" = 200 ] || fail "the first reservation answered $mine, not 200"
other=$(post "$sr" "$authB" /api/sr/create | tail -1)
[ "$other" = 403 ] || fail "another user's reservation with the same character name answered $other, not 403"
again=$(post "$sr" "$authA" /api/sr/create | tail -1)
[ "$again" = 200 ] || fail "the owner's second reservation answered $again, not 200"

echo "container smoke: PASS (app as 1993 alone, read-only, page and database request answered, bad raid id and foreign login state refused, headers, size limit and character ownership checked)"
