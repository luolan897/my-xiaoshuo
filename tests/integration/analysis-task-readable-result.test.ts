import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import type { Runtime } from "../../src/app.js";
import { createTestRuntime, seedChapter } from "../helpers.js";

describe("AI 分析任务可读结果", () => {
  let runtime: Runtime | undefined;

  afterEach(() => runtime?.close());

  it("为全部分析类型说明分析结论和实际写入位置", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime, "八岐大蛇与须佐之男在高天原决裂，此后长期敌对。");
    const workId = String(seeded.work.id);
    const chapterId = String(seeded.chapter.id);
    const orochi = runtime.store.createCharacter(workId, {
      name: "八岐大蛇",
      aliases: ["大蛇"],
      attributes: { identity: "古代蛇神" },
      profile: { summary: "盘踞于出云的强大神祇。" },
      firstChapterId: chapterId
    });
    const susanoo = runtime.store.createCharacter(workId, { name: "须佐之男", firstChapterId: chapterId });
    const timeline = runtime.store.createTimelineEvent(workId, {
      name: "高天原决裂",
      description: "八岐大蛇与须佐之男公开决裂。",
      eventType: "conflict",
      timeLabel: "神代",
      chapterIds: [chapterId],
      participantIds: [String(orochi.id), String(susanoo.id)],
      location: "高天原",
      impactScope: "双方关系"
    }, "analysis", "readable-result-test");
    const setting = runtime.store.createSetting(workId, {
      title: "高天原禁令",
      category: "世界规则",
      content: "神代诸神不得私自干预人间。",
      status: "candidate"
    }, "analysis", "readable-result-test");
    const duplicateReview = runtime.store.createReviewItem(workId, {
      itemType: "character-duplicate",
      severity: "high",
      title: "八岐大蛇与大蛇疑似重复",
      description: "别名与出场证据高度重合。",
      suggestion: "请确认是否合并角色档案。"
    });
    const consistencyReview = runtime.store.createReviewItem(workId, {
      itemType: "setting-conflict",
      severity: "medium",
      title: "禁令与行动冲突",
      description: "角色行为可能违反高天原禁令。",
      suggestion: "补充禁令例外条件。"
    });
    const relationship = runtime.store.createRelationship(workId, {
      fromCharacterId: String(orochi.id),
      toCharacterId: String(susanoo.id),
      category: "conflict",
      subtype: "宿敌",
      keywords: ["长期敌对", "神代冲突"],
      currentStatus: "active",
      confidence: 0.94,
      evidence: [{ chapterId, chapterTitle: seeded.chapter.title, quote: "此后长期敌对", supports: "明确说明关系持续" }]
    }, "analysis", "readable-result-test");

    const createCompletedTask = (taskType: string, result: Record<string, unknown>, scope: Record<string, unknown> = { type: "book" }): string => {
      const task = runtime!.store.createTask(workId, { taskType, scope });
      runtime!.store.updateTask(String(task.id), { status: "completed", progress: 100, result });
      return String(task.id);
    };
    const cases = [
      {
        taskId: createCompletedTask("chapter-analysis", {
          insightId: "insight_readable",
          chapterId,
          chapterVersion: seeded.chapter.versionNo,
          summary: "本章确立了八岐大蛇与须佐之男的敌对关系。",
          events: [{ title: "双方决裂", description: "两人在高天原公开决裂。" }],
          characters: [{ name: "八岐大蛇", identity: "冲突发起者" }],
          settings: [{ title: "高天原", description: "诸神活动区域" }],
          evidence: [{ conclusion: "关系转为敌对", quote: "此后长期敌对" }],
          uncertainties: []
        }, { type: "chapter", chapterId }),
        table: "chapter_insights",
        sectionTitle: "情节事件",
        itemTitle: "双方决裂"
      },
      {
        taskId: createCompletedTask("character-extraction", {
          characterIds: [orochi.id],
          candidateCount: 1,
          coveredChapterCount: 1,
          skipped: [],
          verification: { pairCount: 0 }
        }),
        table: "characters",
        sectionTitle: "保存的角色",
        itemTitle: "八岐大蛇"
      },
      {
        taskId: createCompletedTask("character-summary", {
          characterIds: [orochi.id],
          candidateCount: 1,
          coveredChapterCount: 1,
          skipped: [],
          verification: { pairCount: 0 }
        }),
        table: "characters",
        sectionTitle: "保存的角色",
        itemTitle: "八岐大蛇"
      },
      {
        taskId: createCompletedTask("character-identity-audit", {
          characterCount: 2,
          candidateCount: 1,
          reviewIds: [duplicateReview.id],
          skipped: [],
          toolCallCount: 3
        }),
        table: "review_items",
        sectionTitle: "角色查重建议",
        itemTitle: "八岐大蛇与大蛇疑似重复"
      },
      {
        taskId: createCompletedTask("timeline-analysis", { eventIds: [timeline.id], candidateCount: 1 }),
        table: "timeline_events",
        sectionTitle: "事件候选",
        itemTitle: "高天原决裂"
      },
      {
        taskId: createCompletedTask("relationship-analysis", {
          relationshipIds: [relationship.id],
          createdCount: 1,
          updatedCount: 0,
          unchangedCount: 0,
          analysisTarget: { mode: "targeted-characters", characterNames: ["八岐大蛇"], coveredChapterCount: 1 },
          skipped: []
        }, { type: "book", characterIds: [String(orochi.id)] }),
        table: "relationships",
        sectionTitle: "分析出的关系",
        itemTitle: "八岐大蛇"
      },
      {
        taskId: createCompletedTask("worldview-analysis", {
          summary: "高天原以禁令维持神与人间的边界。",
          dimensions: [{ category: "规则与限制", title: "神界干预边界", conclusion: "诸神不得私自干预人间。", confidence: 0.88 }],
          conflicts: [],
          uncertainties: [],
          dimensionCount: 1,
          coveredChapterCount: 1
        }),
        table: "analysis_tasks",
        sectionTitle: "世界观结论",
        itemTitle: "神界干预边界"
      },
      {
        taskId: createCompletedTask("setting-extraction", {
          settingIds: [setting.id],
          rawCandidateCount: 1,
          createdCount: 1,
          updatedCount: 0,
          coveredChapterCount: 1,
          skipped: []
        }),
        table: "settings",
        sectionTitle: "写入的设定",
        itemTitle: "高天原禁令"
      },
      {
        taskId: createCompletedTask("consistency-check", { reviewIds: [consistencyReview.id], issueCount: 1 }),
        table: "review_items",
        sectionTitle: "一致性问题",
        itemTitle: "禁令与行动冲突"
      },
      {
        taskId: createCompletedTask("book-analysis", { content: "全书主线围绕神代秩序破裂展开。" }),
        table: "analysis_tasks",
        sectionTitle: undefined,
        itemTitle: undefined
      },
      {
        taskId: createCompletedTask("structure", { content: "故事以决裂为转折点，进入冲突阶段。" }),
        table: "analysis_tasks",
        sectionTitle: undefined,
        itemTitle: undefined
      },
      {
        taskId: createCompletedTask("report-update", { content: "分析报告已根据最新章节更新。" }),
        table: "analysis_tasks",
        sectionTitle: undefined,
        itemTitle: undefined
      }
    ];

    for (const item of cases) {
      const response = await request(runtime.app).get(`/api/tasks/${item.taskId}/detail`).expect(200);
      expect(response.body.data).not.toHaveProperty("result");
      expect(response.body.data.hasResult).toBe(true);
      expect(response.body.data.resultSummary.analysisContent).toContain("范围：");
      expect(response.body.data.resultSummary.summary).toEqual(expect.any(String));
      expect(response.body.data.resultSummary.storageTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({ table: item.table })
      ]));
      expect(response.body.data.resultSummary.storageTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({ table: "analysis_tasks", note: expect.stringContaining("result_json") })
      ]));
      if (item.sectionTitle && item.itemTitle) {
        const section = response.body.data.resultSummary.sections.find((candidate: { title: string }) => candidate.title === item.sectionTitle);
        expect(section).toBeTruthy();
        expect(JSON.stringify(section.items)).toContain(item.itemTitle);
        if (item.table === "relationships") {
          expect(JSON.stringify(section.items)).toContain("持续中");
          expect(JSON.stringify(section.items)).toContain("待确认");
        }
      }
    }
  });

  it("详情接口不传输原始结果，完整 JSON 接口按需返回且不截断", async () => {
    runtime = createTestRuntime();
    const seeded = await seedChapter(runtime);
    const workId = String(seeded.work.id);
    const longValue = "完整结果内容".repeat(3_000);
    const originalResult = { content: "全书综合分析结论", longValue, nested: { retained: true } };
    const task = runtime.store.createTask(workId, { taskType: "book-analysis", scope: { type: "book" } });
    runtime.store.updateTask(String(task.id), { status: "completed", progress: 100, result: originalResult });

    const detail = await request(runtime.app).get(`/api/tasks/${task.id}/detail`).expect(200);
    expect(detail.body.data).not.toHaveProperty("result");
    expect(JSON.stringify(detail.body.data)).not.toContain(longValue);

    const fullResult = await request(runtime.app).get(`/api/tasks/${task.id}/result`).expect(200);
    expect(fullResult.body.data).toEqual({ taskId: task.id, result: originalResult });
    expect(fullResult.body.data.result.longValue).toHaveLength(longValue.length);
  });
});
