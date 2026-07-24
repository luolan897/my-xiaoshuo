import { describe, expect, it } from "vitest";
import { CollaborationPresence } from "../../src/collaboration-presence.js";

describe("作品协作者在线状态", () => {
  it("按浏览器标签页记录受控页面并清理过期状态", () => {
    let now = Date.parse("2026-07-24T08:00:00.000Z");
    const presence = new CollaborationPresence(45_000, () => now);
    const owner = { userId: "owner", username: "owner", displayName: "作者", avatarUrl: null };
    const writer = { userId: "writer", username: "writer", displayName: "协作者", avatarUrl: "/avatar" };

    presence.heartbeat("work-1", "54b43f7d-9778-4c8a-8b59-2ae64718cd59", owner, { kind: "editor", resourceId: "chapter-1" });
    now += 1_000;
    const active = presence.heartbeat("work-1", "652c35d0-e187-4a74-ab0c-7f2e3d2f3301", writer, { kind: "entity-editor", module: "character", resourceId: "character-1" });

    expect(active).toEqual([
      expect.objectContaining({ displayName: "协作者", page: { key: "entity-editor:character:character-1", label: "角色编辑" } }),
      expect.objectContaining({ displayName: "作者", page: { key: "editor:chapter-1", label: "正文编辑" } })
    ]);

    now += 45_001;
    const refreshed = presence.heartbeat("work-1", "652c35d0-e187-4a74-ab0c-7f2e3d2f3301", writer, { kind: "module", module: "timeline" });
    expect(refreshed).toHaveLength(1);
    expect(refreshed[0]?.page).toEqual({ key: "module:timeline", label: "时间轴" });
  });
});
