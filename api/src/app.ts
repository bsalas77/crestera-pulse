import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/authRoutes";
import { dashboardRoutes } from "./routes/dashboardRoutes";
import { entityRoutes } from "./routes/entityRoutes";

interface AppOptions {
  /** Reverse proxies in front of the API (0 = none). Decides whose IP the login limiter counts. */
  trustProxyHops?: number;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  const hops = options.trustProxyHops ?? env.trustProxyHops;
  if (hops > 0) app.set("trust proxy", hops);
  app.disable("x-powered-by");

  const loginRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    // Only failed attempts count: many people can sit behind one address
    // (an office NAT, Docker Desktop's port forwarding), and signing in
    // correctly should never lock a colleague out.
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts — try again in a minute." },
  });

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth/login", loginRateLimiter);
  app.use("/auth", authRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/", entityRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
