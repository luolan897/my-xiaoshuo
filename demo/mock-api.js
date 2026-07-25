import { analysisTasks, works as sourceWorks } from "./data.js";

const now = "2026-07-25T10:00:00.000Z";
const nativeFetch = window.fetch.bind(window);

const wordCount = (text) => Array.from(String(text ?? "").replace(/\s/gu, "")).length;
const page = (items, url) => {
  const pageNumber = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.max(1, Number(url.searchParams.get("limit") ?? 50));
  const start = (pageNumber - 1) * limit;
  const values = items.slice(start, start + limit);
  return { items: values, page: pageNumber, limit, hasMore: start + limit < items.length, nextPage: start + limit < items.length ? pageNumber + 1 : null };
};

function buildWork(source) {
  const id = source.id;
  const chapters = source.chapters.map((chapter) => ({
    id: `${id}-${chapter.id}`,
    workId: id,
    volumeId: "",
    title: chapter.title,
    content: chapter.content,
    chapterType: "正文",
    order: chapter.number,
    wordCount: wordCount(chapter.content),
    versionNo: chapter.version,
    createdAt: now,
    updatedAt: now
  }));
  const volumes = source.volumes.map((volume, index) => {
    const volumeId = `${id}-volume-${index + 1}`;
    const volumeChapters = chapters.filter((chapter) => chapter.order >= volume.range[0] && chapter.order <= volume.range[1]);
    volumeChapters.forEach((chapter) => { chapter.volumeId = volumeId; });
    return { id: volumeId, workId: id, title: volume.name, kind: "main", order: index + 1, versionNo: 1, chapters: volumeChapters };
  });
  const races = source.races.map((race, index) => ({
    id: `${id}-race-${index + 1}`,
    workId: id,
    name: race.name,
    description: race.traits,
    parentId: null,
    parentName: race.parent,
    path: [race.name],
    settings: [{ title: "族群概况", value: `${race.population}。${race.traits}` }],
    effectiveSettings: [{ title: "族群概况", value: `${race.population}。${race.traits}`, inherited: false, sourceRaceName: race.name }],
    memberIds: [],
    members: [],
    versionNo: 1
  }));
  const organizations = source.organizations.map((organization, index) => ({
    id: `${id}-organization-${index + 1}`,
    workId: id,
    name: organization.name,
    description: organization.stance,
    settings: [`类型：${organization.type}`, `规模：${organization.members} 人`],
    settingsSections: [{ id: `${id}-organization-${index + 1}-section`, title: "组织立场", contentMarkdown: organization.stance }],
    memberIds: [],
    members: [],
    versionNo: 1
  }));
  const characters = source.characters.map((character) => {
    const race = races.find((item) => item.name === character.race) ?? null;
    const organization = organizations.find((item) => item.name === character.org) ?? null;
    const item = {
      id: `${id}-character-${character.id}`,
      workId: id,
      name: character.name,
      aliases: character.tags,
      code: "",
      species: character.race,
      raceId: race?.id ?? null,
      race,
      attributes: { identity: character.role, details: [{ label: "年龄", value: character.age }] },
      currentState: { 身份: character.role, 所属: character.org },
      profile: { summary: character.detail },
      organizations: organization ? [{ id: organization.id, name: organization.name }] : [],
      lockedFields: [],
      profileSectionCount: 0,
      versionNo: 1,
      createdAt: now,
      updatedAt: now
    };
    if (race) {
      race.memberIds.push(item.id);
      race.members.push({ id: item.id, name: item.name });
    }
    if (organization) {
      organization.memberIds.push(item.id);
      organization.members.push({ id: item.id, name: item.name });
    }
    return item;
  });
  const settings = source.settings.map((setting, index) => ({
    id: `${id}-setting-${index + 1}`,
    workId: id,
    category: setting.type,
    title: setting.title,
    content: setting.content,
    status: "confirmed",
    locked: setting.locked,
    versionNo: 1,
    createdAt: now,
    updatedAt: now
  }));
  const trackNames = [...new Set(source.timeline.map((item) => item.track))];
  const timelineTracks = trackNames.map((name, index) => ({ id: `${id}-track-${index + 1}`, workId: id, name, description: `${name}相关的大事件`, sortOrder: index + 1, versionNo: 1 }));
  const timeline = source.timeline.map((event, index) => ({
    id: `${id}-event-${index + 1}`,
    workId: id,
    trackId: timelineTracks.find((track) => track.name === event.track)?.id ?? null,
    name: event.title,
    timeLabel: event.date,
    description: `发生于${event.chapter}，推动${event.track}发展。`,
    location: "",
    status: "confirmed",
    sortOrder: index + 1,
    participantIds: [],
    evidence: [],
    versionNo: 1
  }));
  const outlines = chapters.map((chapter, index) => ({
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    volumeTitle: volumes.find((volume) => volume.id === chapter.volumeId)?.title ?? "正文",
    goal: source.chapters[index].summary,
    conflict: source.chapters[index].content.split("\n\n")[1] ?? "",
    turningPoint: source.chapters[index].content.split("\n\n")[2] ?? "",
    status: index < chapters.length - 2 ? "completed" : "planned",
    unresolvedForeshadowCount: index === chapters.length - 1 ? 1 : 0,
    versionNo: 1
  }));
  const foreshadows = source.outlines.map((item, index) => ({
    id: `${id}-foreshadow-${index + 1}`,
    workId: id,
    title: item.title,
    description: item.note,
    importance: item.type === "主线" ? "critical" : "major",
    status: item.status === "已回收" ? "resolved" : "planted",
    unresolved: item.status !== "已回收",
    overdue: false,
    occurrences: [],
    versionNo: 1
  }));
  const characterBySourceId = new Map(source.characters.map((character, index) => [character.id, characters[index]]));
  const relationships = source.relations.map((relationship, index) => ({
    id: `${id}-relationship-${index + 1}`,
    workId: id,
    fromCharacterId: characterBySourceId.get(relationship.from)?.id,
    toCharacterId: characterBySourceId.get(relationship.to)?.id,
    category: ({ "亲属": "family", "情感": "emotional", "冲突": "conflict", "社交": "social" })[relationship.kind] ?? "uncertain",
    subtype: relationship.label,
    keywords: [relationship.label],
    directed: false,
    confidence: 0.93,
    confirmationStatus: "confirmed",
    evidence: [{ chapterId: chapters[0].id, quote: relationship.evidence }],
    versionNo: 1
  }));
  const tasks = analysisTasks.map((task, index) => ({
    id: `${id}-task-${index + 1}`,
    workId: id,
    taskType: ["consistency-check", "relationship-analysis", "book-analysis", "chapter-analysis"][index] ?? "book-analysis",
    scope: { type: "book" },
    scopeSummary: "全书",
    status: task.status === "排队中" ? "pending" : "completed",
    progress: task.status === "排队中" ? 0 : 100,
    result: { summary: task.result },
    failures: [],
    createdAt: now,
    updatedAt: now
  }));
  const wordTotal = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
  return {
    id,
    title: source.title,
    author: source.author,
    description: source.synopsis,
    accessRole: "owner",
    modulePermissions: null,
    coverUrl: null,
    chapterCount: chapters.length,
    wordCount: wordTotal,
    versionNo: 1,
    createdAt: now,
    updatedAt: now,
    volumes,
    chapters,
    characters,
    settings,
    races,
    organizations,
    timelineTracks,
    timeline,
    outlines,
    foreshadows,
    relationships,
    reviews: [],
    tasks
  };
}

