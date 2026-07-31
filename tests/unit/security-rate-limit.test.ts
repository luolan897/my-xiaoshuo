import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApiRateLimitMiddleware, createUploadRateLimitMiddleware } from "../../src/security.js";

describe("安全限速器", () => {
  it("达到来源状态上限后淘汰最早条目", async () => {
    const app = express();
    app.set("trust proxy", true);
    app.use(createApiRateLimitMiddleware(1, 60_000, 2));
    app.get("/api/test", (_request, response) => response.json({ ok: true }));

    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.1").expect(200);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.1").expect(429);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.2").expect(200);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.3").expect(200);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.1").expect(200);
  });

  it("对高成本上传路由应用独立限额", async () => {
    const app = express();
    app.use(createUploadRateLimitMiddleware(1, 60_000, 10));
    app.all("/{*path}", (_request, response) => response.json({ ok: true }));

    await request(app).post("/api/works/import").expect(200);
    const blocked = await request(app).put("/api/auth/avatar").expect(429);
    expect(blocked.body.error.code).toBe("UPLOAD_RATE_LIMITED");
    expect(blocked.headers["retry-after"]).toBe("60");
    await request(app).post("/api/works").expect(200);
  });
});
