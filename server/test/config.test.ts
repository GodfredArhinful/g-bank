import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

describe("loadConfig", () => {
  it("uses defaults when variables are missing", () => {
    expect(loadConfig({})).toEqual({ NODE_ENV: "development", PORT: 3000, LOG_LEVEL: "info" });
  });

  it("turns PORT from text into a number", () => {
    expect(loadConfig({ PORT: "8080" }).PORT).toBe(8080);
  });

  it("names the bad variable when PORT is not a number", () => {
    expect(() => loadConfig({ PORT: "not-a-number" })).toThrow(/PORT/);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => loadConfig({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