const works = sourceWorks.map(buildWork);
const findWork = (id) => works.find((work) => work.id === id);
const allChapters = () => works.flatMap((work) => work.chapters);
const success = (data, status = 200) => new Response(status === 204 ? null : JSON.stringify({ data }), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" }
});
const failure = (message, status = 404) => new Response(JSON.stringify({ error: { message } }), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" }
});
const bodyOf = async (init) => {
  if (!init?.body || init.body instanceof FormData) return {};
  try { return JSON.parse(String(init.body)); } catch { return {}; }
};

async function mockApi(input, init = {}) {
  const requestUrl = typeof input === "string" ? input : input.url;
  const url = new URL(requestUrl, window.location.origin);
  if (!url.pathname.startsWith("/api/")) return nativeFetch(input, init);
  const method = String(init.method ?? (typeof input === "string" ? "GET" : input.method) ?? "GET").toUpperCase();
  const path = url.pathname;

  if (path === "/api/health") return success({ ok: true, version: "0.1.0-demo", development: false });
  if (path === "/api/ui-settings" || path === "/api/platform/ui-settings") return success({ toastPosition: "bottom-right" });
  if (path === "/api/auth/session") return success({
    authenticated: true,
    csrfToken: "demo-csrf-token",
    user: { userId: "demo-user", username: "demo", displayName: "体验作者", role: "admin", status: "active", onboardingCompleted: true, avatarUrl: null }
  });
  if (path === "/api/auth/api-key") return success({ configured: false });
  if (path === "/api/auth/onboarding/complete") return success({ userId: "demo-user", username: "demo", displayName: "体验作者", role: "admin", status: "active", onboardingCompleted: true });
  if (path === "/api/works" && method === "GET") return success(page(works.map(({ chapters, characters, settings, races, organizations, timelineTracks, timeline, outlines, foreshadows, relationships, reviews, tasks, ...work }) => work), url));
  if (path === "/api/users") return success(page([], url));
  if (path === "/api/users/directory") return success([]);
  if (path === "/api/platform/ai/providers") return success([]);
  if (path === "/api/platform/ai/models") return success([]);
  if (path === "/api/platform/ai/settings") return success({ systemPrompt: "" });

  let match = path.match(/^\/api\/works\/([^/]+)$/u);
  if (match) {
    const work = findWork(decodeURIComponent(match[1]));
    if (!work) return failure("未找到作品");
    return success(work);
  }
  match = path.match(/^\/api\/chapters\/([^/]+)$/u);
  if (match) {
    const chapter = allChapters().find((item) => item.id === decodeURIComponent(match[1]));
    if (!chapter) return failure("未找到章节");
    if (method === "PATCH") {
      const body = await bodyOf(init);
      if (typeof body.title === "string") chapter.title = body.title;
      if (typeof body.content === "string") chapter.content = body.content;
      chapter.wordCount = wordCount(chapter.content);
      chapter.versionNo += 1;
    }
    return success(chapter);
  }
  match = path.match(/^\/api\/works\/([^/]+)\/(settings|characters|races|organizations|timeline-tracks|timeline|outlines|foreshadows|relationships|reviews|tasks|ai-conversations)$/u);
  if (match) {
    const work = findWork(decodeURIComponent(match[1]));
    if (!work) return failure("未找到作品");
    const key = ({ "timeline-tracks": "timelineTracks", "ai-conversations": "aiConversations" })[match[2]] ?? match[2];
    return success(page(work[key] ?? [], url));
  }
  match = path.match(/^\/api\/works\/([^/]+)\/presence$/u);
  if (match) return success([]);
  match = path.match(/^\/api\/works\/([^/]+)\/(models)$/u);
  if (match) return success([]);
  match = path.match(/^\/api\/works\/([^/]+)\/(ai-settings)$/u);
  if (match) return success({ systemPrompt: "", bookSummaryContextPercent: 20, contextCompactThreshold: 80, agentTools: [], autoRunEnabled: false, autoRunConcurrency: 2, autoRunBatchLimit: 20 });
  match = path.match(/^\/api\/works\/([^/]+)\/(task-defaults)$/u);
  if (match) return success([]);
  match = path.match(/^\/api\/works\/([^/]+)\/search$/u);
  if (match) {
    const work = findWork(decodeURIComponent(match[1]));
    const query = String(url.searchParams.get("q") ?? "").toLowerCase();
    if (!work) return failure("未找到作品");
    const results = [
      ...work.chapters.map((item) => ({ type: "chapter", id: item.id, title: item.title, snippet: item.content.slice(0, 120) })),
      ...work.characters.map((item) => ({ type: "character", id: item.id, title: item.name, snippet: item.profile.summary })),
      ...work.settings.map((item) => ({ type: "setting", id: item.id, title: item.title, snippet: item.content }))
    ].filter((item) => `${item.title} ${item.snippet}`.toLowerCase().includes(query));
    return success(results);
  }
  match = path.match(/^\/api\/characters\/([^/]+)$/u);
  if (match) {
    const character = works.flatMap((work) => work.characters).find((item) => item.id === decodeURIComponent(match[1]));
    return character ? success(character) : failure("未找到角色");
  }
  match = path.match(/^\/api\/settings\/([^/]+)$/u);
  if (match) {
    const setting = works.flatMap((work) => work.settings).find((item) => item.id === decodeURIComponent(match[1]));
    return setting ? success(setting) : failure("未找到设定");
  }
  match = path.match(/^\/api\/tasks\/([^/]+)$/u);
  if (match) {
    const task = works.flatMap((work) => work.tasks).find((item) => item.id === decodeURIComponent(match[1]));
    return task ? success({ ...task, scopeDetails: [{ type: "book" }] }) : failure("未找到任务");
  }
  if (/^\/api\/entity-versions\//u.test(path)) return success([]);
  if (/^\/api\/characters\/[^/]+\/(sections|versions)$/u.test(path)) return success([]);
  if (/^\/api\/works\/[^/]+\/members$/u.test(path)) return success([{ userId: "demo-user", username: "demo", displayName: "体验作者", role: "owner", status: "active", permissions: null }]);

  if (method !== "GET") return success({ demo: true });
  return failure(`Demo 尚未预制接口：${path}`);
}

window.fetch = mockApi;
