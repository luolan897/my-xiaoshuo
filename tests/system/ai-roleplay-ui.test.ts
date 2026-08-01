import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI 角色扮演界面", () => {
  it("允许为当前对话选择角色卡并展示受限记忆模式", async () => {
    const publicPath = join(process.cwd(), "src", "public");
    const [application, page, styles] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "index.html"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8")
    ]);

    expect(page).toContain('id="ai-roleplay-character"');
    expect(page).toContain("角色扮演：关闭");
    expect(application).toContain("/roleplay`");
    expect(application).toContain("角色扮演模式只支持问答");
    expect(application).toContain("角色扮演模式只使用角色自身的记忆");
    expect(application).toContain("Agent 只能查询与该角色自身有关的记忆");
    expect(application).toContain("recall_self: \"回忆自身\"");
    expect(styles).toContain(".prompt-options .ai-roleplay-character");
    expect(styles).toContain(".ai-panel.is-roleplaying .ai-roleplay-character");
  });
});
