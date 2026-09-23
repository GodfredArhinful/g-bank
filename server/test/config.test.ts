import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

const required = { DATABASE_URL: "postgres://localhost:5432/gbank_dev" };

describe("loadConfig", () => {
  it("uses defaults when optional variables are missing", () => {
    expect(loadConfig(required)).toEqual({
      NODE_ENV: "development",
      PORT: 3000,
      LOG_LEVEL: "info",
      DATABASE_URL: required.DATABASE_URL,
    });
  });

  it("refuses to start without DATABASE_URL", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it("turns PORT from text into a number", () => {
    expect(loadConfig({ ...required, PORT: "8080" }).PORT).toBe(8080);
  });

  it("names the bad variable when PORT is not a number", () => {
    expect(() => loadConfig({ ...required, PORT: "not-a-number" })).toThrow(/PORT/);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => loadConfig({ ...required, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
