import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Runtime } from "../../src/app.js";
import { createTestRuntime, seedChapter } from "../helpers.js";

describe("作品混合检索", () => {
  let runtime: Runtime | null = null;

  afterEach(() => {
    runtime?.close();
    runtime = null;
  });

  it("统一检索正文和全部知识类型并返回正文行号", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime, "序幕开启。\n\n潮汐棱镜在北港议会发光。\n仍在发光。");
    const workId = String(seeded.work.id);
    const chapterId = String(seeded.chapter.id);
    const firstCharacter = runtime.store.createCharacter(workId, {
      name: "林舟",
      profile: { secret: "潮汐棱镜的守护者" },
      firstChapterId: chapterId
    });
    const secondCharacter = runtime.store.createCharacter(workId, { name: "岑月", firstChapterId: chapterId });
    runtime.store.createSetting(workId, { title: "北港圣物", category: "道具", content: "潮汐棱镜用于导航。" });
    runtime.store.createRace(workId, { name: "潮汐族", description: "族群佩戴潮汐棱镜。" });
    runtime.store.createOrganization(workId, { name: "北港议会", description: "负责保管潮汐棱镜。" });
    const track = runtime.store.createTimelineTrack(workId, { name: "北港纪年", description: "以潮汐棱镜为纪年基准。" });
    runtime.store.createTimelineEvent(workId, {
      name: "棱镜点亮",
      trackId: String(track.id),
      description: "潮汐棱镜第一次发光。",
      chapterIds: [chapterId]
    });
    runtime.store.createRelationship(workId, {
      fromCharacterId: String(firstCharacter.id),
      toCharacterId: String(secondCharacter.id),
      category: "social",
      subtype: "盟友",
      keywords: ["潮汐棱镜"]
    });
    runtime.store.upsertChapterOutline(chapterId, { goal: "找到潮汐棱镜", conflict: "议会阻拦" });
    runtime.store.createForeshadow(workId, { title: "棱镜裂痕", description: "潮汐棱镜存在暗纹。" });
    const review = runtime.store.createReviewItem(workId, {
      itemType: "setting-conflict",
      title: "棱镜颜色冲突",
      description: "潮汐棱镜的颜色前后不一致。"
    });

    const response = await request(runtime.app)
      .get(`/api/works/${workId}/search`)
      .query({ q: "潮汐棱镜", limit: 100 })
      .expect(200);

    expect(new Set(response.body.data.map((item: { type: string }) => item.type))).toEqual(new Set([
      "chapter",
      "setting",
      "character",
      "race",
      "organization",
      "timeline-track",
      "timeline-event",
      "relationship",
      "chapter-outline",
      "foreshadow",
      "review"
    ]));
    expect(response.body.data.find((item: { type: string }) => item.type === "chapter")).toMatchObject({
      id: chapterId,
      startLine: 3,
      endLine: 4,
      matchKinds: expect.arrayContaining(["exact"])
    });
    await request(runtime.app).get(`/api/reviews/${review.id}`).expect(200).expect((reviewResponse) => {
      expect(reviewResponse.body.data).toMatchObject({ id: review.id, workId, title: "棱镜颜色冲突" });
    });
  });

  it("支持无空格拼音、类型筛选和增量更新", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime, "林舟抵达北港议会。\n\n港口安静。 ");
    const workId = String(seeded.work.id);
    const setting = runtime.store.createSetting(workId, {
      title: "北港制度",
      category: "规则",
      content: "北港议会遵循旧章程。"
    });

    const phonetic = await request(runtime.app)
      .get(`/api/works/${workId}/search`)
      .query({ q: "beigang", limit: 100 })
      .expect(200);
    expect(phonetic.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "chapter", matchKinds: expect.arrayContaining(["phonetic"]) }),
      expect.objectContaining({ type: "setting", id: setting.id, matchKinds: expect.arrayContaining(["phonetic"]) })
    ]));

    const filtered = await request(runtime.app)
      .get(`/api/works/${workId}/search`)
      .query({ q: "北港", type: "setting", limit: 1 })
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0]).toMatchObject({ type: "setting", id: setting.id });

    runtime.store.updateSetting(String(setting.id), { content: "新章程改用星港通行证。" });
    const updated = await request(runtime.app)
      .get(`/api/works/${workId}/search`)
      .query({ q: "星港通行证", type: "setting" })
      .expect(200);
    expect(updated.body.data).toEqual([expect.objectContaining({ id: setting.id, type: "setting" })]);
  });

  it("拒绝未知类型和越界数量", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime);
    const workId = String(seeded.work.id);
    await request(runtime.app).get(`/api/works/${workId}/search`).query({ q: "北港", type: "unknown" }).expect(400);
    await request(runtime.app).get(`/api/works/${workId}/search`).query({ q: "北港", limit: 101 }).expect(400);
  });
});
