import { HealthResponse } from "@g-bank/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { testConfig } from "./helpers/config.ts";

const app = createApp(testConfig);

describe("GET /api/v1/health", () => {
  it("says the server is up", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(HealthResponse.parse(res.body)).toEqual({ status: "ok" });
  });

  it("tags the response with a request id", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("doesn't advertise that it runs Express", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});
