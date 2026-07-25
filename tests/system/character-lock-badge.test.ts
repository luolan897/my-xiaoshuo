import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("角色锁定字段状态", () => {
  it("在姓名区域使用紧凑徽标，避免锁定状态占用独立列表列", async () => {
    const publicPath = join(process.cwd(), "src/public");
    const [application, styles] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8")
    ]);

    expect(application).toContain('class="character-lock-badge"');
    expect(application).toContain('aria-label="${item.lockedFields.length} 个锁定字段"');
    expect(application).toContain('title="锁定字段：${esc(item.lockedFields.join("、"))}"');
    expect(application).toContain('class="record-card module-row character-row character-card preview-record-card"');
    expect(application).not.toContain('<small>锁定 ${item.lockedFields.length} 项</small>');
    expect(styles).toContain(".character-row { grid-template-columns: minmax(140px, .28fr) minmax(0, 1fr) auto; }");
    expect(styles).toContain(".character-card-heading { display: flex;");
    expect(styles).toContain(".character-lock-badge { display: inline-flex;");
  });
});
