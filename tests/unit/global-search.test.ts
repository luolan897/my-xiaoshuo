import { describe, expect, it } from "vitest";
import { resolveGlobalSearchTarget } from "../../src/public/global-search.js";

describe("全局搜索结果导航", () => {
  it("将章节结果直接定位到正文阅读页", () => {
    expect(resolveGlobalSearchTarget({ type: "chapter", id: "chapter / 1" })).toEqual({
      kind: "chapter",
      type: "chapter",
      id: "chapter / 1",
      module: "editor"
    });
  });

  it.each([
    ["setting", "settings", "setting", "/api/settings/setting%20%2F%201"],
    ["character", "characters", "character", "/api/characters/character%20%2F%201"],
    ["race", "races", "race", "/api/races/race%20%2F%201"],
    ["organization", "organizations", "organization", "/api/organizations/organization%20%2F%201"]
  ])("将 %s 结果定位到对应实体详情", (type, module, entity, apiPath) => {
    expect(resolveGlobalSearchTarget({ type, id: `${type} / 1` })).toEqual({
      kind: "entity",
      type,
      id: `${type} / 1`,
      module,
      entity,
      apiPath
    });
  });

  it("拒绝缺少标识或未知类型的结果", () => {
    expect(resolveGlobalSearchTarget({ type: "character" })).toBeNull();
    expect(resolveGlobalSearchTarget({ type: "timeline", id: "timeline-1" })).toBeNull();
  });
});
