import { describe, expect, it } from "vitest";
import { filterRelationships } from "../../src/public/relationship-filters.js";

describe("relationship filters", () => {
  const relationships = [
    { id: "r1", fromCharacterId: "a", toCharacterId: "b" },
    { id: "r2", fromCharacterId: "a", toCharacterId: "c" },
    { id: "r3", fromCharacterId: "b", toCharacterId: "c" },
    { id: "r4", fromCharacterId: "c", toCharacterId: "a" }
  ];

  it("matches any selected character within a filter and all active filter groups", () => {
    expect(filterRelationships(relationships, { fromCharacterIds: ["a", "b"] }).map((item) => item.id)).toEqual(["r1", "r2", "r3"]);
    expect(filterRelationships(relationships, { toCharacterIds: ["a", "c"] }).map((item) => item.id)).toEqual(["r2", "r3", "r4"]);
    expect(filterRelationships(relationships, { fromCharacterIds: ["a"], toCharacterIds: ["c"] }).map((item) => item.id)).toEqual(["r2"]);
  });

  it("returns all relationships when no filter is selected", () => {
    expect(filterRelationships(relationships)).toEqual(relationships);
  });
});
