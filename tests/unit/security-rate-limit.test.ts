import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  createApiRateLimitMiddleware,
  createAuthenticationRateLimitMiddleware,
  createUploadRateLimitMiddleware,
  enforceCaseInsensitiveRouting,
  normalizeApiPath
} from "../../src/security.js";

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

  it("API 路径匹配忽略大小写，避免大小写变体绕过限速", async () => {
    const apiApp = express();
    enforceCaseInsensitiveRouting(apiApp);
    apiApp.use(createApiRateLimitMiddleware(1, 60_000));
    apiApp.all("/{*path}", (_request, response) => response.json({ ok: true }));

    await request(apiApp).get("/api/works/demo").expect(200);
    await request(apiApp).get("/API/WORKS/demo").expect(429);

    const authApp = express();
    enforceCaseInsensitiveRouting(authApp);
    authApp.use(createAuthenticationRateLimitMiddleware(1, 60_000));
    authApp.all("/{*path}", (_request, response) => response.json({ ok: true }));

    await request(authApp).post("/api/auth/login").expect(200);
    const blockedLogin = await request(authApp).post("/API/AUTH/LOGIN").expect(429);
    expect(blockedLogin.body.error.code).toBe("AUTH_RATE_LIMITED");
  });
});

describe("API 路径规范化", () => {
  it("将路径规范为小写供安全匹配使用", () => {
    expect(normalizeApiPath("/API/WORKS/abc")).toBe("/api/works/abc");
    expect(normalizeApiPath("/api/Users/Directory")).toBe("/api/users/directory");
  });

  it("强制保持大小写不敏感路由并拒绝开启", () => {
    const app = express();
    enforceCaseInsensitiveRouting(app);
    expect(app.get("case sensitive routing")).toBe(false);
    expect(() => app.set("case sensitive routing", true)).toThrow(/Case-sensitive routing is disabled/u);
    expect(app.get("case sensitive routing")).toBe(false);
    app.set("case sensitive routing", false);
    expect(app.get("case sensitive routing")).toBe(false);
  });
});
