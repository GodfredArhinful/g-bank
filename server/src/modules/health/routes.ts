import type { HealthResponse } from "@g-bank/shared";
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const response: HealthResponse = { status: "ok" };
  res.json(response);
});
