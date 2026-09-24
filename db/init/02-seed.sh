#!/bin/sh
# Runs at first container boot (docker-entrypoint-initdb.d, which sources
# .sh files into the caller's shell — no `set -e` here so a failure can't
# affect the rest of that shell). Demo seeding is opt-out via SEED_DEMO so a
# real deployment can start with an empty schema instead of the built-in
# fictional bank data.

if [ "${SEED_DEMO:-true}" = "true" ]; then
  echo "SEED_DEMO=true — loading demo data (db/seed.sql)."
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /seed-source/seed.sql
else
  echo "SEED_DEMO=false — skipping demo data. Schema created empty; load your own data with the importer (README: Bring your own data)."
fi
