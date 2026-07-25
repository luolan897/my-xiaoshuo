import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("角色别名标签", () => {
  it("在角色卡片的别名胶囊前展示字段名", async () => {
    const publicPath = join(process.cwd(), "src/public");
    const [application, styles] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8")
    ]);

    expect(application).toContain('class="character-aliases"><b>别名</b>');
    expect(styles).toContain(".character-aliases b { margin-right: 2px;");
  });
});
