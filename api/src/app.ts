import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/authRoutes";
import { dashboardRoutes } from "./routes/dashboardRoutes";
import { entityRoutes } from "./routes/entityRoutes";

const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — try again in a minute." },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth/login", loginRateLimiter);
  app.use("/auth", authRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/", entityRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
