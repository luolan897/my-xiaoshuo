import { describe, expect, it } from "vitest";
import { resolveCacheHitPercent } from "../../src/ai.js";

describe("AI 输入缓存命中率", () => {
  it("解析 OpenAI 兼容格式", () => {
    expect(resolveCacheHitPercent({
      prompt_tokens: 800,
      prompt_tokens_details: { cached_tokens: 600 }
    })).toBe(75);
  });

  it("解析命中与未命中 token 格式", () => {
    expect(resolveCacheHitPercent({
      prompt_cache_hit_tokens: 200,
      prompt_cache_miss_tokens: 100
    })).toBe(66.7);
  });

  it("缺少完整缓存统计时不返回命中率", () => {
    expect(resolveCacheHitPercent({ prompt_tokens: 800 })).toBeUndefined();
    expect(resolveCacheHitPercent({ prompt_tokens_details: { cached_tokens: 600 } })).toBeUndefined();
  });
});
