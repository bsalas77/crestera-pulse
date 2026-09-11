import type { NextFunction, Request, Response } from "express";
import * as dashboardService from "../services/dashboardService";

function handler(fn: () => Promise<unknown>) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await fn());
    } catch (err) {
      next(err);
    }
  };
}

export const cisoDashboard = handler(dashboardService.getCisoDashboard);
export const cioDashboard = handler(dashboardService.getCioDashboard);
export const croDashboard = handler(dashboardService.getCroDashboard);
export const boardDashboard = handler(dashboardService.getBoardDashboard);
