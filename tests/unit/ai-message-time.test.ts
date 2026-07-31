import { describe, expect, it } from "vitest";
// @ts-expect-error 浏览器端模块没有单独的类型声明，测试仅调用纯函数导出。
import { formatAiMessageTime } from "../../src/public/ai-message-time.js";

describe("AI 消息时间", () => {
  it("每条消息都显示月日和时间且不显示年份", () => {
    const createdAt = new Date(2026, 7, 1, 5, 50);

    expect(formatAiMessageTime(createdAt)).toBe("08-01 05:50");
  });

  it("无效时间不显示内容", () => {
    expect(formatAiMessageTime("not-a-date")).toBe("");
  });
});
