import { loadConfig } from "../../src/config.ts";
import { TEST_DATABASE_URL } from "./env.ts";

export const testConfig = loadConfig({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  DATABASE_URL: TEST_DATABASE_URL,
});
