import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  createApiRateLimitMiddleware,
  createCaptchaRateLimitMiddleware,
  createExpensiveApiRateLimitMiddleware,
  createUploadRateLimitMiddleware,
  resolveTrustProxySetting
} from "../../src/security.js";

describe("安全限速器", () => {
  it("达到来源状态上限后淘汰最早条目", async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.use(createApiRateLimitMiddleware(1, 60_000, 2));
    app.get("/api/test", (_request, response) => response.json({ ok: true }));

    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.1").expect(200);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.1").expect(429);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.2").expect(200);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.3").expect(200);
    await request(app).get("/api/test").set("X-Forwarded-For", "192.0.2.1").expect(200);
  });

  it("未启用 trust proxy 时忽略可伪造的 X-Forwarded-For", async () => {
    const app = express();
    app.use(createApiRateLimitMiddleware(1, 60_000));
    app.get("/api/test", (_request, response) => response.json({ ok: true }));

    await request(app).get("/api/test").set("X-Forwarded-For", "198.51.100.1").expect(200);
    const blocked = await request(app).get("/api/test").set("X-Forwarded-For", "198.51.100.2").expect(429);
    expect(blocked.body.error.code).toBe("API_RATE_LIMITED");
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

  it("对验证码与昂贵接口应用独立限额", async () => {
    const captchaApp = express();
    captchaApp.use(createCaptchaRateLimitMiddleware(1, 60_000));
    captchaApp.all("/{*path}", (_request, response) => response.json({ ok: true }));
    await request(captchaApp).get("/api/auth/captcha").expect(200);
    const blockedCaptcha = await request(captchaApp).get("/api/auth/captcha").expect(429);
    expect(blockedCaptcha.body.error.code).toBe("CAPTCHA_RATE_LIMITED");

    const expensiveApp = express();
    expensiveApp.use((request, _response, next) => {
      request.authUser = { userId: "user_expensive" } as typeof request.authUser;
      next();
    });
    expensiveApp.use(createExpensiveApiRateLimitMiddleware(60_000));
    expensiveApp.all("/{*path}", (_request, response) => response.json({ ok: true }));

    await request(expensiveApp).post("/api/works/work_1/chat/stream").expect(200);
    for (let index = 0; index < 29; index += 1) {
      await request(expensiveApp).post("/api/works/work_1/suggestions").expect(200);
    }
    const blockedAi = await request(expensiveApp).post("/api/works/work_1/tasks").expect(429);
    expect(blockedAi.body.error.code).toBe("EXPENSIVE_API_RATE_LIMITED");

    await request(expensiveApp).get("/api/works/work_1/export").expect(200);
    for (let index = 0; index < 9; index += 1) {
      await request(expensiveApp).get("/api/works/work_1/export").expect(200);
    }
    const blockedExport = await request(expensiveApp).get("/api/works/work_1/export").expect(429);
    expect(blockedExport.body.error.code).toBe("EXPENSIVE_API_RATE_LIMITED");
  });
});

describe("trust proxy 解析", () => {
  it("将 trust proxy=true 收敛为单跳", () => {
    expect(resolveTrustProxySetting(true)).toBe(1);
    expect(resolveTrustProxySetting(2)).toBe(2);
    expect(resolveTrustProxySetting(false)).toBe(false);
    expect(resolveTrustProxySetting(undefined)).toBeUndefined();
  });
});
