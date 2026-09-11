import { Router } from "express";
import { authenticate } from "../auth/authMiddleware";
import {
  listAssets,
  listControls,
  listIncidents,
  listLossEvents,
  listMetrics,
  listRisks,
} from "../controllers/entityController";

export const entityRoutes = Router();

entityRoutes.use(authenticate);

entityRoutes.get("/assets", listAssets);
entityRoutes.get("/risks", listRisks);
entityRoutes.get("/controls", listControls);
entityRoutes.get("/incidents", listIncidents);
entityRoutes.get("/loss-events", listLossEvents);
entityRoutes.get("/metrics", listMetrics);
