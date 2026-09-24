import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Comma-separated list, so one deployment can accept e.g. both localhost and 127.0.0.1. */
export function parseOrigins(raw: string | undefined): string[] {
  return (raw ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export const env = {
  port: parseInt(process.env.PORT ?? "8000", 10),
  db: {
    host: required("DB_HOST", "127.0.0.1"),
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    user: required("DB_USER", "dashboard"),
    password: required("DB_PASS", "dashboard_pass"),
    database: required("DB_NAME", "dashboard"),
  },
  jwtSecret: required("JWT_SECRET", "some-dev-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  // TRUST_PROXY counts the operator's own reverse proxies; BUILTIN_PROXY_HOPS is
  // set by docker-compose for the UI's nginx, which forwards /api to this server.
  trustProxyHops:
    (parseInt(process.env.TRUST_PROXY ?? "0", 10) || 0) + (parseInt(process.env.BUILTIN_PROXY_HOPS ?? "0", 10) || 0),
};
