import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("作品工作台按需加载", () => {
  it("打开作品时只加载目录和当前章节", async () => {
    const application = await readFile(join(process.cwd(), "src/public/app.js"), "utf8");
    const selectWorkSource = application.slice(
      application.indexOf("async function selectWork(workId, preferredChapterId = null)"),
      application.indexOf("function renderTree()")
    );

    expect(selectWorkSource).toContain("renderTree();");
    expect(selectWorkSource).toContain("await selectChapter(targetChapter.id)");
    expect(selectWorkSource).toContain("chapter.id === preferredChapterId");
    expect(selectWorkSource).not.toContain("await loadModels()");
    expect(selectWorkSource).not.toContain("await loadAiReferences()");
    expect(selectWorkSource).not.toContain("await loadAiConversations()");
  });

  it("子模块和创作助手资源只在首次使用时加载", async () => {
    const application = await readFile(join(process.cwd(), "src/public/app.js"), "utf8");
    const showModuleSource = application.slice(
      application.indexOf("async function showModule(module)"),
      application.indexOf("function emptyModule(")
    );

    expect(showModuleSource).toContain('if (module === "settings") await renderSettings()');
    expect(showModuleSource).toContain('if (module === "characters") await renderCharacters(characterListPage)');
    expect(showModuleSource).toContain('if (module === "timeline") await renderTimeline()');
    expect(showModuleSource).toContain('if (module === "relationships") await renderRelationships()');
    expect(application).toContain('$("#ai-prompt").addEventListener("focus"');
    expect(application).toContain("await ensureAiReferencesLoaded();");
    expect(application).toContain("await ensureAiConversationsLoaded();");
  });

  it("种族列表不预加载角色，编辑器按需加载成员选项", async () => {
    const application = await readFile(join(process.cwd(), "src/public/app.js"), "utf8");
    const renderRacesSource = application.slice(
      application.indexOf("async function renderRaces("),
      application.indexOf("async function renderOrganizations(")
    );
    const openKnowledgeEditorSource = application.slice(
      application.indexOf("async function openKnowledgeEditor(kind, item"),
      application.indexOf("async function openRaceDialog(item, options)")
    );

    expect(renderRacesSource).toContain('state.races = await apiAllPages(`/api/works/${state.work.id}/races`)');
    expect(renderRacesSource).not.toContain('/characters');
    expect(openKnowledgeEditorSource).toContain('state.characters = canReadModule("characters") ? await apiAllPages(`/api/works/${state.work.id}/characters`) : []');
  });
});
