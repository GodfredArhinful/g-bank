import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const id = randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
