import { ErrorResponse } from "@g-bank/shared";
import express from "express";
import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { testConfig } from "./helpers/config.ts";
import { AppError } from "../src/lib/errors.ts";
import { createErrorHandler, notFound } from "../src/middleware/errorHandler.ts";
import { requestId } from "../src/middleware/requestId.ts";

// A tiny app with two routes that fail on purpose.
function buildTestApp() {
  const app = express();
  app.use(requestId);
  app.get("/rule-broken", () => {
    throw new AppError(422, "insufficient_funds", "Not enough money.", { balanceCents: 500 });
  });
  app.get("/bug", () => {
    throw new Error("database password is hunter2");
  });
  app.use(notFound);
  app.use(createErrorHandler(pino({ level: "silent" })));
  return app;
}

describe("error handling", () => {
  const app = buildTestApp();

  it("turns an AppError into its status and code", async () => {
    const res = await request(app).get("/rule-broken");
    expect(res.status).toBe(422);
    const body = ErrorResponse.parse(res.body);
    expect(body.error.code).toBe("insufficient_funds");
    expect(body.error.message).toBe("Not enough money.");
    expect(body.error.meta).toEqual({ balanceCents: 500 });
  });

  it("hides the details of unexpected errors", async () => {
    const res = await request(app).get("/bug");
    expect(res.status).toBe(500);
    const body = ErrorResponse.parse(res.body);
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });

  it("answers unknown routes with 404 not_found", async () => {
    const res = await request(app).get("/nothing-here");
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(res.body).error.code).toBe("not_found");
  });

  it("puts the same request id in the header and the body", async () => {
    const res = await request(app).get("/nothing-here");
    const header = res.headers["x-request-id"];
    expect(header).toMatch(/^[0-9a-f-]{36}$/);
    expect(ErrorResponse.parse(res.body).error.requestId).toBe(header);
  });
});

describe("the real app", () => {
  it("answers unknown API routes in the standard error shape", async () => {
    const app = createApp(testConfig);
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(res.body).error.code).toBe("not_found");
  });
});
