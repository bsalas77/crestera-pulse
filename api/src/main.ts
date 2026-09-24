import { createApp } from "./app";
import { checkEnv } from "./config/validateEnv";
import { env } from "./config/env";

const report = checkEnv();
for (const warning of report.warnings) {
  console.warn(`[env] ${warning}`);
}
if (report.errors.length > 0) {
  for (const error of report.errors) {
    console.error(`[env] ${error}`);
  }
  console.error("Refusing to start with invalid production configuration. Fix the values above in your .env file.");
  process.exit(1);
}

const app = createApp();

app.listen(env.port, () => {
  console.log(`Dashboard API listening on port ${env.port}`);
});
