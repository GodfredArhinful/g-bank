import pino from "pino";
import type { Config } from "./config.ts";

export function createLogger(config: Config) {
  return pino({
    level: config.LOG_LEVEL,
    redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
  });
}
