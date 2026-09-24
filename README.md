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

- **API**: Node.js 24 + Express + TypeScript, JWT auth with role claims, `pg` for PostgreSQL access
- **Database**: PostgreSQL 16
- **UI**: React (Vite + TypeScript SPA), React Router, Recharts, served by nginx
- **Deployment**: Docker Compose, self-hosted (no hosted service)

**Platforms.** The Docker install is verified on Linux (Ubuntu with Docker
Engine and the Compose plugin) and Windows (Docker Desktop). macOS should
behave like Windows/Linux but hasn't been tested. The optional data-loading
scripts need Node.js 22 or newer on the host.

## Project layout

```
api/        Node.js backend (Express + TypeScript) and the import/user scripts
ui/         React frontend (Vite), nginx config
db/         schema.sql, seed.sql, Dockerfile, templates/ for your own data
.github/    CI workflow and the clean-install smoke test
docker-compose.yml
```

## Running it

You need Docker Engine with the Compose plugin (the `docker compose`
command). If your install only has the older standalone `docker-compose`,
use that instead — the commands are identical.

```bash
cp .env.example .env
# Open .env and fill in DB_PASS and JWT_SECRET (the file shows how to
# generate them for Linux/macOS and Windows PowerShell).

docker compose up --build
```

`docker compose` refuses to start while `DB_PASS` or `JWT_SECRET` is blank,
and the API refuses to boot if either still holds an example value — there
is no working default secret, on purpose.

Then open the UI at **http://localhost:3000**. The API listens on
**http://localhost:8000**; Postgres is published on `127.0.0.1:5432` only
(reachable from the machine itself, not the network).

The Postgres password is fixed the first time the database volume is
created. If you change `DB_PASS` afterwards, reset the volume (this deletes
the database contents):

```bash
docker compose down -v
docker compose up --build
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
   followed by `docker compose down -v` to reset the database — this
   deletes whatever's currently in it, so make sure that's what you want).
   With `SEED_DEMO=false` the schema comes up empty and no demo accounts
   exist — nothing is reachable until you do the next steps.
2. Start the database: `docker compose up -d db`.
3. Copy the templates in `db/templates/` and fill them in with your real
   organizations, assets, applications, risks, controls, incidents,
   loss events, and metrics. Each file's header row is the exact column
   set expected; `assets.csv`/`risks.csv`/`controls.csv`/`incidents.csv`
   take an `external_id` column you make up yourself (e.g. your own
   ticket/register ID) so `risk_controls.csv` and `incident_assets.csv`
   can link rows together unambiguously — titles and names aren't
   guaranteed unique. `business_unit` columns reference an organization by
   its `name` from `organizations.csv`, and any of these columns can be
   left blank if you don't have that data yet. **Use the names and values in
   [What the dashboards read](#what-the-dashboards-read) below — the
   dashboards look some data up by exact name.**
4. Load it. This needs Node.js 22+ and runs on the machine hosting the
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
6. From the repo root: `docker compose up --build` — now serving your real
   data, read-only.

### What the dashboards read

The dashboards compute what they show from your rows using the conventions
below. Anything you don't provide renders as `0`/empty rather than erroring.

**Formats.** Dates `YYYY-MM-DD`; timestamps `YYYY-MM-DD HH:MM:SS`;
`impact_regulatory` is `true` or `false` (anything else counts as false);
`metrics.role_relevance` is a semicolon list such as `CISO;BOARD` (required,
currently informational).

**Metrics** (`metrics.csv`) are matched by **exact `name`**. If a name
appears for several periods, the row with the latest `period_end` is used.
The trend lines on the dashboards are synthesized around that latest value
(there is no stored history yet).

| Dashboard | Metric names |
|---|---|
| CISO | `Security Posture Score`; `Mean Time to Detect` and `Mean Time to Respond` (hours); `Critical Vulnerabilities Open`, `High Vulnerabilities Open`, `Medium Vulnerabilities Open`, `Low Vulnerabilities Open` (counts — any name containing "Vulnerabilities Open" is charted, coloured for Critical/High/Medium/Low) |
| CIO | `Core Banking Uptime`, `Online Banking Uptime`, `Mobile Banking Uptime`, `ATM Availability`, `Call Center SLA Adherence`, `Change Failure Rate`, `CPU Utilization`, `Memory Utilization`, `Storage Utilization` (percentages) |
| CRO | `Open Regulatory Issues`, `Upcoming Regulatory Deadlines` |
| Board | `Security Posture Score`, `Core Banking Uptime`, `Open Regulatory Issues`, `Upcoming Regulatory Deadlines` |

**Other rows:**

- **Incidents:** `type` = `security` feeds the CISO incident count and
  response times; `type` = `it` feeds the CIO "incidents linked to
  changes"; any incident with a `impact_financial` amount or
  `impact_regulatory` = `true` appears in the CRO impact table.
  `severity` is shown as given (`low`, `medium`, `high`, `critical`).
- **Risks:** `category` = `cyber` feeds the CISO lists; every category is
  charted on the CRO "Risks by Category". `residual_score` (0–10) ranks the
  top risks and colours the heatmap (7+ red, 5+ orange, 3+ yellow, below 3
  green). A title containing `EOL` or `end-of-support` counts as
  end-of-support tech debt on the CIO dashboard. The CISO "Third-Party Cyber
  Risk" table lists `cyber` risks whose organization name contains `vendor`
  or `third-party`.
- **Assets:** `criticality` is a whole number 1–5. A name containing
  `legacy` counts as a legacy asset (CIO).
- **Controls:** `effectiveness_score` (0–100) is averaged per `framework`
  (for example `NIST`, `CIS`, `ISO`, `FFIEC`).
- **Loss events:** the CRO dashboard totals all of them; the Board shows the
  last 12 months.
- **Applications:** all are listed in the CIO application portfolio.
- **Regulatory metrics panel (CISO):** shows metrics tagged in
  `metric_dimensions` with `key = framework`, `value = FFIEC`. That table has
  no CSV importer; add rows via SQL (`db/schema.sql` documents the shape).

## Deploying on a server

Out of the box everything is wired for `localhost`. To serve it to other
people on a real host, set these in `.env` (see the commented block in
`.env.example`) and rebuild:

| Variable | Purpose |
|---|---|
| `PUBLIC_UI_URL` | The URL people open in their browser, e.g. `https://pulse.example.com`. The API only accepts browser requests from this origin. |
| `PUBLIC_API_URL` | The URL browsers use to reach the API, e.g. `https://pulse-api.example.com`. It is baked into the UI at build time (and into its Content-Security-Policy), so run `docker compose up --build` after changing it. |
| `TRUST_PROXY` | Number of reverse proxies in front of the API (`1` for one nginx/Caddy). Without it the login rate limiter sees every user as the proxy's IP. |
| `CRESTERA_URL` | Optional link target for the "Powered by Crestera" panel. Leave unset for no link. |

