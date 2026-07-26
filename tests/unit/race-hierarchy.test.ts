import { describe, expect, it } from "vitest";
// @ts-expect-error 浏览器端模块没有单独的类型声明，测试仅调用纯函数导出。
import { buildRaceForest, eligibleRaceParents, orderRaceFilterOptions, paginateRaceForest, raceDescendantIds, racePathLabel } from "../../src/public/race-hierarchy.js";

const races = [
  { id: "human", name: "人类", parentRaceId: null, lineage: [{ id: "human", name: "人类" }] },
  { id: "titan", name: "泰坦", parentRaceId: null, lineage: [{ id: "titan", name: "泰坦" }] },
  { id: "original", name: "原生泰坦", parentRaceId: "titan", lineage: [{ id: "titan", name: "泰坦" }, { id: "original", name: "原生泰坦" }] },
  { id: "alpha", name: "阿尔法泰坦", parentRaceId: "original", lineage: [{ id: "titan", name: "泰坦" }, { id: "original", name: "原生泰坦" }, { id: "alpha", name: "阿尔法泰坦" }] }
];

describe("种族层级前端逻辑", () => {
  it("按名称构建稳定的多层种族森林", () => {
    const forest = buildRaceForest(races);
    expect(forest.map((race: { id: string }) => race.id)).toEqual(["human", "titan"]);
    const titan = forest.find((race: { id: string }) => race.id === "titan");
    expect(titan.children[0].id).toBe("original");
    expect(titan.children[0].children[0].id).toBe("alpha");
  });

  it("生成完整路径并排除当前种族及全部后代父级候选", () => {
    expect(racePathLabel(races[3])).toBe("泰坦 / 原生泰坦 / 阿尔法泰坦");
    expect([...raceDescendantIds(races, "titan")]).toEqual(expect.arrayContaining(["original", "alpha"]));
    expect(eligibleRaceParents(races, "original").map((race: { id: string }) => race.id)).toEqual(["human", "titan"]);
  });

  it("筛选选项先展示全部根节点，再按父节点集中排列子节点", () => {
    const options = [
      { id: "titan-child-b", name: "贝塔泰坦", parentRaceId: "titan" },
      { id: "human-child", name: "新人类", parentRaceId: "human" },
      { id: "titan", name: "泰坦", parentRaceId: null },
      { id: "titan-grandchild", name: "幼生泰坦", parentRaceId: "titan-child-a" },
      { id: "human", name: "人类", parentRaceId: null },
      { id: "titan-child-a", name: "阿尔法泰坦", parentRaceId: "titan" }
    ];

    expect(orderRaceFilterOptions(options).map((race: { id: string }) => race.id)).toEqual([
      "human",
      "titan",
      "human-child",
      "titan-child-a",
      "titan-child-b",
      "titan-grandchild"
    ]);
  });

  it("分页时保留完整根子树且按实际节点数统计", () => {
    const pageOne = paginateRaceForest(races, 1, 3);
    const pageTwo = paginateRaceForest(races, 2, 3);

    expect(pageOne.items.map((race: { id: string }) => race.id)).toEqual(["human"]);
    expect(pageOne.itemCount).toBe(1);
    expect(pageOne.pageCount).toBe(2);
    expect(pageTwo.items.map((race: { id: string }) => race.id)).toEqual(["titan"]);
    expect(pageTwo.items[0].children[0].children[0].id).toBe("alpha");
    expect(pageTwo.itemCount).toBe(3);
    expect(pageTwo.total).toBe(4);
  });

  it("单棵大子树超过分页上限时仍保留在同一页", () => {
    const result = paginateRaceForest(races.slice(1), 1, 2);

    expect(result.pageCount).toBe(1);
    expect(result.itemCount).toBe(3);
    expect(result.items[0].children[0].children[0].id).toBe("alpha");
  });
});
