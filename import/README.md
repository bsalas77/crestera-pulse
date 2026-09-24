# Your data goes here

Put your filled-in CSV files in this folder, named exactly like the templates
in `db/templates/` (for example `risks.csv`, `assets.csv`). Then, from the
folder that contains `docker-compose.yml`, run:

    docker compose run --rm api node dist/cli/import-csv.js

To refresh later (swaps all dashboard data for these files, keeps logins):

    docker compose run --rm api node dist/cli/import-csv.js --replace

Files you put here are never committed to git (see `.gitignore`), so your
institution's data stays on this machine. Full instructions: the
"Bring your own data" section of the main README.
