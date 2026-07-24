import { describe, expect, it } from "vitest";
import {
  chapterVersionSourceLabel,
  characterVisibilityLabel,
  foreshadowStatusLabel,
  levelLabel,
  outlineStatusLabel,
  providerConnectionLabel,
  providerStatusLabel,
  relationshipCategoryLabel,
  relationshipConfirmationLabel,
  reviewItemTypeLabel,
  reviewStatusLabel,
  settingStatusLabel,
  taskScopeLabel,
  timelineStatusLabel
} from "../../src/public/display-labels.js";

describe("前端枚举中文标签", () => {
  it("映射各资料模块的数据库枚举", () => {
    expect(settingStatusLabel("confirmed")).toBe("已确认");
    expect(characterVisibilityLabel("author")).toBe("仅作者");
    expect(timelineStatusLabel("candidate")).toBe("候选");
    expect(levelLabel("high")).toBe("高");
    expect(foreshadowStatusLabel("planted")).toBe("已埋设");
    expect(outlineStatusLabel("ready")).toBe("可执行");
    expect(relationshipCategoryLabel("social")).toBe("社交");
    expect(relationshipConfirmationLabel("pending")).toBe("待确认");
  });

  it("映射审核、任务、供应商和版本枚举", () => {
    expect(reviewItemTypeLabel("timeline-conflict")).toBe("时间线冲突");
    expect(reviewStatusLabel("fixed")).toBe("已修复");
    expect(taskScopeLabel("book")).toBe("全书");
    expect(providerStatusLabel("enabled")).toBe("已启用");
    expect(providerConnectionLabel("success")).toBe("连接正常");
    expect(chapterVersionSourceLabel("ai-suggestion")).toBe("AI 建议");
  });

  it("保留中文自定义值并隐藏未知英文枚举", () => {
    expect(reviewItemTypeLabel("自定义问题")).toBe("自定义问题");
    expect(reviewItemTypeLabel("unknown-issue")).toBe("其他审核问题");
    expect(settingStatusLabel("unknown-status")).toBe("未知状态");
  });
});
