import { Router } from "express";
import { demoModeHandler, loginHandler } from "../controllers/authController";

export const authRoutes = Router();

authRoutes.post("/login", loginHandler);
authRoutes.get("/demo", demoModeHandler);
