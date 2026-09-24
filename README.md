# Crestera Pulse

A free, self-hosted executive risk dashboard for a financial institution
(bank/credit union): CISO, CIO, CRO, and Board audiences each get a
role-specific lens over a shared risk/asset/risk-event data model.

- **CISO** — cyber risk & security posture
- **CIO** — technology performance & resilience
- **CRO** — enterprise & financial risk
- **Board** — high-level summary across all three

## What this is (and isn't)

This is a **free, self-hosted tool** built and maintained as an
introduction to Crestera, a full GRC/ITSM/vulnerability-management suite
for financial institutions. It's not connected to any real Crestera
deployment — download it, read the docs below, and run it on its own.

It ships with fictional demo data by default so you can see it working in
minutes, but it's not limited to that: see
[Bring your own data](#bring-your-own-data) to load your institution's real
risk/asset/incident data and run it read-only in production as a standing
reporting dashboard.

What it deliberately does **not** include — because these are what
Crestera itself adds: a way to add/edit records through the app itself
(data comes in via the import tool below, not a UI), automated evidence
collection, audit trails, FFIEC/NCUA/GLBA framework crosswalks, workflow and
remediation tracking, SSO/MFA, and real historical metric trending. If this
tool is useful to you, that's the point — Crestera is the same shape of
product with all of that filled in.

## Tech stack

- **API**: Node.js + Express + TypeScript, JWT auth with role claims, `pg` for PostgreSQL access
- **Database**: PostgreSQL 16
- **UI**: React (Vite + TypeScript SPA), React Router, Recharts
- **Deployment**: Docker Compose, self-hosted (no hosted service)

## Project layout

```
api/        Node.js backend (Express + TypeScript)
ui/         React frontend (Vite)
db/         schema.sql + seed.sql + templates/ for your own data
docker-compose.yml
```

## Running it

You need Docker with Compose.

```bash
cp .env.example .env
# Open .env and fill in DB_PASS and JWT_SECRET (the file shows how to
# generate them for Linux/macOS and Windows PowerShell).

docker-compose up --build
```

`docker-compose` refuses to start while `DB_PASS` or `JWT_SECRET` is blank,
and the API refuses to boot if either still holds an example value — there
is no working default secret, on purpose.

Then open the UI at **http://localhost:3000**. The API listens on
**http://localhost:8000**; Postgres is published on `127.0.0.1:5432` only
(reachable from the machine itself, not the network).

The Postgres password is fixed the first time the database volume is
created. If you change `DB_PASS` afterwards, reset the volume (this deletes
the database contents):

```bash
docker-compose down -v
docker-compose up --build
```

The Postgres container runs `db/schema.sql` on first boot, then loads the
built-in demo data unless `SEED_DEMO=false` (see
[Bring your own data](#bring-your-own-data)).

### Demo users

> **Demo mode is for evaluation on your own machine or a trusted network
> only.** Its accounts share a published password, so never expose a
> `SEED_DEMO=true` instance to the internet.

All demo accounts use the password `password`:

| Username | Role  |
|----------|-------|
| ciso     | CISO  |
| cio      | CIO   |
| cro      | CRO   |
| board    | BOARD |

Board can view every dashboard; CISO/CIO/CRO are scoped to their own dashboard.

## Bring your own data

The demo mode above is for evaluation. To run this against your own
institution's real data as a standing production dashboard:

1. In `.env`, set `SEED_DEMO=false` **before the first boot** (or after,
   followed by `docker-compose down -v` to reset the database — this
   deletes whatever's currently in it, so make sure that's what you want).
   With `SEED_DEMO=false` the schema comes up empty and no demo accounts
   exist — nothing is reachable until you do the next two steps.
2. Start the database: `docker-compose up -d db`.
3. Copy the templates in `db/templates/` and fill them in with your real
   organizations, assets, applications, risks, controls, incidents,
   loss events, and metrics. Each file's header row is the exact column
   set expected; `assets.csv`/`risks.csv`/`controls.csv`/`incidents.csv`
   take an `external_id` column you make up yourself (e.g. your own
   ticket/register ID) so `risk_controls.csv` and `incident_assets.csv`
   can link rows together unambiguously — titles and names aren't
   guaranteed unique. `business_unit` columns reference an organization by
   its `name` from `organizations.csv`, and any of these columns can be
   left blank if you don't have that data yet.
4. Load it. This needs Node.js 20+ and runs on the machine hosting the
   database (it connects to `127.0.0.1:5432` using the `DB_*` values from
   your `.env` — no extra configuration):
   ```bash
   cd api
   npm install
   npm run import-data -- /path/to/your/csv-folder
   ```
   This runs once against a freshly-migrated (empty) database — it does
   plain `INSERT`s, not an upsert/sync, so don't run it twice against the
   same data. If a row is invalid it stops with the file and row number
   and loads nothing.
5. Create a real login (the published demo password is gone once
   `SEED_DEMO=false`):
   ```bash
   npm run manage-users -- create <your-username> <a-real-password> BOARD
   ```
   Passwords must be at least 8 characters. Re-running `create` with the
   same username rotates that user's password. Roles: `CISO`, `CIO`, `CRO`,
   `BOARD`.
6. From the repo root: `docker-compose up --build` — now serving your real
   data, read-only.

Dashboards only show what you've loaded: a metric your import didn't
include (e.g. "Core Banking Uptime") renders as `0`/blank rather than
erroring — expected, not a bug. `metric_dimensions` (the FFIEC-tagging
table behind the CISO dashboard's regulatory-metrics panel) has no CSV
importer; add rows via SQL if you need it (`db/schema.sql` documents the
shape).

## Deploying on a server

Out of the box everything is wired for `localhost`. To serve it to other
people on a real host, set these in `.env` (see the commented block in
`.env.example`) and rebuild:

| Variable | Purpose |
|---|---|
| `PUBLIC_UI_URL` | The URL people open in their browser, e.g. `https://pulse.example.com`. The API only accepts browser requests from this origin. |
| `PUBLIC_API_URL` | The URL browsers use to reach the API, e.g. `https://pulse-api.example.com`. It is baked into the UI at build time, so run `docker-compose up --build` after changing it. |
| `TRUST_PROXY` | Number of reverse proxies in front of the API (`1` for one nginx/Caddy). Without it the login rate limiter sees every user as the proxy's IP. |
| `CRESTERA_URL` | Optional link target for the "Powered by Crestera" panel. Leave unset for no link. |

Recommended for anything beyond a trusted network:

- Terminate **TLS in a reverse proxy** (Caddy, nginx, a cloud load balancer)
  in front of ports 3000 and 8000. The app itself serves plain HTTP.
- Use `SEED_DEMO=false` with your own data and real logins — never the demo
  accounts.
- Keep `.env` private and back up the `db_data` volume; that's your data.
- Sessions are 8-hour JWTs held in the browser's `localStorage`; there is
  no SSO or MFA in this free tool (that's part of Crestera).

## Running without Docker (local dev)

1. Start Postgres yourself and load the schema/seed:
   ```bash
   psql -h localhost -U dashboard -d dashboard -f db/schema.sql
   psql -h localhost -U dashboard -d dashboard -f db/seed.sql
   ```
2. API:
   ```bash
   cd api
   cp .env.example .env     # then fill in DB_PASS and JWT_SECRET
   npm install
   npm run dev
   ```
3. UI:
   ```bash
   cd ui
   cp .env.example .env
   npm install
   npm run dev
   ```

## Tests

```bash
cd api && DB_NAME=dashboard_test npm test   # unit tests + integration tests against a real Postgres
cd ui && npm test                           # Vitest + React Testing Library
```

The API's integration suite (`api/src/app.integration.test.ts`) **drops
every table** in the database it's pointed at and reloads the demo data, so
it refuses to run unless the database is named `*_test` (or you set
`ALLOW_DB_RESET=true`). Create a throwaway database for it, for example
with the Compose database running:
`docker-compose exec db createdb -U dashboard dashboard_test`.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, build, and
`npm audit` for both `api` and `ui` on every push/PR.

## API overview

- `POST /auth/login` — `{ username, password }` → `{ token }` (rate-limited to 10 attempts/minute/IP)
- `GET /assets`, `/risks`, `/controls`, `/incidents`, `/loss-events`, `/metrics` — paginated entity reads (`?limit=&offset=`, default 100, max 500), auth required
- `GET /dashboard/ciso` — CISO or BOARD
- `GET /dashboard/cio` — CIO or BOARD
- `GET /dashboard/cro` — CRO or BOARD
- `GET /dashboard/board` — BOARD only

All routes except `/auth/login` and `/health` require `Authorization: Bearer <token>`.

## Notes on the demo data

- The `metrics` table stores one point-in-time value per metric name; the UI's
  time-series charts synthesize a short trend around that value for the demo
  (`api/src/services/dashboardMath.ts`). Swap in a real metrics history table
  to replace `synthesizeTrend`.
- `thirdPartyCyberRiskSummary` is derived from `risks` where `category = 'cyber'`
  and the owning business unit name matches `%vendor%` / `%third-party%`.
- Regulatory metrics are derived from `metric_dimensions` rows tagging a metric
  with `framework = FFIEC`.

## License

MIT — see [LICENSE](LICENSE).
