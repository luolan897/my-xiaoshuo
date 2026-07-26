import { describe, expect, it } from "vitest";
import {
  damerauLevenshteinDistance,
  findApproximateNameMatches,
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
});
