import { createSign } from "node:crypto";
import { AppError } from "./errors.js";

export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

const TOKEN_EXPIRY_SKEW_MS = 60_000;
const JWT_LIFETIME_SECONDS = 3_600;

export type GoogleServiceAccount = {
  type: "service_account";
  client_email: string;
  private_key: string;
  project_id?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buffer.toString("base64url");
}

function readNonEmptyString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(400, "INVALID_SERVICE_ACCOUNT", `服务账号 JSON 缺少有效字段：${key}`);
  }
  return value.trim();
}

export function parseGoogleServiceAccount(raw: string): GoogleServiceAccount {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new AppError(400, "INVALID_SERVICE_ACCOUNT", "服务账号 JSON 无法解析");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AppError(400, "INVALID_SERVICE_ACCOUNT", "服务账号 JSON 必须是对象");
  }
  const record = parsed as Record<string, unknown>;
  if (record.type !== "service_account") {
    throw new AppError(400, "INVALID_SERVICE_ACCOUNT", "服务账号 JSON 的 type 必须为 service_account");
  }
  const clientEmail = readNonEmptyString(record, "client_email");
  const privateKey = readNonEmptyString(record, "private_key");
  const projectId = typeof record.project_id === "string" && record.project_id.trim()
    ? record.project_id.trim()
    : undefined;
  return {
    type: "service_account",
    client_email: clientEmail,
    private_key: privateKey,
    ...(projectId ? { project_id: projectId } : {})
  };
}

export function maskServiceAccountHint(account: GoogleServiceAccount): string {
  return `sa:${account.client_email}`;
}

export function createGoogleServiceAccountJwt(
  account: GoogleServiceAccount,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: account.client_email,
    sub: account.client_email,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + JWT_LIFETIME_SECONDS,
    scope: GOOGLE_CLOUD_PLATFORM_SCOPE
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  let signature: Buffer;
  try {
    signature = signer.sign(account.private_key);
  } catch {
    throw new AppError(400, "INVALID_SERVICE_ACCOUNT", "服务账号私钥无法用于签名");
  }
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export type GoogleTokenFetcher = (jwt: string) => Promise<{ accessToken: string; expiresInSeconds: number }>;

export async function exchangeGoogleServiceAccountToken(
  account: GoogleServiceAccount,
  fetchToken: GoogleTokenFetcher,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const jwt = createGoogleServiceAccountJwt(account, nowSeconds);
  return fetchToken(jwt);
}

export class GoogleVertexTokenCache {
  private readonly tokens = new Map<string, CachedToken>();

  clear(cacheKey?: string): void {
    if (cacheKey) this.tokens.delete(cacheKey);
    else this.tokens.clear();
  }

  async getAccessToken(
    cacheKey: string,
    account: GoogleServiceAccount,
    fetchToken: GoogleTokenFetcher,
    nowMs = Date.now()
  ): Promise<string> {
    const cached = this.tokens.get(cacheKey);
    if (cached && cached.expiresAtMs - TOKEN_EXPIRY_SKEW_MS > nowMs) {
      return cached.accessToken;
    }
    const exchanged = await exchangeGoogleServiceAccountToken(
      account,
      fetchToken,
      Math.floor(nowMs / 1000)
    );
    const expiresInSeconds = Number.isFinite(exchanged.expiresInSeconds) && exchanged.expiresInSeconds > 0
      ? exchanged.expiresInSeconds
      : JWT_LIFETIME_SECONDS;
    this.tokens.set(cacheKey, {
      accessToken: exchanged.accessToken,
      expiresAtMs: nowMs + expiresInSeconds * 1_000
    });
    return exchanged.accessToken;
  }
}

export async function fetchGoogleOAuthAccessToken(
  jwt: string,
  outboundFetch: (url: string, init: RequestInit) => Promise<Response>
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const response = await outboundFetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }).toString()
  });
  const body = await response.text();
  if (!response.ok) {
    throw new AppError(502, "VERTEX_TOKEN_EXCHANGE_FAILED", `Google OAuth 换票失败：HTTP ${response.status}`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    throw new AppError(502, "VERTEX_TOKEN_EXCHANGE_FAILED", "Google OAuth 换票返回了无效 JSON");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError(502, "VERTEX_TOKEN_EXCHANGE_FAILED", "Google OAuth 换票返回了无效响应");
  }
  const record = payload as Record<string, unknown>;
  const accessToken = typeof record.access_token === "string" ? record.access_token.trim() : "";
  if (!accessToken) {
    throw new AppError(502, "VERTEX_TOKEN_EXCHANGE_FAILED", "Google OAuth 换票响应缺少 access_token");
  }
  const expiresInSeconds = typeof record.expires_in === "number" && Number.isFinite(record.expires_in)
    ? record.expires_in
    : JWT_LIFETIME_SECONDS;
  return { accessToken, expiresInSeconds };
}
