import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("人物关系分析变更预览界面", () => {
  it("默认开启写入前预览并提供应用与放弃操作", async () => {
    const publicPath = join(process.cwd(), "src", "public");
    const [application, styles] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8")
    ]);

    expect(application).toContain('name="previewRelationshipChanges" type="checkbox" checked');
    expect(application).toContain("分析完成后先预览关系变更");
    expect(application).toContain("确认应用前不会修改人物关系库");
    expect(application).toContain("function renderRelationshipChangePreview(task, result)");
    expect(application).toContain('data-apply-relationship-changes="${esc(task.id)}"');
    expect(application).toContain('data-discard-relationship-changes="${esc(task.id)}"');
    expect(application).toContain("/relationship-changes/${action}");
    expect(application).toContain("若资料已被他人修改，系统会阻止过期预览覆盖新版本");
    expect(styles).toContain(".relationship-change-preview.is-pending");
    expect(styles).toContain(".relationship-change-preview-warning");
    expect(styles).toContain(".relationship-change-preview-actions");
  });
});
