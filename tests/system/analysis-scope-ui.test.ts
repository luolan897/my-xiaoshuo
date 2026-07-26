import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI 分析范围交互", () => {
  it("选择全书时禁用章节选项，并在切回指定章节后恢复", async () => {
    const publicPath = join(process.cwd(), "src/public");
    const [application, styles, page] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8"),
      readFile(join(publicPath, "index.html"), "utf8")
    ]);

    expect(application).toContain('allSettingsOption.textContent = "全书 + 设定集"');
    expect(application).toContain('settingsOnlyOption.textContent = "仅设定集"');
    expect(application).toContain('const settingsOnly = taskType === "relationship-analysis" && scopeType === "settings"');
    expect(application).toContain('{ type: "settings"');
    expect(application).toContain('const enabled = taskTypeSelect.value === "relationship-analysis"');
    expect(application).toContain('const disabled = scopeTypeSelect.value !== "chapter"');
    expect(application).toContain("chapterSelect.disabled = disabled");
    expect(application).toContain('chapterFieldElement.classList.toggle("is-disabled", disabled)');
    expect(application).toContain('chapterFieldElement.setAttribute("aria-disabled", String(disabled))');
    expect(application).toContain('scopeTypeSelect.addEventListener("change", syncChapterField)');
    expect(application).toContain('name="additionalPrompt" maxlength="10000"');
    expect(application).toContain('class="relationship-character-trigger"');
    expect(application).toContain('data-relationship-character-search');
    expect(application).toContain('data-relationship-character-clear');
    expect(application).toContain('input[name="characterIds"]');
    expect(application).toContain('class="relationship-analysis-helper"');
    expect(application).toContain('class="relationship-overwrite-card hidden"');
    expect(application).toContain('name="replaceExistingRelationships" type="checkbox" disabled');
    expect(application).toContain('relationshipOptions.classList.toggle("hidden", !enabled)');
    expect(application).toContain("relationshipCharacterInputs.some((input) => input.checked)");
    expect(application).toContain("replaceRelationships.disabled = !hasSelectedCharacters");
    expect(application).toContain('relationshipOverwriteCard.classList.toggle("hidden", !hasSelectedCharacters)');
    expect(application).toContain('relationshipCharacterTrigger.addEventListener("click"');
    expect(application).toContain('relationshipCharacterSearch.addEventListener("input", filterRelationshipCharacters)');
    expect(application).toContain('setRelationshipCharacterBubbleOpen(false)');
    expect(application).toContain("includeAllSettings: true");
    expect(application).toContain('form.setAttribute("aria-busy", "true")');
    expect(application).toContain("if (submitting)");
    expect(application).toContain("control.disabled = true");
    expect(application).toContain("dialog.oncancel");
    expect(application).toContain('pendingLabel: "创建中…"');
    expect(application).toContain('pendingMessage: "正在创建分析任务，请稍候"');
    expect(application).toContain('errorPrefix: "任务创建失败："');
    expect(application).toContain('void renderTasks(1).catch((error) => toast(`任务已创建，但列表刷新失败：${error.message}`, "error"))');
    expect(page).toContain('id="dialog-submit-status"');
    expect(page).toContain('class="dialog-submit-progress" role="progressbar"');
    expect(styles).toContain(".task-chapter-field.is-disabled { opacity: .48; }");
    expect(styles).toContain(".task-chapter-field select:disabled { cursor: not-allowed; }");
    expect(styles).toContain(".relationship-character-bubble {");
    expect(styles).toContain(".relationship-character-options {");
    expect(styles).toContain(".relationship-analysis-helper {");
    expect(styles).toContain(".relationship-overwrite-card {");
    expect(styles).toContain(".dialog-submit-status {");
    expect(styles).toContain("@keyframes dialog-submit-progress");
  });
});
