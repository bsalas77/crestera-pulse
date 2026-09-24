#!/usr/bin/env bash
# Clean-install smoke test. Follows the README the way a stranger would, on a
# plain Linux host with Docker Engine and Node 20. Run from the repo root.
set -uo pipefail

FAILS=0
ok()      { echo "  PASS  $*"; }
bad()     { echo "  FAIL  $*"; FAILS=$((FAILS + 1)); }
check()   { local d="$1"; shift; if "$@"; then ok "$d"; else bad "$d"; fi; }
section() { echo; echo "== $*"; }

if docker compose version >/dev/null 2>&1; then DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"
else echo "No Docker Compose found"; exit 1; fi
echo "Compose command in use: $DC ($($DC version --short 2>/dev/null || true))"
if command -v docker-compose >/dev/null 2>&1; then echo "'docker-compose' (hyphenated, v1 syntax): present"
else echo "'docker-compose' (hyphenated, v1 syntax): NOT INSTALLED on this host"; fi

ROOT=$(pwd)
PROJECT=pulsesmoke
dc()       { $DC -p "$PROJECT" "$@"; }
teardown() { cd "$ROOT" && dc down -v >/dev/null 2>&1 || true; }
trap teardown EXIT

wait_for() { local url=$1 secs=${2:-150}; for _ in $(seq 1 "$secs"); do curl -fsS "$url" >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }
ui_up()    { local url=$1; for _ in $(seq 1 60); do curl -fsS "$url" 2>/dev/null | grep -q "Crestera Pulse" && return 0; sleep 1; done; return 1; }
wait_db()  { local proj=$1 cid; for _ in $(seq 1 90); do
               cid=$($DC -p "$proj" ps -q db 2>/dev/null)
               [ -n "$cid" ] && [ "$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null)" = healthy ] && return 0
               sleep 1; done; return 1; }
gen_env()  { local dbp jwt; dbp=$(openssl rand -hex 24); jwt=$(openssl rand -base64 48 | tr -d '\n')
             cp .env.example .env
             sed -i "s|^DB_PASS=.*|DB_PASS=$dbp|; s|^JWT_SECRET=.*|JWT_SECRET=$jwt|" .env; }
