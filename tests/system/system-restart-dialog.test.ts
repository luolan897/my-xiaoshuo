import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRuntime, type Runtime } from "../../src/app.js";

describe("系统重启登录提示", () => {
  let runtime: Runtime;

  beforeAll(() => {
    runtime = createRuntime({
      databasePath: ":memory:",
      masterSecret: "system-restart-dialog-test-secret",
      disableUserAuth: true,
      serveUi: true
    });
  });

  afterAll(() => runtime.close());

  it("公开每次运行唯一的启动标识", async () => {
    const secondRuntime = createRuntime({
      databasePath: ":memory:",
      masterSecret: "system-restart-dialog-second-test-secret",
      disableUserAuth: true,
      serveUi: false
    });
    try {
      const first = await request(runtime.app).get("/api/health").expect(200);
      const session = await request(runtime.app).get("/api/auth/session").expect(200);
      const second = await request(secondRuntime.app).get("/api/health").expect(200);
      expect(first.body.data.bootId).toMatch(/^[0-9a-f-]{36}$/u);
      expect(session.body.data.bootId).toBe(first.body.data.bootId);
      expect(second.body.data.bootId).toMatch(/^[0-9a-f-]{36}$/u);
      expect(second.body.data.bootId).not.toBe(first.body.data.bootId);
    } finally {
      secondRuntime.close();
    }
  });

  it("提供不可关闭且直接返回登录页的重启弹窗", async () => {
    const page = await request(runtime.app).get("/").expect(200);
    const application = await request(runtime.app).get("/app.js").expect(200);
    const styles = await request(runtime.app).get("/styles.css").expect(200);

    expect(page.text).toContain('id="system-restart-dialog" class="dialog system-restart-dialog"');
    expect(page.text).toContain('id="system-restart-dialog-title" tabindex="-1">系统已重启或升级</h2>');
    expect(page.text).toContain('id="system-restart-confirm" class="primary-button" type="button">我知道了</button>');
    expect(page.text).not.toContain("system-restart-discard-confirmation");
    expect(page.text).not.toContain("放弃未保存修改");
    expect(page.text).not.toContain('aria-label="关闭系统重启提示"');
    expect(application.text).toContain('$("#system-restart-dialog").addEventListener("cancel", (event) => {');
    expect(application.text).toContain("function hasUnsavedEditorChanges()");
    expect(application.text).toContain("function redirectToLoginAfterSystemRestart()");
    expect(application.text).toContain('$("#system-restart-confirm").addEventListener("click", redirectToLoginAfterSystemRestart);');
    expect(application.text).not.toContain("hideSystemRestartDiscardConfirmation");
    expect(application.text).not.toContain("system-restart-discard-confirmation");
    expect(application.text).toContain('document.documentElement.classList.add("login-route");');
    expect(application.text).toContain('window.history.replaceState(null, "", serializePageRoute({ view: "login" }));');
    expect(application.text).toContain("toastRegion.replaceChildren();");
    expect(application.text).toContain('$("#system-restart-dialog").close();');
    expect(application.text).toContain("showAuth(false);");
    expect(application.text).toContain("if (hasUnsavedEditorChanges()) event.preventDefault();");
    expect(application.text).not.toContain("systemRestartReloading");
    expect(application.text).toContain('document.addEventListener("visibilitychange", () => {');
    expect(styles.text).toContain(".system-restart-dialog { width: min(500px, 92vw); }");
    expect(styles.text).not.toContain(".system-restart-discard-confirmation");
  });
});
