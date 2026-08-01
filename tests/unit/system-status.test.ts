import { describe, expect, it } from "vitest";
import { systemStatusPresentation } from "../../src/public/system-status.js";

describe("顶部系统状态", () => {
  it("仅在健康检查成功时显示就绪", () => {
    expect(systemStatusPresentation({ status: "ready", version: "0.6.3" })).toEqual({
      label: "就绪",
      tone: "ok",
      title: "服务连接正常 · v0.6.3"
    });
    expect(systemStatusPresentation({ status: "checking" }).label).toBe("检测中");
  });

  it("区分服务异常和连接中断", () => {
    expect(systemStatusPresentation({ status: "degraded" })).toMatchObject({ label: "服务异常", tone: "error" });
    expect(systemStatusPresentation({ status: "offline" })).toMatchObject({ label: "连接中断", tone: "error" });
    expect(systemStatusPresentation({ status: "unknown" })).toMatchObject({ label: "检测中", tone: "pending" });
  });
});
