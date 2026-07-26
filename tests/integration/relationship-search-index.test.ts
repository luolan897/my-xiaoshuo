import { afterEach, describe, expect, it } from "vitest";
import type { Runtime } from "../../src/app.js";
import { ftsPhrase, relationshipCharacterTokens, relationshipPinyinTokens } from "../../src/relationship-search.js";
import { createTestRuntime, seedChapter } from "../helpers.js";

describe("人物关系来源增量索引", () => {
  let runtime: Runtime | null = null;

  afterEach(() => {
    runtime?.close();
    runtime = null;
  });

  it("后台构建正文和设定索引并由并发请求共享同一次构建", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime, "摩斯拉从废墟中苏醒。\n\n无关段落。");
    const workId = String(seeded.work.id);
    const setting = runtime.store.createSetting(workId, {
      title: "泰坦记录",
      category: "人物",
      content: "摩斯拉负责守护生态。"
    });
    const ai = runtime.ai as unknown as { ensureRelationshipSearchIndex(workId: string): Promise<number> };
    const generations = await Promise.all(Array.from({ length: 10 }, () => ai.ensureRelationshipSearchIndex(workId)));
    expect(new Set(generations).size).toBe(1);

    const pinyinPhrase = ftsPhrase(relationshipPinyinTokens("魔斯拉"));
    expect(runtime.database.all(
      `SELECT DISTINCT paragraph.chapter_id FROM chapter_paragraph_pinyin_fts
       JOIN chapter_paragraph_search paragraph ON paragraph.id = chapter_paragraph_pinyin_fts.rowid
       WHERE chapter_paragraph_pinyin_fts MATCH ?`,
      pinyinPhrase
    )).toEqual([{ chapter_id: seeded.chapter.id }]);
    expect(runtime.database.all(
      `SELECT source.source_type, source.source_id FROM relationship_source_pinyin_fts
       JOIN relationship_source_search source ON source.id = relationship_source_pinyin_fts.rowid
       WHERE relationship_source_pinyin_fts MATCH ?`,
      pinyinPhrase
    )).toContainEqual({ source_type: "setting", source_id: setting.id });
    expect(runtime.database.all(
      `SELECT source.source_id FROM relationship_source_exact_fts
       JOIN relationship_source_search source ON source.id = relationship_source_exact_fts.rowid
       WHERE relationship_source_exact_fts MATCH ?`,
      ftsPhrase(relationshipCharacterTokens("摩斯拉"))
    )).toContainEqual({ source_id: setting.id });

    const before = Number(runtime.database.get(
      "SELECT generation FROM relationship_source_index_state WHERE work_id = ?",
      workId
    )?.generation ?? 0);
    runtime.store.updateSetting(String(setting.id), { content: "拉顿负责守护火山。" });
    const after = await ai.ensureRelationshipSearchIndex(workId);
    expect(after).toBe(before + 1);
    expect(runtime.database.all(
      `SELECT source.source_id FROM relationship_source_pinyin_fts
       JOIN relationship_source_search source ON source.id = relationship_source_pinyin_fts.rowid
       WHERE relationship_source_pinyin_fts MATCH ?`,
      pinyinPhrase
    )).not.toContainEqual({ source_id: setting.id });

    runtime.store.deleteSetting(String(setting.id));
    await ai.ensureRelationshipSearchIndex(workId);
    expect(runtime.database.get(
      "SELECT id FROM relationship_source_search WHERE source_type = 'setting' AND source_id = ?",
      setting.id as string
    )).toBeUndefined();
  });

  it("父种族更新会重建后代种族和成员的人物关系索引", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime, "无关正文。");
    const workId = String(seeded.work.id);
    const parent = runtime.store.createRace(workId, { name: "泰坦", settings: ["拥有星髓印记"] });
    const child = runtime.store.createRace(workId, { name: "守望泰坦", parentRaceId: String(parent.id) });
    const character = runtime.store.createCharacter(workId, { name: "魔斯拉", raceId: String(child.id) });
    const ai = runtime.ai as unknown as { ensureRelationshipSearchIndex(workId: string): Promise<number> };
    await ai.ensureRelationshipSearchIndex(workId);

    const matchingSourceIds = (): string[] => runtime!.database.all(
      `SELECT source.source_id FROM relationship_source_exact_fts
       JOIN relationship_source_search source ON source.id = relationship_source_exact_fts.rowid
       WHERE relationship_source_exact_fts MATCH ?`,
      ftsPhrase(relationshipCharacterTokens("星髓印记"))
    ).map((row) => String(row.source_id));
    expect(matchingSourceIds()).toEqual(expect.arrayContaining([String(parent.id), String(child.id), String(character.id)]));

    runtime.store.updateRace(String(parent.id), { settings: ["拥有生态感知"] });
    await ai.ensureRelationshipSearchIndex(workId);
    expect(matchingSourceIds()).not.toEqual(expect.arrayContaining([String(parent.id), String(child.id), String(character.id)]));
    expect(runtime.database.get("PRAGMA integrity_check")?.integrity_check).toBe("ok");
    expect(runtime.database.all("PRAGMA foreign_key_check")).toEqual([]);
  });

  it("分卷改名会重建引用卷标题的伏笔来源索引", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime, "无关正文。");
    const workId = String(seeded.work.id);
    runtime.store.updateVolume(String(seeded.volume.id), { title: "魔斯拉卷" });
    const foreshadow = runtime.store.createForeshadow(workId, {
      title: "远航线索",
      description: "记录一次普通远航。",
      occurrences: [{ chapterId: String(seeded.chapter.id), role: "setup", note: "首次出现" }]
    });
    const ai = runtime.ai as unknown as { ensureRelationshipSearchIndex(workId: string): Promise<number> };
    await ai.ensureRelationshipSearchIndex(workId);

    const matchingForeshadowIds = (): string[] => runtime!.database.all(
      `SELECT source.source_id FROM relationship_source_exact_fts
       JOIN relationship_source_search source ON source.id = relationship_source_exact_fts.rowid
       WHERE source.source_type = 'foreshadow' AND relationship_source_exact_fts MATCH ?`,
      ftsPhrase(relationshipCharacterTokens("魔斯拉"))
    ).map((row) => String(row.source_id));
    expect(matchingForeshadowIds()).toContain(String(foreshadow.id));

    runtime.store.updateVolume(String(seeded.volume.id), { title: "无关卷" });
    await ai.ensureRelationshipSearchIndex(workId);
    expect(matchingForeshadowIds()).not.toContain(String(foreshadow.id));
    expect(runtime.database.get("PRAGMA integrity_check")?.integrity_check).toBe("ok");
    expect(runtime.database.all("PRAGMA foreign_key_check")).toEqual([]);
  });
});
