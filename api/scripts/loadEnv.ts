import path from "node:path";
import dotenv from "dotenv";

// npm scripts run from api/, but operators keep their config in the repo-root
// .env that docker-compose reads. First file to define a variable wins.
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