Recommended for anything beyond a trusted network:

- Terminate **TLS in a reverse proxy** (Caddy, nginx, a cloud load balancer)
  in front of ports 3000 (UI) and 8000 (API). The containers speak plain HTTP.
- Use `SEED_DEMO=false` with your own data and real logins — never the demo
  accounts.
- Keep `.env` private and back up the `db_data` volume; that's your data.

## Security

What's in place:

- **Secrets:** no default secrets; Compose won't start with blanks and the
  API refuses to boot with example values.
- **Authentication:** bcrypt-hashed passwords, 8-hour HS256 JWTs (algorithm
  pinned), login timing that doesn't reveal which usernames exist, and a
  10-attempts-per-minute-per-IP login limit. Role checks are enforced by the
  API, not just hidden in the UI.
- **Network:** Postgres listens on `127.0.0.1` only; the API accepts
  browser requests from your configured UI origin only.
- **Containers:** run as non-root with a read-only filesystem, all Linux
  capabilities dropped and `no-new-privileges`; images are built from
  Node 24 (LTS), nginx and Postgres 16 with lockfile-exact (`npm ci`)
  installs. The UI ships a Content-Security-Policy, `X-Frame-Options: DENY`,
  `nosniff`, and a strict referrer policy.
- **No telemetry:** the UI loads nothing from outside your deployment.
- **Dependencies:** `npm audit` reports 0 known vulnerabilities at release,
  and CI fails on high-severity advisories.

What's not (by design — this is the free tool): SSO/MFA, an audit log,
account lockout, token revocation before expiry (sessions are JWTs kept in
the browser's `localStorage`), and encryption at rest (use disk/volume
encryption) or in transit (use a TLS proxy). Report a vulnerability as
described in [SECURITY.md](SECURITY.md).

## Running without Docker (local dev)

Needs Node.js 22+ and your own PostgreSQL.

1. Load the schema and demo data:
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

The API tests read their connection settings from `api/.env` (see local
dev above; `DB_HOST`, `DB_USER`, `DB_PASS` must match your Postgres — with
the Compose database running that is `127.0.0.1` and the values from your
root `.env`). The integration suite (`api/src/app.integration.test.ts`)
**drops every table** in the database it's pointed at and reloads the demo
data, so it refuses to run unless the database is named `*_test` (or you set
`ALLOW_DB_RESET=true`). Create a throwaway database for it, for example
with the Compose database running:
`docker compose exec db createdb -U dashboard dashboard_test`.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, build, and
`npm audit` for both `api` and `ui` on every push/PR. On a Linux host with
Docker you can also run the whole clean-install check — it follows this
README as a newcomer would, including a hardened-`umask` server:
`bash .github/scripts/install-smoke.sh`.

## API overview

- `GET /health` — liveness, no auth
- `POST /auth/login` — `{ username, password }` → `{ token }` (rate-limited to 10 attempts/minute/IP)
- `GET /assets`, `/risks`, `/controls`, `/incidents`, `/loss-events`, `/metrics` — paginated entity reads (`?limit=&offset=`, default 100, max 500), auth required
- `GET /dashboard/ciso` — CISO or BOARD
- `GET /dashboard/cio` — CIO or BOARD
- `GET /dashboard/cro` — CRO or BOARD
- `GET /dashboard/board` — BOARD only

All routes except `/auth/login` and `/health` require `Authorization: Bearer <token>`.

## License

MIT — see [LICENSE](LICENSE).
