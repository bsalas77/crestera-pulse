import { Router } from "express";
import { authenticate, requireRole } from "../auth/authMiddleware";
import { boardDashboard, cioDashboard, cisoDashboard, croDashboard } from "../controllers/dashboardController";

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticate);

dashboardRoutes.get("/ciso", requireRole("CISO", "BOARD"), cisoDashboard);
dashboardRoutes.get("/cio", requireRole("CIO", "BOARD"), cioDashboard);
dashboardRoutes.get("/cro", requireRole("CRO", "BOARD"), croDashboard);
dashboardRoutes.get("/board", requireRole("BOARD"), boardDashboard);
