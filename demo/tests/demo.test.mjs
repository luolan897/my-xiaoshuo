import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { works } from "../data.js";
import { DEMO_CREDENTIALS, isValidDemoLogin } from "../demo-auth.js";
import { demoAssetVersion, readMainVersion, versionModuleSource, versionedDemoAdapterSource } from "../scripts/version.mjs";

test("预制两本不同类型的作品", () => {
  assert.equal(works.length, 2);
  assert.match(works[0].genre, /科幻/);
  assert.match(works[1].genre, /都市言情/);
});

test("科幻作品包含 20 到 30 个完整章节", () => {
  assert.ok(works[0].chapters.length >= 20 && works[0].chapters.length <= 30);
  for (const chapter of works[0].chapters) {
    assert.ok(chapter.title.length > 1);
    assert.ok(chapter.summary.length > 10);
    assert.ok(chapter.content.length > 100);
  }
});

test("两本作品都覆盖主要知识模块", () => {
  for (const work of works) {
    for (const key of ["chapters", "characters", "settings", "races", "organizations", "timeline", "relations", "outlines"]) {
      assert.ok(Array.isArray(work[key]) && work[key].length > 0, `${work.title} 缺少 ${key}`);
    }
  }
});

test("两本作品的人物关系图都具有足够密度", () => {
  for (const work of works) {
    assert.ok(work.characters.length >= 16, `${work.title} 的人物数量不足`);
    assert.ok(work.relations.length >= 24, `${work.title} 的关系数量不足`);
    const characterIds = new Set(work.characters.map((character) => character.id));
    for (const relationship of work.relations) {
      assert.ok(characterIds.has(relationship.from), `${work.title} 的关系起点不存在：${relationship.from}`);
      assert.ok(characterIds.has(relationship.to), `${work.title} 的关系终点不存在：${relationship.to}`);
    }
    assert.ok(new Set(work.relations.map((relationship) => relationship.kind)).size >= 4, `${work.title} 的关系类型不够丰富`);
  }
});

test("开发服务器直接复用正式站点前端资源", async () => {
  const server = await readFile(new URL("../scripts/serve.mjs", import.meta.url), "utf8");
  assert.match(server, /src\/public/);
  assert.match(server, /mock-api\.js/);
  assert.match(server, /process\.env\.PORT \?\? 45678/);
  assert.doesNotMatch(server, /novel\.db|sqlite/iu);
});

test("构建产物复制正式前端并注入预制数据适配层", async () => {
  const build = await readFile(new URL("../scripts/build.mjs", import.meta.url), "utf8");
  const adapter = await readFile(new URL("../mock-api.js", import.meta.url), "utf8");
  assert.match(build, /src\/public/);
  assert.match(build, /mock-api\.js/);
  assert.doesNotMatch(build, /cover-originals/);
  assert.match(adapter, /window\.fetch = mockApi/);
  assert.match(adapter, /\[data-product-footer\]/);
  assert.match(adapter, /notice\.textContent = "演示站"/);
  assert.doesNotMatch(adapter, /novel\.db|sqlite/iu);
});

test("两本预制作品都设置了项目内封面", async () => {
  const adapter = await readFile(new URL("../mock-api.js", import.meta.url), "utf8");
  assert.match(adapter, /\/demo-covers\/\$\{id\}\.webp/);
  for (const filename of ["silent-tide.webp", "city-blank.webp"]) {
    const cover = await stat(new URL(`../demo-covers/${filename}`, import.meta.url));
    assert.ok(cover.size > 50_000, `${filename} 不是有效的完整封面`);
    assert.ok(cover.size <= 200_000, `${filename} 超过 200 KB`);
  }
  for (const filename of ["silent-tide.png", "city-blank.png"]) {
    const original = await stat(new URL(`../cover-originals/${filename}`, import.meta.url));
    assert.ok(original.size > 2_000_000, `${filename} 不是保留的高分辨率原图`);
  }
});

test("Demo 使用公开凭据登录且关闭注册", async () => {
  const adapter = await readFile(new URL("../mock-api.js", import.meta.url), "utf8");
  assert.deepEqual(DEMO_CREDENTIALS, { username: "demo", password: "scriverse-demo", captchaAnswer: "2468" });
  assert.equal(isValidDemoLogin({ ...DEMO_CREDENTIALS, captchaId: "demo-captcha" }), true);
  assert.equal(isValidDemoLogin({ ...DEMO_CREDENTIALS, password: "wrong", captchaId: "demo-captcha" }), false);
  assert.equal(isValidDemoLogin({ ...DEMO_CREDENTIALS, captchaAnswer: "0000", captchaId: "demo-captcha" }), false);
  assert.match(adapter, /registrationOpen: false/);
  assert.match(adapter, /sessionStorage\.getItem\(demoAuthStorageKey\)/);
  assert.match(adapter, /Demo 不开放注册/);
});

test("Demo 版本直接继承主项目版本", async () => {
  const mainPackage = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  const demoPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const adapter = await readFile(new URL("../mock-api.js", import.meta.url), "utf8");
  assert.equal(await readMainVersion(), mainPackage.version);
  assert.equal(Object.hasOwn(demoPackage, "version"), false);
  assert.equal(versionModuleSource(mainPackage.version), `export const DEMO_VERSION = ${JSON.stringify(mainPackage.version)};\n`);
  assert.match(demoAssetVersion(adapter, mainPackage.version), new RegExp(`^${mainPackage.version.replaceAll(".", "\\.")}-[a-f0-9]{8}$`));
  assert.match(versionedDemoAdapterSource(adapter, mainPackage.version), new RegExp(`demo-version\\.js\\?v=${mainPackage.version.replaceAll(".", "\\.")}`));
  assert.match(adapter, /version: DEMO_VERSION/);
  assert.doesNotMatch(adapter, /0\.1\.0-demo/);
});