JSON='Content-Type: application/json'
login()    { curl -sS -X POST localhost:8000/auth/login -H "$JSON" -d "{\"username\":\"$1\",\"password\":\"$2\"}"; }
token()    { login "$@" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
code()     { curl -s -o /dev/null -w '%{http_code}' "$@"; }

section "1. Untouched .env.example must refuse to start"
cp .env.example .env
out=$(dc up -d 2>&1); rc=$?
check "compose exits non-zero" test "$rc" -ne 0
check "error names DB_PASS" grep -q DB_PASS <<<"$out"
check "no containers were created" test -z "$(dc ps -aq)"

section "2. Hardened server (umask 027): the whole stack must still start"
H=$(mktemp -d)
( umask 027; git clone -q "$ROOT" "$H/repo" )
echo "  file modes in the hardened clone: $(stat -c '%a' "$H/repo/db/schema.sql") schema.sql, $(stat -c '%a' "$H/repo/api/package.json") api/package.json"
BEFORE=$FAILS
if ( cd "$H/repo" && gen_env && $DC -p pulseumask up --build -d >/tmp/umask-up.log 2>&1 ); then ok "compose up --build under umask 027"; else bad "compose up --build under umask 027"; tail -25 /tmp/umask-up.log; fi
check "API healthy under umask 027" wait_for http://localhost:8000/health 60
check "UI serves under umask 027" ui_up http://localhost:3000/
n=$( cd "$H/repo" && $DC -p pulseumask exec -T db psql -U dashboard -d dashboard -tAc 'select count(*) from users' 2>/dev/null )
check "demo users loaded (4)" test "$n" = 4
if [ "$FAILS" -gt "$BEFORE" ]; then ( cd "$H/repo" && $DC -p pulseumask logs db api 2>&1 | tail -20 ); fi
( cd "$H/repo" && $DC -p pulseumask down -v >/dev/null 2>&1 ) || true

section "3. Demo mode with real secrets"
cd "$ROOT" && gen_env
if dc up --build -d >/tmp/up.log 2>&1; then ok "compose up --build"; else bad "compose up --build"; tail -25 /tmp/up.log; fi
check "API healthy" wait_for http://localhost:8000/health
check "UI serves the app" ui_up http://localhost:3000/
TB=$(token board password); TC=$(token cio password)
check "board can log in" test -n "$TB"
for r in ciso cio cro board; do
  check "board can open /dashboard/$r" test "$(code "localhost:8000/dashboard/$r" -H "Authorization: Bearer $TB")" = 200
done
check "cio is blocked from /dashboard/ciso (403)" test "$(code localhost:8000/dashboard/ciso -H "Authorization: Bearer $TC")" = 403
check "no token is rejected (401)" test "$(code localhost:8000/assets)" = 401
check "API runs with NODE_ENV=production" test "$(dc exec -T api printenv NODE_ENV | tr -d '\r')" = production
check "Postgres is published on 127.0.0.1 only" bash -c "$DC -p $PROJECT port db 5432 | grep -q '^127\\.0\\.0\\.1:'"
UIH=$(curl -sI localhost:3000/ | tr -d '\r')
check "UI sends a Content-Security-Policy" grep -qi '^content-security-policy:' <<<"$UIH"
check "UI sends X-Frame-Options: DENY" grep -qi '^x-frame-options: DENY' <<<"$UIH"
for svc in api ui; do
  cid=$(dc ps -q "$svc")
  check "$svc container: non-root, read-only filesystem, all capabilities dropped" bash -c "docker inspect $cid --format '{{.Config.User}}|{{.HostConfig.ReadonlyRootfs}}|{{.HostConfig.CapDrop}}' | grep -qE '^(node|101)[|]true[|]\\[ALL\\]\$'"
done
check "the API filesystem really is read-only" bash -c "! $DC -p $PROJECT exec -T api sh -c 'touch /probe' 2>/dev/null"
rl=""; for _ in $(seq 1 10); do rl="$rl $(code -X POST localhost:8000/auth/login -H "$JSON" -d '{"username":"x","password":"y"}')"; done
check "login rate limit trips (429)" grep -q 429 <<<"$rl"

section "4. API tests through the README route (disposable *_test database)"
dc exec -T db createdb -U dashboard dashboard_test
cp api/.env.example api/.env
sed -i "s|^DB_PASS=.*|DB_PASS=$(grep '^DB_PASS=' .env | cut -d= -f2-)|; s|^JWT_SECRET=.*|JWT_SECRET=$(grep '^JWT_SECRET=' .env | cut -d= -f2-)|" api/.env
( cd api && npm ci --silent >/dev/null 2>&1 )
check "npm test passes on a *_test database" bash -c "cd api && DB_NAME=dashboard_test npm test >/tmp/apitest.log 2>&1; tail -5 /tmp/apitest.log; grep -q 'failed' /tmp/apitest.log && exit 1; grep -q 'passed' /tmp/apitest.log"
check "the default 'dashboard' database is refused" bash -c "cd api && npm test 2>&1 | grep -q 'Refusing to wipe'"

section "5. Bring your own data (SEED_DEMO=false), README steps verbatim"
dc down -v >/dev/null 2>&1; rm -f api/.env
sed -i 's/^SEED_DEMO=.*/SEED_DEMO=false/' .env
dc up -d db >/dev/null 2>&1
check "empty database is up" wait_db "$PROJECT"
( cd api && npm install --silent >/dev/null 2>&1 )
check "import-data works with only the root .env" bash -c "cd api && npm run import-data -- ../db/templates 2>&1 | tee /tmp/import.log | tail -2; grep -q 'Import complete' /tmp/import.log"
check "manage-users creates a login" bash -c "cd api && npm run manage-users -- create realadmin 'Str0ng-Real-Pass!' BOARD 2>&1 | grep -q 'is ready'"
mkdir -p /tmp/badcsv && printf 'name,type,criticality,environment\nX,server,9,prod\n' > /tmp/badcsv/assets.csv
check "a bad CSV is rejected with a row-level error" bash -c "cd api && npm run import-data -- /tmp/badcsv 2>&1 | grep -q 'assets.csv row 1'"
dc up --build -d >/dev/null 2>&1
check "stack is up on real data" wait_for http://localhost:8000/health
check "demo login no longer works (401)" test "$(code -X POST localhost:8000/auth/login -H "$JSON" -d '{"username":"ciso","password":"password"}')" = 401
TR=$(token realadmin 'Str0ng-Real-Pass!')
check "real login works" test -n "$TR"
check "imported risk is served" bash -c "curl -s localhost:8000/risks -H 'Authorization: Bearer $TR' | grep -q 'Unpatched endpoints'"

section "6. Deploy beyond localhost (PUBLIC_UI_URL / PUBLIC_API_URL)"
printf 'PUBLIC_UI_URL=http://127.0.0.1:3000\nPUBLIC_API_URL=http://127.0.0.1:8000\nTRUST_PROXY=1\n' >> .env
dc up --build -d >/dev/null 2>&1
check "stack restarts with the new URLs" wait_for http://127.0.0.1:8000/health
check "UI is up on the new origin" ui_up http://127.0.0.1:3000/
check "UI Content-Security-Policy allows the configured API origin" bash -c "curl -sI http://127.0.0.1:3000/ | grep -i '^content-security-policy' | grep -qF \"connect-src 'self' http://127.0.0.1:8000\""
check "CORS allows the configured origin" bash -c "curl -sI -H 'Origin: http://127.0.0.1:3000' http://127.0.0.1:8000/health | grep -qi '^access-control-allow-origin: http://127.0.0.1:3000'"
check "UI bundle targets the configured API URL" bash -c "curl -s http://127.0.0.1:3000/ | grep -o 'assets/[^\"]*\\.js' | head -1 | xargs -I{} curl -s http://127.0.0.1:3000/{} | grep -q 'http://127.0.0.1:8000'"

echo; echo "RESULT: $FAILS failure(s)"
if [ "$FAILS" -gt 0 ]; then dc logs --tail 30 2>&1 | tail -60; fi
exit $(( FAILS > 0 ))
