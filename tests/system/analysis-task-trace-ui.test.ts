import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI 分析全流程追踪界面", () => {
  it("在任务详情中按调用直接加载完整 Prompt、Agent 轮次和工具结果", async () => {
    const publicPath = join(process.cwd(), "src", "public");
    const [application, styles] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8")
    ]);

    expect(application).toContain("Promise.all([");
    expect(application).toContain('apiPage(`/api/works/${state.work.id}/tasks`, page, pageSize)');
    expect(application).toContain('const pageSize = pageSizeFor("analysisTasks")');
    expect(application).not.toContain('apiAllPages(`/api/works/${state.work.id}/tasks`');
    expect(application).toContain('aria-label="AI 分析任务分页"');
    expect(application).toContain('data-task-page="${taskPage.page - 1}"');
    expect(application).toContain("taskPage.stats?.pendingCount");
    expect(application).toContain("`/api/tasks/${taskId}/trace`");
    expect(application).toContain("/trace/calls/${callId}");
    expect(application).toContain('data-load-task-trace-call="full"');
    expect(application).not.toContain('data-load-task-trace-call="preview"');
    expect(application).toContain("function renderTaskTraceVisualization(trace");
    expect(application).toContain("function renderTaskTraceRound(round)");
    expect(application).not.toContain("function renderTaskTraceRoundSummary(round)");
    expect(application).toContain("function renderTaskTraceMessages(messages)");
    expect(application).toContain("function bindTaskTraceCallActions(container)");
    expect(application).toContain('error.code === "WORK_MODULE_READ_DENIED"');
    expect(application).toContain("完整上下文受权限保护");
    expect(application).toContain("完整全流程上下文");
    expect(application).toContain("本轮发出的完整 Prompt");
    expect(application).toContain("工具执行结果");
    expect(application).toContain("调用内容尚未加载");
    expect(application).toContain("加载完整内容");
    expect(application).toContain('button.textContent = "正在加载中"');
    expect(application).toContain("task-trace-call-sources");
    expect(application).not.toContain("全部消息合计最多传输");
    expect(application).toContain("options.trace");
    expect(styles).toContain(".trace-dialog { width: min(1180px, 94vw);");
    expect(styles).toContain(".task-trace-metrics {");
    expect(styles).toContain(".task-trace-round {");
    expect(styles).toContain(".task-trace-load-state {");
    expect(styles).toContain(".task-trace-call > summary .task-trace-call-sources {");
    expect(styles).toContain(".task-trace-call.is-failed .task-trace-status {");
    expect(styles).toContain("background: color-mix(in srgb, var(--accent) 14%, var(--surface));");
    expect(styles).toContain(".task-trace-message.is-system");
    expect(styles).toContain(".task-trace-tool-grid {");
  });
});
