import { describe, expect, it } from "vitest";
// @ts-expect-error 浏览器端模块没有单独的类型声明，测试仅调用纯函数导出。
import { formatAiToolCallResult } from "../../src/public/ai-tool-call.js";

describe("AI 工具调用详情", () => {
  it("统计格式化返回值的字符数量", () => {
    const details = formatAiToolCallResult({ keyword: "爱", matches: ["第一段", "second"] });

    expect(details.text).toBe(JSON.stringify({ keyword: "爱", matches: ["第一段", "second"] }, null, 2));
    expect(details.characterCount).toBe(64);
  });

  it("缺少返回值时按空对象显示和计数", () => {
    expect(formatAiToolCallResult(undefined)).toEqual({ text: "{}", characterCount: 2 });
  });
});
