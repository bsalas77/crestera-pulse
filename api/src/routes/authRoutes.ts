import { Router } from "express";
import { loginHandler } from "../controllers/authController";

export const authRoutes = Router();

authRoutes.post("/login", loginHandler);
