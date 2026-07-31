import { describe, expect, it } from "vitest";
import {
  buildAgentToolCallQuotaNotice,
  shouldRejectAgentToolCalls,
  withAgentToolCallQuotaNotice
} from "../../src/ai-tool-results.js";

describe("AI 工具调用配额提醒", () => {
  it("剩余超过 6 次时不注入提醒", () => {
    expect(buildAgentToolCallQuotaNotice(7)).toBeNull();
    expect(withAgentToolCallQuotaNotice({ ok: true }, 7)).toEqual({ ok: true });
  });

  it("剩余 2 到 6 次时注入 warning 并写明剩余次数", () => {
    for (const remaining of [6, 5, 4, 3, 2]) {
      const notice = buildAgentToolCallQuotaNotice(remaining);
      expect(notice).toMatchObject({
        level: "warning",
        remaining
      });
      expect(notice?.message).toContain(`当前剩余 ${remaining} 次`);
      expect(withAgentToolCallQuotaNotice({ ok: true, data: [] }, remaining)).toEqual({
        ok: true,
        data: [],
        toolCallQuotaNotice: notice
      });
    }
  });

  it("剩余 1 次时注入 critical 并告知没有可用次数", () => {
    const notice = buildAgentToolCallQuotaNotice(1);
    expect(notice).toMatchObject({
      level: "critical",
      remaining: 0
    });
    expect(notice?.message).toContain("现在没有可用的工具调用次数了");
    expect(notice?.message).toContain("直接总结作答");
    expect(withAgentToolCallQuotaNotice({ ok: true }, 1).toolCallQuotaNotice).toEqual(notice);
  });

  it("在倒数第一次配额之后再请求工具时拒绝，最后一档保留给硬错误", () => {
    expect(shouldRejectAgentToolCalls(10, 1, 12)).toBe(false);
    expect(shouldRejectAgentToolCalls(11, 1, 12)).toBe(true);
    expect(shouldRejectAgentToolCalls(11, 2, 12)).toBe(true);
    expect(shouldRejectAgentToolCalls(12, 1, 12)).toBe(true);
    expect(shouldRejectAgentToolCalls(0, 12, 12)).toBe(false);
    expect(shouldRejectAgentToolCalls(0, 13, 12)).toBe(true);
  });

  it("上限为 1 时不额外保留空档，允许唯一一次工具调用", () => {
    expect(shouldRejectAgentToolCalls(0, 1, 1)).toBe(false);
    expect(shouldRejectAgentToolCalls(1, 1, 1)).toBe(true);
  });
});
