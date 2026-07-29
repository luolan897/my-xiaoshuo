import { describe, expect, it, vi } from "vitest";
import { createModuleRequestCache } from "../../src/public/module-request-cache.js";

describe("模块请求缓存", () => {
  it("同一作品和模块复用首次请求结果", async () => {
    const cache = createModuleRequestCache();
    const loader = vi.fn(async () => ({ items: ["首次结果"] }));

    const first = cache.request("work-1", "characters", "page:1", loader);
    const second = cache.request("work-1", "characters", "page:1", loader);

    expect(second).not.toBe(first);
    await expect(first).resolves.toEqual({ items: ["首次结果"] });
    await expect(second).resolves.toEqual({ items: ["首次结果"] });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("调用方修改结果不会污染后续缓存命中", async () => {
    const cache = createModuleRequestCache();
    const loader = vi.fn(async () => ({
      items: [{ id: "character-1", profile: { name: "原始名称" } }],
      page: 1
    }));

    const first = await cache.request("work-1", "characters", "page:1", loader);
    first.items[0]!.profile.name = "被调用方修改";
    first.items.push({ id: "character-2", profile: { name: "额外角色" } });

    await expect(cache.request("work-1", "characters", "page:1", loader)).resolves.toEqual({
      items: [{ id: "character-1", profile: { name: "原始名称" } }],
      page: 1
    });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("按作品、模块和请求参数隔离缓存", async () => {
    const cache = createModuleRequestCache();
    const loader = vi.fn(async () => loader.mock.calls.length);

    await cache.request("work-1", "characters", "page:1", loader);
    await cache.request("work-1", "characters", "page:2", loader);
    await cache.request("work-1", "relationships", "page:1", loader);
    await cache.request("work-2", "characters", "page:1", loader);

    expect(loader).toHaveBeenCalledTimes(4);
  });

  it("支持主动刷新和模块级失效", async () => {
    const cache = createModuleRequestCache();
    const loader = vi.fn(async () => loader.mock.calls.length);

    await expect(cache.request("work-1", "tasks", "page:1", loader)).resolves.toBe(1);
    await expect(cache.request("work-1", "tasks", "page:1", loader, { refresh: true })).resolves.toBe(2);
    cache.invalidate("work-1", "tasks");
    await expect(cache.request("work-1", "tasks", "page:1", loader)).resolves.toBe(3);
  });

  it("请求失败后允许再次加载", async () => {
    const cache = createModuleRequestCache();
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error("暂时失败"))
      .mockResolvedValueOnce("恢复");

    await expect(cache.request("work-1", "settings", "all", loader)).rejects.toThrow("暂时失败");
    await expect(cache.request("work-1", "settings", "all", loader)).resolves.toBe("恢复");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
