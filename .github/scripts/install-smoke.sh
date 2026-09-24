#!/usr/bin/env bash
# Clean-install smoke test. Follows the README the way a stranger would, on a
# plain Linux host with Docker Engine (and Node for the developer steps). The
# quick-start command is taken from README.md itself, so the docs are tested
# too. Run from the repo root. Needs ports 3000, 3001, 5432 and 8443 free.
set -uo pipefail

FAILS=0
ok()      { echo "  PASS  $*"; }
bad()     { echo "  FAIL  $*"; FAILS=$((FAILS + 1)); }
check()   { local d="$1"; shift; if "$@"; then ok "$d"; else bad "$d"; fi; }
section() { echo; echo "== $*"; }

docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 ('docker compose') is required"; exit 1; }
echo "Compose: $(docker compose version --short)"

ROOT=$(pwd)
PROJECT=pulsesmoke
DEV="-f docker-compose.yml -f docker-compose.dev.yml"
dc()       { docker compose -p "$PROJECT" "$@"; }
teardown() { cd "$ROOT" && dc down -v >/dev/null 2>&1; docker rm -f pulsesmoke-caddy >/dev/null 2>&1; rm -f import/*.csv; true; }
trap teardown EXIT

B=http://localhost:3000
wait_for() { local url=$1 secs=${2:-150}; for _ in $(seq 1 "$secs"); do curl -fsS "$url" >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }
ui_up()    { local url=$1; for _ in $(seq 1 90); do curl -fsS "$url" 2>/dev/null | grep -q "Crestera Pulse" && return 0; sleep 1; done; return 1; }
JSON='Content-Type: application/json'
login()    { curl -sSk -X POST "${3:-$B}/api/auth/login" -H "$JSON" -d "{\"username\":\"$1\",\"password\":\"$2\"}"; }
token()    { login "$@" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
code()     { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# The README's own macOS/Linux quick-start line (step 2).
QUICKSTART=$(awk '/^macOS \/ Linux:/{f=1} f && /^sed /{print; exit}' README.md)
echo "Quick-start line from README: ${QUICKSTART:-<NOT FOUND>}"
[ -n "$QUICKSTART" ] || { echo "README quick-start command not found"; exit 1; }
quickstart() { rm -f .env && eval "$QUICKSTART"; }

section "1. Untouched .env.example must refuse to start"
cp .env.example .env
out=$(dc up -d 2>&1); rc=$?
check "compose exits non-zero" test "$rc" -ne 0
check "error names DB_PASS" grep -q DB_PASS <<<"$out"
check "no containers were created" test -z "$(dc ps -aq)"

section "2. README quick start on a hardened server (umask 027)"
H=$(mktemp -d)
( umask 027; git clone -q "$ROOT" "$H/repo" )
echo "  file modes in the hardened clone: $(stat -c '%a' "$H/repo/db/schema.sql") schema.sql, $(stat -c '%a' "$H/repo/api/package.json") api/package.json"
BEFORE=$FAILS
( cd "$H/repo" && umask 027 && quickstart )
check "quick start fills both secrets" bash -c "grep -qE '^DB_PASS=[0-9a-f]{64}\$' '$H/repo/.env' && grep -qE '^JWT_SECRET=[0-9a-f]{64}\$' '$H/repo/.env'"
check ".env is private (600)" test "$(stat -c '%a' "$H/repo/.env")" = 600
if ( cd "$H/repo" && umask 027 && docker compose -p pulseumask up -d --build >/tmp/umask-up.log 2>&1 ); then ok "docker compose up -d --build"; else bad "docker compose up -d --build"; tail -25 /tmp/umask-up.log; fi
check "app and API answer on :3000" wait_for $B/api/health 90
check "UI serves the app" ui_up $B/
n=$( cd "$H/repo" && docker compose -p pulseumask exec -T db psql -U dashboard -d dashboard -tAc 'select count(*) from users' 2>/dev/null )
check "demo users loaded (4)" test "$n" = 4
( umask 027; cp "$H/repo/db/templates/"*.csv "$H/repo/import/" )
out=$( cd "$H/repo" && docker compose -p pulseumask run --rm -T api node dist/cli/import-csv.js --replace 2>&1 )
if [ "$(id -u)" = 1000 ]; then echo "  (skip) unreadable-import check: this user is uid 1000, the same as the container's, so 027 files stay readable"
else check "unreadable import files get the README's chmod advice" grep -q 'chmod -R a+rX' <<<"$out"; fi
chmod -R a+rX "$H/repo/import"
out=$( cd "$H/repo" && docker compose -p pulseumask run --rm -T api node dist/cli/import-csv.js --replace 2>&1 )
check "after chmod the import works" grep -q 'Import complete' <<<"$out"
if [ "$FAILS" -gt "$BEFORE" ]; then ( cd "$H/repo" && docker compose -p pulseumask logs db api 2>&1 | tail -20 ); fi
( cd "$H/repo" && docker compose -p pulseumask down -v >/dev/null 2>&1 ) || true

section "3. Demo mode"
cd "$ROOT" && quickstart
if dc up -d --build >/tmp/up.log 2>&1; then ok "docker compose up -d --build"; else bad "docker compose up -d --build"; tail -25 /tmp/up.log; fi
check "API answers through /api" wait_for $B/api/health
check "UI serves the app" ui_up $B/
check "all three services report healthy" bash -c "for _ in \$(seq 1 60); do [ \$(docker compose -p $PROJECT ps --format '{{.Health}}' | grep -c '^healthy') = 3 ] && exit 0; sleep 1; done; exit 1"
check "demo mode is reported" bash -c "curl -s $B/api/auth/demo | grep -q '\"demo\":true'"
TB=$(token board password); TC=$(token cio password)
check "board can sign in" test -n "$TB"
for r in ciso cio cro board; do
  check "board can open /dashboard/$r" test "$(code "$B/api/dashboard/$r" -H "Authorization: Bearer $TB")" = 200
done
check "cio is blocked from the CISO dashboard (403)" test "$(code $B/api/dashboard/ciso -H "Authorization: Bearer $TC")" = 403
check "no token is rejected (401)" test "$(code $B/api/assets)" = 401
check "trend charts carry six months of seeded history" bash -c "curl -s $B/api/dashboard/board -H 'Authorization: Bearer $TB' | grep -o '\"period\":\"[0-9-]*\",\"value\":99' | wc -l | grep -qx 6"
check "API runs with NODE_ENV=production" test "$(dc exec -T api printenv NODE_ENV | tr -d '\r')" = production
check "only the UI is published, on 127.0.0.1" bash -c "[ \"\$(docker ps --filter label=com.docker.compose.project=$PROJECT --format '{{.Ports}}' | grep -o '[0-9.]*:[0-9]*->' | tr '\n' ' ')\" = '127.0.0.1:3000-> ' ]"
check "the API is not reachable directly on :8000" bash -c "! curl -s --max-time 3 localhost:8000/health"
UIH=$(curl -sI $B/ | tr -d '\r')
check "UI sends a same-origin Content-Security-Policy" grep -qi "^content-security-policy:.*connect-src 'self';" <<<"$UIH"
check "UI sends X-Frame-Options: DENY" grep -qi '^x-frame-options: DENY' <<<"$UIH"
for svc in api ui; do
  cid=$(dc ps -q "$svc")
  check "$svc container: non-root, read-only filesystem, all capabilities dropped" bash -c "docker inspect $cid --format '{{.Config.User}}|{{.HostConfig.ReadonlyRootfs}}|{{.HostConfig.CapDrop}}' | grep -qE '^(node|101)[|]true[|]\\[ALL\\]\$'"
done
check "the API filesystem really is read-only" bash -c "! docker compose -p $PROJECT exec -T api sh -c 'touch /probe' 2>/dev/null"
rl=""; for _ in $(seq 1 11); do rl="$rl $(code -X POST $B/api/auth/login -H "$JSON" -d '{"username":"x","password":"y"}')"; done
check "failed sign-ins are rate-limited (429)" grep -q 429 <<<"$rl"
dc restart api >/dev/null 2>&1
check "API recreated behind nginx is found again" wait_for $B/api/health 90

section "4. Developer route: API tests on a disposable *_test database"
docker compose -p "$PROJECT" $DEV up -d db >/dev/null 2>&1
dc exec -T db createdb -U dashboard dashboard_test
cp api/.env.example api/.env
sed -i "s|^DB_PASS=.*|DB_PASS=$(grep '^DB_PASS=' .env | cut -d= -f2-)|; s|^JWT_SECRET=.*|JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d= -f2-)|" api/.env
( cd api && npm ci --silent >/dev/null 2>&1 )
check "npm test passes on a *_test database" bash -c "cd api && DB_NAME=dashboard_test npm test >/tmp/apitest.log 2>&1; tail -5 /tmp/apitest.log; grep -q 'failed' /tmp/apitest.log && exit 1; grep -q 'passed' /tmp/apitest.log"
check "the default 'dashboard' database is refused" bash -c "cd api && npm test 2>&1 | grep -q 'Refusing to wipe'"
rm -f api/.env

section "5. Bring your own data, README steps verbatim"
dc down -v >/dev/null 2>&1
sed -i 's/^SEED_DEMO=true$/SEED_DEMO=false/' .env
dc up -d --build >/dev/null 2>&1
check "starts empty" wait_for $B/api/health
check "demo mode is off" bash -c "curl -s $B/api/auth/demo | grep -q '\"demo\":false'"
check "demo login does not work (401)" test "$(code -X POST $B/api/auth/login -H "$JSON" -d '{"username":"ciso","password":"password"}')" = 401
cp db/templates/*.csv import/
out=$(dc run --rm -T api node dist/cli/import-csv.js 2>&1)
check "import completes" grep -q 'Import complete' <<<"$out"
check "no demo-login warning on a clean install" bash -c '! grep -q "demo logins" <<<"$1"' _ "$out"
out=$(dc run --rm -T api node dist/cli/import-csv.js 2>&1)
check "a second plain import is refused and points to --replace" grep -q -- '--replace' <<<"$out"
out=$(echo 'Str0ng-Real-Pass!' | dc run --rm -T api node dist/cli/manage-users.js create realadmin BOARD 2>&1)
check "manage-users creates a login from piped input" grep -q 'created. You can sign in now' <<<"$out"
TR=$(token realadmin 'Str0ng-Real-Pass!')
check "real login works" test -n "$TR"
check "imported risk is served" bash -c "curl -s $B/api/risks -H 'Authorization: Bearer $TR' | grep -q 'Unpatched endpoints'"
check "imported two months give a two-point posture trend" bash -c "curl -s $B/api/dashboard/ciso -H 'Authorization: Bearer $TR' | grep -q '\"securityPostureTrend\":\[{\"period\":\"2026-07\",\"value\":76},{\"period\":\"2026-08\",\"value\":78}\]'"
printf 'external_id,name,type,criticality,environment,business_unit,owner\nAST-9,X,server,9,prod,Retail Banking,IT\n' > import/assets.csv
out=$(dc run --rm -T api node dist/cli/import-csv.js --replace 2>&1)
check "a bad row is rejected with its spreadsheet row number" grep -q 'assets.csv row 2' <<<"$out"
check "...and nothing changed" bash -c "curl -s $B/api/risks -H 'Authorization: Bearer $TR' | grep -q 'Unpatched endpoints'"
cp db/templates/assets.csv import/assets.csv
printf 'Core Bank Uptime,it,CIO,99.9,%%,2026-08-01,2026-08-31,Monitoring\n' >> import/metrics.csv
out=$(dc run --rm -T api node dist/cli/import-csv.js --replace 2>&1)
check "--replace refreshes the data" grep -q 'replaced' <<<"$out"
check "a misspelled metric name is warned about" grep -q '"Core Bank Uptime" isn.t a name any dashboard reads' <<<"$out"
check "logins survive --replace" test -n "$(token realadmin 'Str0ng-Real-Pass!')"
out=$(dc run --rm -T api node dist/cli/manage-users.js list 2>&1)
check "manage-users list shows the login" grep -q 'realadmin  *BOARD' <<<"$out"
dc run --rm -T api node dist/cli/manage-users.js delete realadmin >/dev/null 2>&1
check "deleting a user ends their open session" test "$(code $B/api/assets -H "Authorization: Bearer $TR")" = 401

section "6. Backups (README commands)"
echo 'Str0ng-Real-Pass!' | dc run --rm -T api node dist/cli/manage-users.js create realadmin BOARD >/dev/null 2>&1
rm -f pulse-backup.dump
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/pulse.dump' && dc cp db:/tmp/pulse.dump ./pulse-backup.dump >/dev/null 2>&1
check "backup file written" test -s pulse-backup.dump
dc exec -T db psql -U dashboard -d dashboard -qc "delete from risk_controls; delete from risks" >/dev/null
dc cp ./pulse-backup.dump db:/tmp/pulse.dump >/dev/null 2>&1 && dc exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /tmp/pulse.dump'
TR=$(token realadmin 'Str0ng-Real-Pass!')
check "restore brings the data back" bash -c "curl -s $B/api/risks -H 'Authorization: Bearer $TR' | grep -q 'Unpatched endpoints'"
rm -f pulse-backup.dump

section "7. Serving it to other people"
printf 'UI_PORT=3001\n' >> .env
dc up -d >/dev/null 2>&1
check "UI_PORT moves the app (and its API) to :3001" wait_for http://localhost:3001/api/health 90
check "the old port is free" bash -c "! curl -s --max-time 3 $B/ >/dev/null"
sed -i '/^UI_PORT=/d' .env
printf 'BIND_ADDRESS=0.0.0.0\nTRUST_PROXY=1\n' >> .env
dc up -d >/dev/null 2>&1
wait_for $B/api/health 90 >/dev/null
check "BIND_ADDRESS=0.0.0.0 publishes on all interfaces" bash -c "docker ps --filter label=com.docker.compose.project=$PROJECT --format '{{.Ports}}' | grep -q '0.0.0.0:3000->'"
check "TRUST_PROXY reaches the API" test "$(dc exec -T api printenv TRUST_PROXY | tr -d '\r')" = 1
# The README's Caddy block, on a test port with a local certificate (no port 80 redirect server).
mkdir -p /tmp/pulsecaddy && printf '{\n\tauto_https disable_redirects\n}\nhttps://localhost:8443 {\n\ttls internal\n\treverse_proxy 127.0.0.1:3000\n}\n' > /tmp/pulsecaddy/Caddyfile
docker run -d --name pulsesmoke-caddy --network host -v /tmp/pulsecaddy/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2 >/dev/null 2>&1
check "the README's reverse-proxy setup serves the app over HTTPS" bash -c "for _ in \$(seq 1 30); do curl -skf https://localhost:8443/ | grep -q 'Crestera Pulse' && exit 0; sleep 1; done; exit 1"
check "signing in works through the proxy" test -n "$(token realadmin 'Str0ng-Real-Pass!' https://localhost:8443)"

section "8. The data volume doesn't depend on the folder name"
C=$(mktemp -d)/crestera-pulse-main
mkdir -p "$C" && cp -r docker-compose.yml .env "$C/"
check "compose project is 'crestera-pulse' in any folder" bash -c "cd '$C' && docker compose config 2>/dev/null | grep -q '^name: crestera-pulse\$'"

echo; echo "RESULT: $FAILS failure(s)"
if [ "$FAILS" -gt 0 ]; then dc logs --tail 30 2>&1 | tail -60; fi
exit $(( FAILS > 0 ))
