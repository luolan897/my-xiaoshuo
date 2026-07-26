import { describe, expect, it } from "vitest";
import {
  RelationshipApproximateMatchLimitError,
  damerauLevenshteinDistance,
  findApproximateNameMatches,
  findApproximateNameMatchesChunked,
  relationshipCharacterTokens,
  relationshipPinyinSyllables,
  relationshipPinyinTokens
} from "../../src/relationship-search.js";

describe("人物关系来源搜索", () => {
  it("为中文名称生成可用于 contentless FTS 的字符和拼音 token", () => {
    expect(relationshipCharacterTokens("魔斯拉")).toEqual(["u9b54", "u65af", "u62c9"]);
    expect(relationshipPinyinSyllables("魔斯拉")).toEqual(["mo", "si", "la"]);
    expect(relationshipPinyinTokens("女娲")).toEqual(["pnv", "pwa"]);
  });

  it("识别同音、单字错误、插入删除和换位", () => {
    expect(findApproximateNameMatches("摩斯拉苏醒了", "魔斯拉")[0]).toMatchObject({ observed: "摩斯拉", pinyinDistance: 0 });
    expect(findApproximateNameMatches("魔斯娜苏醒了", "魔斯拉")[0]).toMatchObject({ observed: "魔斯娜", characterDistance: 1 });
    expect(damerauLevenshteinDistance([..."魔斯拉"], [..."魔拉斯"], 1)).toBe(1);
    expect(damerauLevenshteinDistance([..."魔斯拉"], [..."魔拉"], 1)).toBe(1);
  });

  it("不会对单字名称做近似匹配", () => {
    expect(findApproximateNameMatches("小林站在门外", "林")).toEqual([]);
  });

  it("中文名称不会把拉丁字段名或单字残片当成近似写法", () => {
    expect(findApproximateNameMatches('{"name":"纪宁"}', "阿宁").some((item) => item.observed === "am")).toBe(false);
    expect(findApproximateNameMatches("人物纪宁属于守望会", "阿宁").some((item) => item.observed === "宁")).toBe(false);
  });

  it("在截取结果前排除其他已登记人物名", () => {
    const matches = findApproximateNameMatches("摩斯拉反复出现，最终莫斯啦现身", "魔斯拉", 1, new Set(["摩斯拉"]));
    expect(matches).toHaveLength(1);
    expect(matches[0]?.observed).toBe("莫斯啦");
  });

  it("疑似窗口超过预算时显式失败", () => {
    expect(() => findApproximateNameMatches("摩斯拉".repeat(5), "魔斯拉", 3, new Set(), 1))
      .toThrow(RelationshipApproximateMatchLimitError);
  });

  it("分块扫描可以识别跨块边界的疑似写法", async () => {
    const prefix = "无".repeat(16_383);
    const matches = await findApproximateNameMatchesChunked(`${prefix}摩斯拉苏醒`, "魔斯拉");
    expect(matches[0]).toMatchObject({ observed: "摩斯拉", start: 16_383, pinyinDistance: 0 });
  });
});
