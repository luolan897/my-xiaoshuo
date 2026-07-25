import { describe, expect, it } from "vitest";
import {
  CollaborationPresence,
  editorPageKey,
  entityEditorPageKey,
  modulePageKey,
  pageLabelForKey
} from "../../src/collaboration-presence.js";

describe("作品协作者在线状态", () => {
  it("按浏览器标签页记录受控页面并清理过期状态", () => {
    let now = Date.parse("2026-07-24T08:00:00.000Z");
    const presence = new CollaborationPresence(45_000, () => now);
    const owner = { userId: "owner", username: "owner", displayName: "作者", avatarUrl: null };
    const writer = { userId: "writer", username: "writer", displayName: "协作者", avatarUrl: "/avatar" };

    presence.heartbeat("work-1", "54b43f7d-9778-4c8a-8b59-2ae64718cd59", owner, { kind: "editor", resourceId: "chapter-1" });
    now += 1_000;
    const active = presence.heartbeat("work-1", "652c35d0-e187-4a74-ab0c-7f2e3d2f3301", writer, { kind: "entity-editor", module: "character", resourceId: "character-1" });

    expect(active.participants).toEqual([
      expect.objectContaining({ displayName: "协作者", page: { key: "entity-editor:character:character-1", label: "角色编辑" } }),
      expect.objectContaining({ displayName: "作者", page: { key: "editor:chapter-1", label: "正文编辑" } })
    ]);
    expect(active.recentChanges).toEqual([]);

    now += 45_001;
    const refreshed = presence.heartbeat("work-1", "652c35d0-e187-4a74-ab0c-7f2e3d2f3301", writer, { kind: "module", module: "timeline" });
    expect(refreshed.participants).toHaveLength(1);
    expect(refreshed.participants[0]?.page).toEqual({ key: "module:timeline", label: "时间轴" });
  });

  it("登记同页保存变更并在心跳中返回最近事件", () => {
    let now = Date.parse("2026-07-24T09:00:00.000Z");
    const presence = new CollaborationPresence(45_000, () => now, 120_000, 50);
    const owner = { userId: "owner", username: "owner", displayName: "作者", avatarUrl: null };
    const writer = { userId: "writer", username: "writer", displayName: "协作者", avatarUrl: null };

    const published = presence.publishChange("work-1", editorPageKey("chapter-1"), {
      userId: owner.userId,
      displayName: owner.displayName
    });
    expect(published).toMatchObject({
      pageKey: "editor:chapter-1",
      label: "正文编辑",
      actorUserId: "owner",
      actorDisplayName: "作者"
    });

    const heartbeat = presence.heartbeat("work-1", "client-writer", writer, { kind: "editor", resourceId: "chapter-1" });
    expect(heartbeat.recentChanges).toEqual([
      expect.objectContaining({
        id: published.id,
        pageKey: "editor:chapter-1",
        actorUserId: "owner"
      })
    ]);

    now += 120_001;
    const expired = presence.heartbeat("work-1", "client-writer", writer, { kind: "editor", resourceId: "chapter-1" });
    expect(expired.recentChanges).toEqual([]);
  });

  it("生成稳定的页面键与标签", () => {
    expect(editorPageKey("chapter-9")).toBe("editor:chapter-9");
    expect(entityEditorPageKey("character", "char-1")).toBe("entity-editor:character:char-1");
    expect(modulePageKey("relationships")).toBe("module:relationships");
    expect(pageLabelForKey("entity-editor:race:race-1")).toBe("种族编辑");
    expect(pageLabelForKey("module:outlines")).toBe("大纲与伏笔");
  });
});
