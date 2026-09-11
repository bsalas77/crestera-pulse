import { query } from "../db/pool";

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;

export interface Pagination {
  limit: number;
  offset: number;
}

export function resolvePagination(rawLimit: unknown, rawOffset: unknown): Pagination {
  const parsedLimit = typeof rawLimit === "string" ? parseInt(rawLimit, 10) : NaN;
  const parsedOffset = typeof rawOffset === "string" ? parseInt(rawOffset, 10) : NaN;

  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  return { limit, offset };
}

const paginated = (orderedSelect: string) => (pagination: Pagination) =>
  query(`${orderedSelect} LIMIT $1 OFFSET $2`, [pagination.limit, pagination.offset]);

export const getAssets = paginated("SELECT * FROM assets ORDER BY criticality DESC, name");

export const getRisks = paginated("SELECT * FROM risks ORDER BY residual_score DESC NULLS LAST");

export const getControls = paginated("SELECT * FROM controls ORDER BY framework, name");

export const getIncidents = paginated("SELECT * FROM incidents ORDER BY start_time DESC");

export const getLossEvents = paginated("SELECT * FROM loss_events ORDER BY date DESC");

export const getMetrics = paginated("SELECT * FROM metrics ORDER BY category, name");
