interface ErrorWithCode {
  code?: string;
  message?: string;
}

/**
 * Turns a database/connection error into advice a first-time operator can act
 * on. Returns null for errors it doesn't recognise, so callers can fall back to
 * the raw message.
 */
export function describeDbError(err: unknown, target: { host: string; port: number; user: string; database: string }): string | null {
  const e = (err ?? {}) as ErrorWithCode;
  switch (e.code) {
    case "ECONNREFUSED":
    case "ENOTFOUND":
    case "EAI_AGAIN":
    case "ETIMEDOUT":
      return (
        `Can't reach the database at ${target.host}:${target.port}. ` +
        "Make sure it is running: `docker compose up -d db` (from the folder with docker-compose.yml)."
      );
    case "28P01":
      return (
        `The database rejected the password for user "${target.user}". ` +
        "DB_PASS in .env doesn't match the password the database was created with — it is fixed the first time " +
        "the database starts. Put the original DB_PASS back, or reset the database with " +
        "`docker compose down -v` (this deletes its data) and start again."
      );
    case "3D000":
      return (
        `The database "${target.database}" doesn't exist. DB_NAME in .env was probably changed after the first ` +
        "start; change it back, or reset with `docker compose down -v` (deletes data)."
      );
    case "42P01":
      return (
        "The database has no tables yet. It is created automatically on first start — if this persists, reset it " +
        "with `docker compose down -v` and start again."
      );
    default:
      return null;
  }
}
