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
  throw new Error("Refusing to start with invalid production configuration.");
}

const app = createApp();

app.listen(env.port, () => {
  console.log(`Dashboard API listening on port ${env.port}`);
});
