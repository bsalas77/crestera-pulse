# Crestera Pulse

A free, self-hosted executive risk dashboard for a bank or credit union.
CISO, CIO, CRO and Board each get a view of one shared set of risk, asset,
incident and loss data:

- **CISO**: cyber risk and security posture
- **CIO**: technology performance and resilience
- **CRO**: enterprise and financial risk
- **Board**: a summary across all three

## What this is (and isn't)

Crestera Pulse is a **free, self-hosted tool** from the makers of Crestera,
a full GRC/ITSM/vulnerability-management suite for financial institutions.
It isn't connected to Crestera or to anything else. You download it, run
it on your own machine or server, and your data stays there.

It starts with fictional demo data so you can see it working in minutes.
To use it for real, you load your institution's own data from
spreadsheets ([Bring your own data](#bring-your-own-data)) and run it as a
read-only reporting dashboard.

These are deliberately **left out**, because they are what Crestera itself
adds:
- editing records in the app (data comes in by spreadsheet import)
- automated evidence and metric collection
- audit trails
- FFIEC/NCUA/GLBA framework crosswalks
- workflow and remediation tracking
- SSO/MFA

## Quick start

About ten minutes, most of it the first build.

### What you need

- **Docker.**
  - On Windows or macOS: [Docker Desktop](https://www.docker.com/products/docker-desktop/),
    started (its whale icon is in the taskbar or menu bar).
  - On Linux: Docker Engine with the Compose plugin.
  - Check with `docker compose version`: any v2 or later works. The old
    separate `docker-compose` (v1) is not supported.
- About 2 GB of free disk space. Nothing else needs to be installed.
- Port 3000 free on this machine (you can pick another, see
  [Troubleshooting](#troubleshooting)).

The commands below run in a terminal. On Windows, use **PowerShell** (or
Windows Terminal). On macOS and Linux, use any terminal.

Verified on Windows 11 with Docker Desktop and on Ubuntu with Docker Engine,
in Chrome, Edge, Firefox and Safari's engine (WebKit), at desktop and phone
screen sizes. macOS hasn't been tried yet; the containers are the same on
every platform.

### 1. Get the code

Either clone it:

```bash
git clone https://github.com/bsalas77/crestera-pulse.git
cd crestera-pulse
```

or use **Code → Download ZIP** on the GitHub page, unzip it, and open a
terminal in the unzipped folder (the one that contains `docker-compose.yml`).
Run every later command from that folder.

### 2. Create your settings file

This one command copies `.env.example` to `.env` and fills in its two
secrets (the database password and the key that signs logins) with new
random values.

Windows (PowerShell):

```powershell
$r = { $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); -join ($b | ForEach-Object { $_.ToString('x2') }) }; (Get-Content .env.example) -replace '^DB_PASS=$', "DB_PASS=$(& $r)" -replace '^JWT_SECRET=$', "JWT_SECRET=$(& $r)" | Set-Content .env
```

macOS / Linux:

```bash
sed -e "s/^DB_PASS=$/DB_PASS=$(openssl rand -hex 32)/" -e "s/^JWT_SECRET=$/JWT_SECRET=$(openssl rand -hex 32)/" .env.example > .env && chmod 600 .env
```

Keep `.env` private. It holds the secrets, and it is never committed to git.

### 3. Start it

```bash
docker compose up -d --build
```

The first run downloads and builds everything, which takes a few minutes.
Later starts take seconds. When it finishes, `docker compose ps` shows three
services (`db`, `api`, `ui`) as `healthy`.

### 4. Sign in

Open **http://localhost:3000** and sign in with one of the demo accounts.
Their password is `password`, and the sign-in page says so while they are
active.

| Username | Sees |
|----------|------|
| board    | every dashboard |
| ciso     | CISO dashboard |
| cio      | CIO dashboard |
| cro      | CRO dashboard |

> **The demo is for trying it out, on your own machine or a trusted
> network.** Everyone knows the demo password. Before real use, follow
> [Bring your own data](#bring-your-own-data): it replaces the demo data and
> the demo accounts.

### Everyday commands

Run these from the Crestera Pulse folder.

| To | Run |
|---|---|
| See whether it's running | `docker compose ps` |
| Stop it (data is kept) | `docker compose stop` |
| Start it again | `docker compose up -d` |
| See the API's log (first place to look when something's wrong) | `docker compose logs api` |
| Remove the containers (data is kept) | `docker compose down` |
| Remove everything **including all data** | `docker compose down -v` |

It restarts by itself after a reboot, as long as Docker starts. Docker
Desktop only starts at sign-in if its "Start Docker Desktop when you sign
in" setting is on.

## Bring your own data

Your data comes in as CSV files: one per kind of record, which you can fill
in with Excel or any spreadsheet. The importer checks every row before it
changes anything. If one row is wrong it tells you the file, the row and
what's wrong, and loads nothing.

### First load

1. **Turn the demo off.** In `.env`, change `SEED_DEMO=true` to
   `SEED_DEMO=false`.
   - If you already started the demo, also wipe it (this deletes everything
     in the database): `docker compose down -v`
   - Then start it again: `docker compose up -d --build`

   It now starts with an empty database and **no accounts**, so nobody can
   sign in until step 4.
2. **Fill in the templates.** Copy the files from `db/templates/` into the
   `import/` folder and replace the example rows with your own. Keep the
   file names (`risks.csv`, `assets.csv`, ...) and the header row. See
   [What goes in the files](#what-goes-in-the-files) below. Any file you
   don't have data for can be left out.
3. **Load them:**
   ```bash
   docker compose run --rm api node dist/cli/import-csv.js
   ```
4. **Create your own login** (you'll be asked for the password twice; it
   isn't shown as you type):
   ```bash
   docker compose run --rm api node dist/cli/manage-users.js create yourname BOARD
   ```
5. Open http://localhost:3000 and sign in.

Files in `import/` never go into git, so your data stays on this machine.

### Refreshing your data

Pulse doesn't edit records. You update your spreadsheets, then load the
whole set again. To keep history in the trend charts, add new rows rather
than overwriting old ones. For example, add each month's
`Security Posture Score` as a new row in `metrics.csv`.

```bash
docker compose run --rm api node dist/cli/import-csv.js --replace
```

`--replace` swaps all dashboard data for what's in `import/` in a single
step. Logins are kept. If any row is wrong, nothing changes. Rows you added
to `metric_dimensions` by hand (see below) are cleared by a replace, so add
them again afterwards.

Without `--replace`, the importer refuses to load into a database that
already has data, so running the first-load command twice can't duplicate
anything.

### What goes in the files

Each file's header row, in `db/templates/`, is the exact set of columns.
Required columns must have a value. The rest can be left blank.

- **Linking rows.** A `business_unit` column names an organization from
  `organizations.csv`; capitalisation doesn't matter. `assets.csv`,
  `risks.csv`, `controls.csv` and `incidents.csv` have an `external_id`
  that you make up, such as your own register or ticket ID.
  `risk_controls.csv` and `incident_assets.csv` use those IDs to link rows
  together.
- **Excel-friendly.** The importer accepts:
  - Excel's "CSV UTF-8" and plain "CSV" files, including semicolon-separated ones
  - blank rows, and headers in any capitalisation
  - numbers like `$92,000.00`, `1,250` or `99.9%`
  - `true`/`false`, `yes`/`no` or `1`/`0` for yes/no columns
  - values like `Cyber`, which are stored as `cyber`

  Error messages give the row number as the spreadsheet shows it (the
  header is row 1).
- **Dates** must be `YYYY-MM-DD` (for example `2026-08-19`). Times are
  `YYYY-MM-DD HH:MM`, optionally with `:SS`. In Excel, set those columns to
  the custom format `yyyy-mm-dd` (or `yyyy-mm-dd hh:mm`) before saving.
  Dates like `8/19/2026` are rejected rather than guessed.
- `metrics.role_relevance` is a list of roles such as `CISO;BOARD`. It's
  required but currently informational.

### What the dashboards read

Anything you don't provide shows as `0` or "No data" instead of an error.
The importer warns you about values the dashboards won't recognise, such as
a misspelled metric name.

**Metrics** (`metrics.csv`) are matched by name, ignoring capitalisation.
The number shown is the row with the latest `period_end`. The **trend
charts** plot one point per month of `period_start`, up to the last 12
months, using only rows you imported; nothing is filled in or estimated.
With one month loaded, the chart says so instead of drawing a line.

| Dashboard | Metric names |
|---|---|
| CISO | `Security Posture Score` (trend chart); `Mean Time to Detect` and `Mean Time to Respond` (hours); `Critical Vulnerabilities Open`, `High Vulnerabilities Open`, `Medium Vulnerabilities Open`, `Low Vulnerabilities Open` (counts; any name ending in "Vulnerabilities Open" is charted) |
| CIO | `Core Banking Uptime` (trend chart), `Online Banking Uptime`, `Mobile Banking Uptime`, `ATM Availability`, `Call Center SLA Adherence`, `Change Failure Rate`, `CPU Utilization`, `Memory Utilization`, `Storage Utilization` (percentages) |
| CRO | `Open Regulatory Issues`, `Upcoming Regulatory Deadlines` |
| Board | `Security Posture Score`, `Core Banking Uptime` (trend chart), `Open Regulatory Issues`, `Upcoming Regulatory Deadlines` |

**Other files:**

- **Incidents:**
  - `type` = `security` feeds the CISO incident count; `type` = `it`
    feeds the CIO "incidents linked to changes".
  - Any incident with an `impact_financial` amount, or `impact_regulatory`
    = true, appears in the CRO impact table.
  - `severity` is shown as given (`low`, `medium`, `high`, `critical`).
- **Risks:**
  - `category` = `cyber` feeds the CISO lists; every category is charted on
    the CRO "Risks by Category".
  - `residual_score` (0–10) ranks the top risks and colours the heatmap:
    7+ red, 5+ orange, 3+ yellow, below 3 green.
  - A `title` containing `EOL` or `end-of-support` counts as tech debt on
    the CIO dashboard.
  - The CISO "Third-Party Cyber Risk" table lists `cyber` risks whose
    organization name contains `vendor` or `third-party`.
- **Assets:** `criticality` is a whole number from 1 to 5. A name
  containing `legacy` counts as a legacy asset (CIO).
- **Controls:** `effectiveness_score` (0–100) is averaged per `framework`
  (for example `NIST`, `CIS`, `ISO`, `FFIEC`).
- **Loss events:** the CRO dashboard totals all of them and the Board shows
  the last 12 months. Months with no losses chart as 0.
- **Applications:** all are listed in the CIO application portfolio.
- **Regulatory metrics panel (CISO):** shows metrics tagged in the
  `metric_dimensions` table with `key` = `framework` and `value` = `FFIEC`.
  There's no CSV file for that table; `db/schema.sql` shows its columns if
  you want to add rows with SQL.

## Managing logins

There are four roles. `BOARD` sees every dashboard; `CISO`, `CIO` and `CRO`
each see their own.

```bash
docker compose run --rm api node dist/cli/manage-users.js list
docker compose run --rm api node dist/cli/manage-users.js create jsmith CRO
docker compose run --rm api node dist/cli/manage-users.js delete jsmith
```

- **Changing a password or role:** run `create` again with the same
  username.
- **Passwords** must be at least 8 characters. `create` asks for the
  password without showing it. To script it, pipe it in instead:
  `echo 'the-password' | docker compose run --rm -T api node dist/cli/manage-users.js create jsmith CRO`
- **Changes take effect at once.** Deleting a user, or changing their
  password or role, ends any session they have open. Otherwise a sign-in
  lasts 8 hours.
- **Demo accounts.** If you imported over the demo data rather than
  starting empty, the importer warns you that the demo accounts still
  exist. Delete them (`board`, `ciso`, `cio`, `cro`) once you have your own
  login.

## Serving it to other people

Pulse is one web address: the app, with its API under `/api` on the same
address. By default it only listens on this machine (`127.0.0.1:3000`).

**Recommended: a reverse proxy with HTTPS in front.** Point your proxy (IIS,
nginx, Caddy, a load balancer) at `http://127.0.0.1:3000`. Then add
`TRUST_PROXY=1` to `.env` and run `docker compose up -d`, so Pulse sees each
person's real address; the sign-in rate limit depends on it. For example,
a complete [Caddy](https://caddyserver.com) setup, which also gets and
renews the HTTPS certificate:

```
pulse.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

**Simple, for a trusted internal network:** add `BIND_ADDRESS=0.0.0.0` to
`.env` and run `docker compose up -d`. Others can then open
`http://<this-machine's-name-or-IP>:3000`, provided your firewall allows
port 3000. Traffic is not encrypted this way.

Either way:
- Use your own data and logins, never the demo.
- Keep `.env` private.
- Back up the database (next section).

## Backups, restores and updates

All your data is in one Docker volume. To back it up to a file in this
folder:

```bash
docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/pulse.dump'
docker compose cp db:/tmp/pulse.dump ./pulse-backup.dump
```

Keep `pulse-backup.dump` somewhere safe, along with a copy of `.env`.

To restore a backup (this replaces what's in the database now):

```bash
docker compose cp ./pulse-backup.dump db:/tmp/pulse.dump
docker compose exec db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /tmp/pulse.dump'
```

**Updating to a newer version.** Your data and settings are kept, and the
API brings the database structure up to date by itself when it starts:

```bash
git pull
docker compose up -d --build
```

If you downloaded a ZIP rather than cloning:
1. Unzip the new version.
2. Copy your `.env` and your `import/` files into the new folder.
3. Run `docker compose up -d --build` from the new folder. It uses the same
   data as before (the database is stored by Docker, not in the folder).

## Troubleshooting

Start with `docker compose ps`, then `docker compose logs api`. The API
explains most problems in plain words at the end of its log.

| You see | What it means / what to do |
|---|---|
| `Set DB_PASS in your .env file` | There's no `.env` in this folder, or its secrets are blank. Run step 2 of the [Quick start](#quick-start) from the folder that contains `docker-compose.yml`. |
| `Cannot connect to the Docker daemon`, or an error mentioning `dockerDesktopLinuxEngine` / `docker_engine` | Docker isn't running. Start Docker Desktop (or `sudo systemctl start docker` on Linux) and wait until it's ready. |
| `port is already allocated` or `address already in use` | Something else is using port 3000. Add `UI_PORT=3001` (or any free port) to `.env`, run `docker compose up -d`, and open that port instead. |
| `dependency failed to start: container ... api ... is unhealthy` | The API couldn't start. `docker compose logs api` says why; the usual cause is the next row. |
| API log says `password authentication failed` | `DB_PASS` in `.env` was changed after the database was created. The database keeps its original password. Put the old value back, or start over with `docker compose down -v` (this deletes the data), then `docker compose up -d`. |
| Sign-in page says "Can't reach Crestera Pulse" or "the API isn't answering" | The containers aren't all running. Check `docker compose ps`, and `docker compose logs api` for the reason. |
| "Invalid username or password" with the demo accounts | The demo is off (`SEED_DEMO=false`) or was replaced by your own data. Use a login made with `manage-users`, or create one. |
| "Too many sign-in attempts" | More than 10 failed sign-ins in a minute from one address. Wait a minute. |
| A dashboard shows zeros or "No data" | That data wasn't imported, or a metric name differs from [the list](#what-the-dashboards-read). The importer prints a warning for names it doesn't recognise. |
| The importer says `Can't read ... permission denied` (Linux) | The files in `import/` aren't readable by the container. Run `chmod -R a+rX import`. |

## Security

What's in place:

- **Network:** one port is published, on `127.0.0.1` by default. The API
  and the database are not published at all; the browser reaches the API
  through the app's own address.
- **Secrets:** there are no default secrets. Compose won't start with blank
  ones, and the API refuses to start with example values.
- **Sign-in:**
  - Passwords are hashed with bcrypt, and sign-ins use 8-hour HS256 tokens
    (the algorithm is pinned).
  - Sign-in takes the same time whether or not a username exists, so it
    doesn't reveal which ones do.
  - Failed sign-ins are limited to 10 per minute per address.
  - Deleting a user, or changing their password or role, ends their
    sessions immediately.
  - The API enforces roles; it doesn't rely on the UI hiding things.
- **Containers:**
  - The app containers run as non-root, with read-only filesystems, all
    Linux capabilities dropped and `no-new-privileges`.
  - Images are built from Node 24 LTS, nginx and Postgres 16, with
    lockfile-exact installs.
- **Browser:** the UI sends a strict Content-Security-Policy,
  `X-Frame-Options: DENY`, `nosniff` and `no-referrer`. It loads nothing
  from outside your server and has no telemetry.
- **Dependencies:** `npm audit` reports no known vulnerabilities at
  release, and CI fails on high-severity advisories.

Deliberately not included in the free tool:
- SSO/MFA
- an audit log
- account lockout beyond the rate limit
- encryption at rest (use disk or volume encryption)
- HTTPS (use a reverse proxy, as above)

Report a vulnerability as described in [SECURITY.md](SECURITY.md).

## Development

To work on the code outside Docker you need Node.js 22 or newer.

```bash
# database only, published on 127.0.0.1:5432 for local tools and tests
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

# terminal 1: the API on http://localhost:8000
cd api
cp .env.example .env    # then set DB_PASS (same as the root .env) and any JWT_SECRET
npm install
npm run dev

# terminal 2: the UI on http://localhost:3000 (it forwards /api to :8000)
cd ui
npm install
npm run dev
```

On the host, the import and user tools are `npm run import-data -- [--replace] <folder>`
and `npm run manage-users -- <command>`, run from `api/`.

**Tests:**

```bash
cd ui && npm test
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec db createdb -U dashboard dashboard_test
cd api && DB_NAME=dashboard_test npm test
```

The API's integration tests **drop every table** in the database they use,
so they refuse to run unless its name ends in `_test` (or
`ALLOW_DB_RESET=true` is set).

CI (`.github/workflows/ci.yml`) runs type checks, lint, tests, builds and
`npm audit` for `api` and `ui`. On Linux with Docker,
`bash .github/scripts/install-smoke.sh` runs the whole install the way this
README describes it, including on a server with a hardened `umask`.

## API

Everything is under `/api` on the app's address (for example
`http://localhost:3000/api/health`). Every route except `/health`,
`/auth/login` and `/auth/demo` needs an `Authorization: Bearer <token>`
header.

- `GET /health`: liveness
- `POST /auth/login`: `{ username, password }` → `{ token }`
- `GET /auth/demo`: `{ demo }`, true while the demo accounts are active
- `GET /assets`, `/risks`, `/controls`, `/incidents`, `/loss-events`,
  `/metrics`: paged lists (`?limit=&offset=`, default 100, max 500)
- `GET /dashboard/ciso`, `/dashboard/cio`, `/dashboard/cro`: that role, or
  BOARD
- `GET /dashboard/board`: BOARD only

## License

Free for your own organization's internal use, including commercial use. It may not be resold, rebranded or hosted for others, and the "Powered by Crestera" notice stays. See [LICENSE](LICENSE). Third-party notices: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
