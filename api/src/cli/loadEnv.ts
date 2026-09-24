import path from "node:path";
import dotenv from "dotenv";

// When run with npm on the host (development), load api/.env and then the
// repo-root .env that docker compose reads; the first file to define a
// variable wins. Inside the container neither file exists and the settings
// come from docker compose, so this does nothing.
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });
