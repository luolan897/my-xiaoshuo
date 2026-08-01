import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Vercel 仅允许 main 分支自动部署", async () => {
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(vercel.git?.deploymentEnabled, { "*": false, main: true });
});

test("docs 路由提供全局工具调用限制说明页", async () => {
  const indexHtml = await readFile(new URL("../public/docs/index.html", import.meta.url), "utf8");
  const docHtml = await readFile(new URL("../public/docs/global-tool-call-limit.html", import.meta.url), "utf8");
  const docsIndexRoute = await readFile(new URL("../app/docs/page.tsx", import.meta.url), "utf8");
  const docsDetailRoute = await readFile(new URL("../app/docs/global-tool-call-limit/page.tsx", import.meta.url), "utf8");
  assert.match(indexHtml, /href="\/docs\/global-tool-call-limit\.html"/);
  assert.match(indexHtml, /全局工具调用限制/);
  assert.match(docHtml, /<title>全局工具调用限制/);
  assert.match(docHtml, /不会被 Compact 重置的熔断阀/);
  assert.match(docHtml, /全局上限 = 调用上限 × 全局倍数/);
  assert.match(docHtml, /允许一次「压缩后重试」/);
  assert.match(docHtml, /不会<\/strong>改动 Agent 请求的 prompt cache 前缀/);
  assert.match(docHtml, /只影响<strong>新对话<\/strong>/);
  assert.match(docsIndexRoute, /redirect\("\/docs\/index\.html"\)/);
  assert.match(docsDetailRoute, /redirect\("\/docs\/global-tool-call-limit\.html"\)/);
});
