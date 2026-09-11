# Crestera Pulse

A free, self-hosted executive risk dashboard for a financial institution
(bank/credit union): CISO, CIO, CRO, and Board audiences each get a
role-specific lens over a shared risk/asset/risk-event data model.

- **CISO** — cyber risk & security posture
- **CIO** — technology performance & resilience
- **CRO** — enterprise & financial risk
- **Board** — high-level summary across all three

## What this is (and isn't)

This is a **free, read-only preview** built and maintained as an
introduction to [Crestera](#), a full GRC/ITSM/vulnerability-management
suite for financial institutions. It runs entirely on synthetic demo
data and is not connected to any real Crestera deployment.

What it deliberately does **not** include — because these are what
Crestera itself adds: automated evidence collection, audit trails,
FFIEC/NCUA/GLBA framework crosswalks, workflow and remediation tracking,
SSO/MFA, and real historical metric trending. If this preview is useful to
you, that's the point — Crestera is the same shape of product with all of
that filled in.

## Tech stack

- **API**: Node.js + Express + TypeScript, JWT auth with role claims, `pg` for PostgreSQL access
- **Database**: PostgreSQL 16
- **UI**: React (Vite + TypeScript SPA), React Router, Recharts
- **Deployment**: Docker Compose (local, self-hosted only — no hosted demo instance)

## Project layout

```
dashboard-app/
  api/        Node.js backend (Express + TypeScript)
  ui/         React frontend (Vite)
  db/         schema.sql + seed.sql
  docker-compose.yml
```

## Running it

```bash
cp .env.example .env
# then edit .env: set DB_PASS and JWT_SECRET to real random values
# (e.g. `openssl rand -base64 48` for JWT_SECRET)

docker-compose up --build
```

Then open the UI at **http://localhost:3000**. The API listens on **http://localhost:8000**
and Postgres is exposed on **5432** for local inspection.

`docker-compose.yml` refuses to start `api`/`db` without `DB_PASS` and
`JWT_SECRET` set in `.env` — there is no working hardcoded default, on
purpose, since this repo is public.

The Postgres container runs `db/schema.sql` and `db/seed.sql` automatically on first
boot (via `docker-entrypoint-initdb.d`). To reset the demo data, remove the volume:

```bash
docker-compose down -v
docker-compose up --build
```

### Demo users

All demo accounts use the password `password`:

| Username | Role  |
|----------|-------|
| ciso     | CISO  |
| cio      | CIO   |
| cro      | CRO   |
| board    | BOARD |

Board can view every dashboard; CISO/CIO/CRO are scoped to their own dashboard.

## Running without Docker (local dev)

1. Start Postgres yourself and load the schema/seed:
   ```bash
   psql -h localhost -U dashboard -d dashboard -f db/schema.sql
   psql -h localhost -U dashboard -d dashboard -f db/seed.sql
   ```
2. API:
   ```bash
   cd api
   cp .env.example .env
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
cd api && npm test   # unit tests + supertest integration tests against a real Postgres
cd ui && npm test    # Vitest + React Testing Library
```

The API's integration suite (`api/src/app.integration.test.ts`) wipes and
reloads whatever database it's pointed at (`api/.env`) — only ever point it
at a disposable database, never a real deployment's data.

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
