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
    expect(page).toContain('id="ai-chat-options" class="ai-chat-options" aria-label="问答设置"');
    expect(page).toContain("不使用角色扮演");
    expect(page.indexOf('id="ai-task"')).toBeLessThan(page.indexOf('id="ai-chat-options"'));
    expect(application).toContain("/roleplay`");
    expect(application).toContain("角色扮演模式只支持问答");
    expect(application).toContain("角色扮演模式只使用角色自身的记忆");
    expect(application).toContain("Agent 只能查询与该角色自身有关的记忆");
    expect(application).toContain("recall_self: \"回忆自身\"");
    expect(application).toContain("function syncAiChatOptionsVisibility()");
    expect(styles).toContain(".ai-chat-options { display: grid; grid-column: 1 / -1;");
    expect(styles).toContain(".ai-chat-options.hidden { display: none; }");
    expect(styles).toContain(".ai-panel.is-roleplaying .ai-roleplay-character");
  });
});
