import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { createRuntime } from "../../src/app.js";
import { runWithRequestActor } from "../../src/request-context.js";

type Json = Record<string, unknown>;

const port = Number(process.env.E2E_COLLAB_PORT ?? 13213);
const keepAlive = process.env.E2E_COLLAB_KEEP_ALIVE === "1";
const dataRoot = join(process.cwd(), ".data");
await mkdir(dataRoot, { recursive: true });
const isolatedDirectory = await mkdtemp(join(dataRoot, "e2e-collab-refresh-"));

const runtime = createRuntime({
  databasePath: join(isolatedDirectory, "novel.db"),
  masterSecret: "collab-refresh-e2e-master-secret-32chars",
  security: { allowPrivateAiEndpoints: true, enforceSameOrigin: false, apiRateLimit: 10_000, allowRegistration: true }
});

const owner = runtime.auth.register({ username: "collab_owner", password: "CollabOwner123!" });
const writer = runtime.auth.register({ username: "collab_writer", password: "CollabWriter123!" });

const fixture = runWithRequestActor(owner.session.user, () => {
  const work = runtime.store.createWork({ title: "协作刷新 E2E", author: "E2E" });
  const workId = String(work.id);
  runtime.auth.addMember(workId, writer.session.user.userId, { role: "editor" }, owner.session.user.userId);
  const volume = runtime.store.createVolume(workId, { title: "第一卷" });
  const chapter = runtime.store.createChapter(workId, {
    volumeId: String(volume.id),
    title: "第一章",
    content: "原始协作正文。"
  });
  return {
    workId,
    chapterId: String(chapter.id),
    versionNo: Number(chapter.versionNo)
  };
});

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (requestUrl.pathname === "/__e2e/login-writer") {
    response.setHeader("Set-Cookie", `scriverse_session=${encodeURIComponent(writer.token)}; Path=/; HttpOnly; SameSite=Lax`);
    response.writeHead(302, { Location: `/#view=editor&work=${fixture.workId}&chapter=${fixture.chapterId}` });
    response.end();
    return;
  }
  if (requestUrl.pathname === "/__e2e/login-owner") {
    response.setHeader("Set-Cookie", `scriverse_session=${encodeURIComponent(owner.token)}; Path=/; HttpOnly; SameSite=Lax`);
    response.writeHead(302, { Location: `/#view=editor&work=${fixture.workId}&chapter=${fixture.chapterId}` });
    response.end();
    return;
  }
  if (requestUrl.pathname === "/__e2e/owner-save" && request.method === "POST") {
    void (async () => {
      try {
        const chapter = await fetch(`http://127.0.0.1:${port}/api/chapters/${fixture.chapterId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `scriverse_session=${encodeURIComponent(owner.token)}`,
            "X-CSRF-Token": owner.session.csrfToken
          },
          body: JSON.stringify({
            content: `作者已更新协作正文 ${Date.now()}`,
            expectedVersionNo: fixture.versionNo
          })
        });
        const payload = await chapter.json() as { data?: Json; error?: Json };
        if (!chapter.ok) {
          response.writeHead(chapter.status, { "Content-Type": "application/json" });
          response.end(JSON.stringify(payload));
          return;
        }
        fixture.versionNo = Number(payload.data?.versionNo ?? fixture.versionNo);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, versionNo: fixture.versionNo }));
      } catch (error) {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: String(error) }));
      }
    })();
    return;
  }
  runtime.app(request, response);
});

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", () => resolve());
});

const baseUrl = `http://127.0.0.1:${port}`;
console.log(JSON.stringify({
  ready: true,
  baseUrl,
  workId: fixture.workId,
  chapterId: fixture.chapterId,
  writerLogin: `${baseUrl}/__e2e/login-writer`,
  ownerSave: `${baseUrl}/__e2e/owner-save`
}));

async function presence(cookieToken: string, csrf: string, clientId: string, resourceId: string): Promise<Json> {
  const response = await fetch(`${baseUrl}/api/works/${fixture.workId}/presence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `scriverse_session=${encodeURIComponent(cookieToken)}`,
      "X-CSRF-Token": csrf
    },
    body: JSON.stringify({
      clientId,
      page: { kind: "editor", resourceId }
    })
  });
  const payload = await response.json() as { data?: Json; error?: Json };
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload.data as Json;
}

try {
  const firstClientId = randomUUID();
  console.log("[e2e] presence clientId", firstClientId);
  await presence(writer.token, writer.session.csrfToken, firstClientId, fixture.chapterId);

  const saveResponse = await fetch(`${baseUrl}/__e2e/owner-save`, { method: "POST" });
  const savePayload = await saveResponse.json() as Json;
  assert.equal(saveResponse.status, 200, JSON.stringify(savePayload));
  assert.equal(savePayload.ok, true);

  const writerClientId = randomUUID();
  const afterSave = await presence(writer.token, writer.session.csrfToken, writerClientId, fixture.chapterId);
  const recentChanges = Array.isArray(afterSave.recentChanges) ? afterSave.recentChanges as Json[] : [];
  assert.ok(recentChanges.some((change) => (
    change.pageKey === `editor:${fixture.chapterId}`
    && change.actorUserId === owner.session.user.userId
    && change.actorDisplayName === "collab_owner"
  )), `expected recentChanges for chapter save, got ${JSON.stringify(recentChanges)}`);

  const otherPage = await presence(writer.token, writer.session.csrfToken, writerClientId, "other-chapter");
  const otherChanges = Array.isArray(otherPage.recentChanges) ? otherPage.recentChanges as Json[] : [];
  assert.ok(otherChanges.some((change) => change.pageKey === `editor:${fixture.chapterId}`));

  console.log("[e2e] collaboration-refresh: API recentChanges after same-page save OK");

  if (!keepAlive) {
    server.closeAllConnections();
    server.close();
    runtime.close();
    await rm(isolatedDirectory, { recursive: true, force: true });
    process.exit(0);
  }

  console.log("[e2e] collaboration-refresh: keep-alive for browser verification");
} catch (error) {
  console.error(error);
  server.closeAllConnections();
  server.close();
  runtime.close();
  await rm(isolatedDirectory, { recursive: true, force: true });
  process.exit(1);
}

async function shutdown(): Promise<void> {
  server.closeAllConnections();
  server.close();
  runtime.close();
  await rm(isolatedDirectory, { recursive: true, force: true });
  process.exit(0);
}

process.on("SIGINT", () => { void shutdown(); });
process.on("SIGTERM", () => { void shutdown(); });
