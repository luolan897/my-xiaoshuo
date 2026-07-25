import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { works } from "../data.js";

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

test("静态入口包含关键界面与可访问名称", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /静态体验模式/);
  assert.match(html, /人物关系/);
  assert.match(html, /AI 分析/);
  assert.match(html, /aria-label="全文搜索"/);
  assert.doesNotMatch(html, /<script[^>]+https?:\/\//);
});
