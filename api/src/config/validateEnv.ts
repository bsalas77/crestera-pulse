/**
 * Startup environment validation. A misconfigured production deploy (default
 * JWT secret, default DB password, wide-open CORS) should fail loudly at
 * boot, not silently at first request. `validateEnv` is pure (takes an env
 * bag) so the rules are unit-testable; `main.ts` runs it against
 * process.env and throws in production when there are errors.
 */

export interface EnvReport {
  errors: string[];
  warnings: string[];
}

const PLACEHOLDER = /change-me|changeme|your-org\.example|xxxx|placeholder|some-dev-secret/i;
const MIN_SECRET_LEN = 32;

function isSet(v: string | undefined): v is string {
  return typeof v === "string" && v.trim() !== "";
}

export function validateEnv(env: Record<string, string | undefined>, prod: boolean): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fail = (msg: string) => (prod ? errors : warnings).push(msg);

  const jwtSecret = env.JWT_SECRET;
  if (!isSet(jwtSecret)) {
    fail("JWT_SECRET is required to sign tokens.");
  } else if (PLACEHOLDER.test(jwtSecret)) {
    fail("JWT_SECRET is still the example/default value — generate a real random secret.");
  } else if (jwtSecret.length < MIN_SECRET_LEN) {
    fail(`JWT_SECRET should be at least ${MIN_SECRET_LEN} characters.`);
  }

  const dbPass = env.DB_PASS;
  if (isSet(dbPass) && dbPass === "dashboard_pass") {
    fail("DB_PASS is still the default value — set a real password.");
  }

  const corsOrigin = env.CORS_ORIGIN;
  if (prod && corsOrigin === "*") {
    errors.push("CORS_ORIGIN is \"*\" in production — set it to the real UI origin.");
  }

  return { errors, warnings };
}

export function checkEnv(prod = process.env.NODE_ENV === "production"): EnvReport {
  return validateEnv(process.env as Record<string, string | undefined>, prod);
}
