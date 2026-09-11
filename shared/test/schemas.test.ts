import { describe, expect, it } from "vitest";
import { ErrorResponse, HealthResponse } from "../src/index.ts";

describe("ErrorResponse", () => {
  it("accepts the standard error shape", () => {
    const body = {
      error: { code: "not_found", message: "Not here.", requestId: "abc" },
    };
    expect(ErrorResponse.parse(body)).toEqual(body);
  });

  it("rejects an error without a code", () => {
    const body = { error: { message: "Not here.", requestId: "abc" } };
    expect(ErrorResponse.safeParse(body).success).toBe(false);
  });
});

describe("HealthResponse", () => {
  it("only accepts status ok", () => {
    expect(HealthResponse.safeParse({ status: "ok" }).success).toBe(true);
    expect(HealthResponse.safeParse({ status: "down" }).success).toBe(false);
  });
});
