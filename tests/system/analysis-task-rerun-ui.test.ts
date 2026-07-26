import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI 分析任务重跑界面", () => {
  it("在终态任务列表和详情中提供按原配置重跑入口", async () => {
    const publicPath = join(process.cwd(), "src", "public");
    const [application, styles] = await Promise.all([
      readFile(join(publicPath, "app.js"), "utf8"),
      readFile(join(publicPath, "styles.css"), "utf8")
    ]);

    expect(application).toContain("function canRerunAnalysisTask(task)");
    expect(application).toContain('"review", "completed", "partial", "expired", "cancelled"');
    expect(application).toContain('data-rerun-task="${esc(item.id)}"');
    expect(application).toContain('data-rerun-task-detail="${esc(task.id)}"');
    expect(application).toContain("async function rerunAnalysisTask(taskId, button");
    expect(application).toContain("/rerun`, { method: \"POST\", body: {} }");
    expect(application).toContain("已按原配置创建新任务");
    expect(application).toContain("新任务会重新读取当前正文、设定和人物资料，旧任务记录保持不变。");
    expect(styles).toContain(".task-detail-actions {");
  });
});
