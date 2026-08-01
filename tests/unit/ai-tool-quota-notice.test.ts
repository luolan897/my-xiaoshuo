import { describe, expect, it } from "vitest";
import {
  agentToolCallSoftWarningThreshold,
  buildAgentToolCallQuotaNotice,
  shouldRejectAgentToolCalls,
  withAgentToolCallQuotaNotice
} from "../../src/ai-tool-results.js";

describe("AI 工具调用配额提醒", () => {
  it("按上限的 20% + 1 计算软提醒阈值，并保证下限为 3", () => {
    expect(agentToolCallSoftWarningThreshold(12)).toBe(3);
    expect(agentToolCallSoftWarningThreshold(5)).toBe(3);
    expect(agentToolCallSoftWarningThreshold(48)).toBe(10);
    expect(agentToolCallSoftWarningThreshold(20)).toBe(5);
  });

  it("默认上限 12 时仅在剩余不超过 3 次时注入提醒字符串", () => {
    expect(buildAgentToolCallQuotaNotice(4, 12)).toBeNull();
    expect(withAgentToolCallQuotaNotice({ ok: true }, 4, 12)).toEqual({ ok: true });
    for (const remaining of [3, 2]) {
      const notice = buildAgentToolCallQuotaNotice(remaining, 12);
      expect(notice).toContain(`当前剩余 ${remaining} 次`);
      expect(withAgentToolCallQuotaNotice({ ok: true, data: [] }, remaining, 12)).toEqual({
        ok: true,
        data: [],
        toolCallQuotaNotice: notice
      });
    }
  });

  it("较大上限时按比例提前注入提醒字符串", () => {
    expect(buildAgentToolCallQuotaNotice(11, 48)).toBeNull();
    const notice = buildAgentToolCallQuotaNotice(10, 48);
    expect(notice).toContain("当前剩余 10 次");
    expect(withAgentToolCallQuotaNotice({ ok: true }, 10, 48).toolCallQuotaNotice).toBe(notice);
  });

  it("剩余 1 次时注入 critical 文案并告知没有可用次数", () => {
    const notice = buildAgentToolCallQuotaNotice(1, 12);
    expect(notice).toContain("现在没有可用的工具调用次数了");
    expect(notice).toContain("直接总结作答");
    expect(withAgentToolCallQuotaNotice({ ok: true }, 1, 12).toolCallQuotaNotice).toBe(notice);
  });

  it("在倒数第一次配额之后再请求工具时拒绝，最后一档保留给硬错误", () => {
    expect(shouldRejectAgentToolCalls(10, 1, 12)).toBe(false);
    expect(shouldRejectAgentToolCalls(11, 1, 12)).toBe(true);
    expect(shouldRejectAgentToolCalls(11, 2, 12)).toBe(true);
    expect(shouldRejectAgentToolCalls(12, 1, 12)).toBe(true);
    expect(shouldRejectAgentToolCalls(0, 12, 12)).toBe(false);
    expect(shouldRejectAgentToolCalls(0, 13, 12)).toBe(true);
  });

  it("最低上限 5 时仍保留最后一档硬拒绝", () => {
    expect(shouldRejectAgentToolCalls(3, 1, 5)).toBe(false);
    expect(shouldRejectAgentToolCalls(4, 1, 5)).toBe(true);
  });
});
