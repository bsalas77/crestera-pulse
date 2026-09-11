import type { NextFunction, Request, Response } from "express";
import * as entityService from "../services/entityService";
import { resolvePagination } from "../services/entityService";

function handler(fn: (pagination: ReturnType<typeof resolvePagination>) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = resolvePagination(req.query.limit, req.query.offset);
      res.json(await fn(pagination));
    } catch (err) {
      next(err);
    }
  };
}

export const listAssets = handler(entityService.getAssets);
export const listRisks = handler(entityService.getRisks);
export const listControls = handler(entityService.getControls);
export const listIncidents = handler(entityService.getIncidents);
export const listLossEvents = handler(entityService.getLossEvents);
export const listMetrics = handler(entityService.getMetrics);
