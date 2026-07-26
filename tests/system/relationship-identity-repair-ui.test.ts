import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("人物关系身份修复向导", () => {
  it("从结构化来源超限失败进入身份资料修复", async () => {
    const publicPath = join(process.cwd(), "src/public");
    const [application, styles] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8")
    ]);

    expect(application).toContain("RELATIONSHIP_MATCH_CANDIDATES_EXCEEDED");
    expect(application).toContain("relationshipIdentityRepairFailure");
    expect(application).toContain("修复人物身份资料");
    expect(application).toContain("保存后，别名命中会转为精确匹配");
    expect(application).toContain("修复人物关系来源匹配");
    expect(application).toContain("expectedVersionNo: character.versionNo");
    expect(application).toContain("data-open-identity-character-profile");
    expect(styles).toContain(".relationship-identity-repair-entry {");
    expect(styles).toContain(".relationship-identity-repair-summary {");
    expect(styles).toContain(".relationship-identity-anchor-list {");
  });
});
