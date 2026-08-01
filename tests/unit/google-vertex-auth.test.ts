import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createGoogleServiceAccountJwt,
  exchangeGoogleServiceAccountToken,
  GOOGLE_CLOUD_PLATFORM_SCOPE,
  GOOGLE_OAUTH_TOKEN_URL,
  GoogleVertexTokenCache,
  maskServiceAccountHint,
  parseGoogleServiceAccount
} from "../../src/google-vertex-auth.js";
import { AppError } from "../../src/errors.js";

function createTestServiceAccountJson(overrides: Record<string, unknown> = {}): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return JSON.stringify({
    type: "service_account",
    project_id: "demo-project",
    private_key_id: "key-id",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
    client_email: "vertex-bot@demo-project.iam.gserviceaccount.com",
    client_id: "1234567890",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: GOOGLE_OAUTH_TOKEN_URL,
    ...overrides
  });
}

describe("Google Vertex 服务账号鉴权", () => {
  it("解析合法服务账号 JSON 并生成掩码", () => {
    const raw = createTestServiceAccountJson();
    const account = parseGoogleServiceAccount(raw);
    expect(account).toMatchObject({
      type: "service_account",
      client_email: "vertex-bot@demo-project.iam.gserviceaccount.com",
      project_id: "demo-project"
    });
    expect(account.private_key).toContain("BEGIN PRIVATE KEY");
    expect(maskServiceAccountHint(account)).toBe("sa:vertex-bot@demo-project.iam.gserviceaccount.com");
  });

  it("拒绝残缺或错误类型的服务账号 JSON", () => {
    expect(() => parseGoogleServiceAccount("{")).toThrow(AppError);
    expect(() => parseGoogleServiceAccount(JSON.stringify({ type: "authorized_user" }))).toThrow(/service_account/u);
    expect(() => parseGoogleServiceAccount(JSON.stringify({
      type: "service_account",
      client_email: "a@b.com"
    }))).toThrow(/private_key/u);
  });

  it("签发包含 cloud-platform scope 的 JWT", () => {
    const account = parseGoogleServiceAccount(createTestServiceAccountJson());
    const jwt = createGoogleServiceAccountJwt(account, 1_700_000_000);
    const [, payload] = jwt.split(".");
    expect(payload).toBeTruthy();
    const claims = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) as Record<string, unknown>;
    expect(claims).toMatchObject({
      iss: account.client_email,
      sub: account.client_email,
      aud: GOOGLE_OAUTH_TOKEN_URL,
      iat: 1_700_000_000,
      exp: 1_700_003_600,
      scope: GOOGLE_CLOUD_PLATFORM_SCOPE
    });
  });

  it("缓存 access token，并在临近过期时刷新", async () => {
    const account = parseGoogleServiceAccount(createTestServiceAccountJson());
    const fetchToken = vi.fn(async () => ({ accessToken: `token-${fetchToken.mock.calls.length}`, expiresInSeconds: 3_600 }));
    const cache = new GoogleVertexTokenCache();
    const first = await cache.getAccessToken("provider-1", account, fetchToken, 1_000);
    const second = await cache.getAccessToken("provider-1", account, fetchToken, 2_000);
    expect(first).toBe("token-1");
    expect(second).toBe("token-1");
    expect(fetchToken).toHaveBeenCalledTimes(1);

    const refreshed = await cache.getAccessToken("provider-1", account, fetchToken, 1_000 + 3_600_000 - 30_000);
    expect(refreshed).toBe("token-2");
    expect(fetchToken).toHaveBeenCalledTimes(2);
  });

  it("exchangeGoogleServiceAccountToken 会调用换票函数", async () => {
    const account = parseGoogleServiceAccount(createTestServiceAccountJson());
    const fetchToken = vi.fn(async (jwt: string) => {
      expect(jwt.split(".")).toHaveLength(3);
      return { accessToken: "ya29.test-token", expiresInSeconds: 3600 };
    });
    await expect(exchangeGoogleServiceAccountToken(account, fetchToken)).resolves.toEqual({
      accessToken: "ya29.test-token",
      expiresInSeconds: 3600
    });
  });
});
