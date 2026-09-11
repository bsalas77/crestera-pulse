import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "8000", 10),
  db: {
    host: required("DB_HOST", "localhost"),
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    user: required("DB_USER", "dashboard"),
    password: required("DB_PASS", "dashboard_pass"),
    database: required("DB_NAME", "dashboard"),
  },
  jwtSecret: required("JWT_SECRET", "some-dev-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};
