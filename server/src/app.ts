import express from "express";
import { pinoHttp } from "pino-http";
import type { Config } from "./config.ts";
import { createLogger } from "./logger.ts";
import { requestId } from "./middleware/requestId.ts";
import { healthRouter } from "./modules/health/routes.ts";
import { createErrorHandler, notFound } from "./middleware/errorHandler.ts";

export function createApp(config: Config) {
  const logger = createLogger(config);
  const app = express();

  app.disable("x-powered-by");
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use("/api/v1", healthRouter);
  app.use(notFound);
  app.use(createErrorHandler(logger));

  return app;
}
