import { analysisTasks, works as sourceWorks } from "./data.js";
import { buildBrowserAiMessages, createBrowserAiStore, normalizeProviderBaseUrl, publicProvider, requestBrowserAi, testBrowserAiProvider } from "./browser-ai.js";
import { DEMO_CREDENTIALS as demoCredentials, isValidDemoLogin } from "./demo-auth.js";
import { DEMO_COVER_VERSIONS, DEMO_VERSION } from "./demo-version.js";

const now = "2026-07-25T10:00:00.000Z";
const nativeFetch = window.fetch.bind(window);
const browserAiStore = createBrowserAiStore(window.localStorage);
const demoAuthStorageKey = "scriverse-demo-authenticated";
const demoUser = Object.freeze({
  userId: "demo-user",
  username: demoCredentials.username,
  displayName: "体验作者",
  role: "admin",
  status: "active",
  onboardingCompleted: true,
  avatarUrl: null
});

function installDemoLoginHint() {
  const mount = () => {
    if (document.querySelector("#demo-login-hint")) return;
    const description = document.querySelector("#auth-description");
    if (!description) return;
    const hint = document.createElement("p");
    hint.id = "demo-login-hint";
    hint.className = "auth-security-hint";
    hint.textContent = `演示账号：${demoCredentials.username}　密码：${demoCredentials.password}　验证码：${demoCredentials.captchaAnswer}`;
    description.insertAdjacentElement("afterend", hint);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
}

installDemoLoginHint();

function installDemoFooterNotice() {
  const mount = () => {
    document.querySelectorAll("[data-product-footer]").forEach((footer) => {
      if (footer.querySelector(".demo-product-footer-notice")) return;
      const notice = document.createElement("span");
      notice.className = "product-footer-development demo-product-footer-notice";
      notice.textContent = "演示站";
      footer.append(notice);
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
}

installDemoFooterNotice();

function installBrowserAiNotice() {
  const mount = () => {
    const host = document.querySelector("#platform-ai-content");
    if (!host?.children.length || host.querySelector(".demo-browser-ai-notice")) return;
    const section = document.createElement("section");
    section.className = "config-section demo-browser-ai-notice";
    const header = document.createElement("div");
    header.className = "config-section-header";
    const copy = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = "演示站前端直连模式";
    const description = document.createElement("p");
    description.textContent = "供应商、模型和 API Key 仅保存在当前浏览器。AI 请求由浏览器直接发往你配置的 OpenAI 兼容接口，不经过演示站服务器；演示站服务器不会接收、记录或存储 API Key。请仅在可信设备上使用，并确认服务商支持浏览器跨域请求（CORS）。";
    copy.append(title, description);
    header.append(copy);
    section.append(header);
    host.prepend(section);
  };
  const observe = () => {
    mount();
    new MutationObserver(mount).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observe, { once: true });
  else observe();
}

installBrowserAiNotice();

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
    coverUrl: `/demo-covers/${id}.webp?v=${encodeURIComponent(DEMO_COVER_VERSIONS[id] ?? "0")}`,
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

const demoId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const defaultWorkAiSettings = () => ({ systemPrompt: "", bookSummaryContextPercent: 20, contextCompactThreshold: 80, agentTools: [], autoRunEnabled: false, autoRunConcurrency: 2, autoRunBatchLimit: 20 });
const modelWithProvider = (model, providers) => {
  const provider = providers.find((item) => item.id === model.providerId);
  return { ...model, providerName: provider?.name ?? "未找到供应商", providerStatus: provider?.status ?? "disabled", providerConnectionStatus: provider?.connectionStatus ?? "untested" };
};
const contextUsage = (model) => ({ inputTokens: 0, outputTokens: 0, totalTokens: 0, contextWindow: Number(model?.contextWindow ?? 128000), usagePercent: 0, conversationUsagePercent: 0, compactThreshold: 80 });

function conversationSummaries(state, workId) {
  return [...(state.conversations[workId] ?? [])]
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
    .map(({ messages, ...conversation }) => ({ ...conversation, messageCount: messages.length }));
}

function findConversation(state, conversationId) {
  return Object.values(state.conversations).flat().find((item) => item.id === conversationId);
}

async function runBrowserAi(body, workId) {
  const state = browserAiStore.read();
  const model = state.models.find((item) => item.id === body.modelId);
  if (!model?.enabled) throw new Error("所选模型不存在或未启用");
  const provider = state.providers.find((item) => item.id === model.providerId);
  if (!provider || provider.status !== "enabled" || !provider.apiKey) throw new Error("模型供应商未启用或缺少 API Key");
  const work = findWork(workId);
  if (!work) throw new Error("未找到作品");
  const conversation = body.conversationId ? findConversation(state, body.conversationId) : null;
  const settings = { ...defaultWorkAiSettings(), ...(state.workSettings[workId] ?? {}) };
  const messages = buildBrowserAiMessages({
    work,
    scope: body.scope,
    instruction: String(body.instruction ?? ""),
    platformPrompt: state.platformSettings.systemPrompt,
    workPrompt: settings.systemPrompt,
    conversationMessages: conversation?.messages ?? [],
    citations: body.citations ?? []
  });
  const result = await requestBrowserAi({ fetchImpl: nativeFetch, provider, model, messages });
  return { ...result, model: modelWithProvider(model, state.providers) };
}

function aiStreamResponse(result) {
  const outputTokens = result.outputTokens || Math.max(1, Math.ceil(Array.from(result.content).length / 2));
  const events = [
    `event: delta\ndata: ${JSON.stringify({ delta: result.content })}`,
    `event: complete\ndata: ${JSON.stringify({ model: { id: result.model.id, displayName: result.model.displayName }, outputTokens, toolCalls: [], processSteps: [] })}`
  ];
  return new Response(`${events.join("\n\n")}\n\n`, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" } });
}

async function mockApi(input, init = {}) {
  const requestUrl = typeof input === "string" ? input : input.url;
  const url = new URL(requestUrl, window.location.origin);
  if (!url.pathname.startsWith("/api/")) return nativeFetch(input, init);
  const method = String(init.method ?? (typeof input === "string" ? "GET" : input.method) ?? "GET").toUpperCase();
  const path = url.pathname;

  if (path === "/api/health") return success({ ok: true, version: DEMO_VERSION, development: false });
  if (path === "/api/ui-settings" || path === "/api/platform/ui-settings") return success({ toastPosition: "bottom-right" });
  if (path === "/api/auth/captcha") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="52" viewBox="0 0 160 52"><rect width="160" height="52" rx="8" fill="#f2ebe3"/><path d="M8 38 152 12M12 10l138 32" stroke="#a96350" stroke-opacity=".22"/><text x="80" y="35" text-anchor="middle" font-family="monospace" font-size="27" font-weight="700" letter-spacing="8" fill="#5b3028">2468</text></svg>`;
    return success({ captchaId: "demo-captcha", imageDataUrl: `data:image/svg+xml;base64,${btoa(svg)}` });
  }
  if (path === "/api/auth/login" && method === "POST") {
    const body = await bodyOf(init);
    if (!isValidDemoLogin(body)) return failure("演示账号、密码或验证码不正确", 401);
    sessionStorage.setItem(demoAuthStorageKey, "true");
    return success(demoUser);
  }
  if (path === "/api/auth/session" && method === "DELETE") {
    sessionStorage.removeItem(demoAuthStorageKey);
    return success(null, 204);
  }
  if (path === "/api/auth/session") {
    const authenticated = sessionStorage.getItem(demoAuthStorageKey) === "true";
    return success(authenticated
      ? { authenticated: true, csrfToken: "demo-csrf-token", user: demoUser }
      : { authenticated: false, setupRequired: false, registrationOpen: false });
  }
  if (path === "/api/auth/register") return failure("Demo 不开放注册，请使用页面提供的演示账号", 403);
  if (sessionStorage.getItem(demoAuthStorageKey) !== "true") return failure("请先登录演示账号", 401);
  if (path === "/api/auth/api-key") return success({ configured: false });
  if (path === "/api/auth/onboarding/complete") return success(demoUser);
  if (path === "/api/platform/ai/providers") {
    if (method === "GET") return success(browserAiStore.read().providers.map(publicProvider));
    const body = await bodyOf(init);
    const provider = {
      id: demoId("provider"),
      name: String(body.name ?? "").trim(),
      baseUrl: normalizeProviderBaseUrl(body.baseUrl),
      apiKey: String(body.apiKey ?? "").trim(),
      concurrencyLimit: Number(body.concurrencyLimit ?? 10),
      rpmLimit: Number(body.rpmLimit ?? 10),
      maxTokens: Number(body.maxTokens ?? 32000),
      note: String(body.note ?? ""),
      status: body.status === "disabled" ? "disabled" : "enabled",
      connectionStatus: "untested",
      lastError: null
    };
    browserAiStore.update((state) => { state.providers.push(provider); });
    return success(publicProvider(provider), 201);
  }
  if (path === "/api/platform/ai/models") {
    const state = browserAiStore.read();
    return success(state.models.map((model) => modelWithProvider(model, state.providers)));
  }
  if (path === "/api/platform/ai/settings") {
    const state = browserAiStore.read();
    if (method === "GET") return success(state.platformSettings);
    const body = await bodyOf(init);
    browserAiStore.update((current) => { current.platformSettings = { ...current.platformSettings, ...body }; });
    return success({ ...state.platformSettings, ...body });
  }
  let match = path.match(/^\/api\/providers\/([^/]+)$/u);
  if (match) {
    const providerId = decodeURIComponent(match[1]);
    const body = await bodyOf(init);
    let updated;
    browserAiStore.update((state) => {
      const provider = state.providers.find((item) => item.id === providerId);
      if (!provider) return;
      const connectionChanged = body.baseUrl !== undefined || String(body.apiKey ?? "").trim();
      Object.assign(provider, body, body.baseUrl !== undefined ? { baseUrl: normalizeProviderBaseUrl(body.baseUrl) } : {}, String(body.apiKey ?? "").trim() ? { apiKey: String(body.apiKey).trim() } : {});
      if (connectionChanged) Object.assign(provider, { connectionStatus: "untested", lastError: null });
      updated = provider;
    });
    return updated ? success(publicProvider(updated)) : failure("未找到 AI 供应商");
  }
  match = path.match(/^\/api\/providers\/([^/]+)\/test$/u);
  if (match) {
    const providerId = decodeURIComponent(match[1]);
    const provider = browserAiStore.read().providers.find((item) => item.id === providerId);
    if (!provider) return failure("未找到 AI 供应商");
    try {
      await testBrowserAiProvider({ fetchImpl: nativeFetch, provider });
      browserAiStore.update((state) => { Object.assign(state.providers.find((item) => item.id === providerId), { connectionStatus: "success", lastError: null }); });
      return success({ ok: true });
    } catch (error) {
      const message = error instanceof TypeError ? "浏览器无法直连该地址，请确认服务商支持 CORS" : error.message;
      browserAiStore.update((state) => { Object.assign(state.providers.find((item) => item.id === providerId), { connectionStatus: "failed", lastError: message }); });
      return success({ ok: false, error: message });
    }
  }
  match = path.match(/^\/api\/providers\/([^/]+)\/models$/u);
  if (match) {
    const providerId = decodeURIComponent(match[1]);
    const body = await bodyOf(init);
    const state = browserAiStore.read();
    if (!state.providers.some((item) => item.id === providerId)) return failure("未找到 AI 供应商");
    const model = { id: demoId("model"), providerId, displayName: String(body.displayName ?? "").trim(), modelId: String(body.modelId ?? "").trim(), purposes: body.purposes ?? ["chat"], contextWindow: Number(body.contextWindow ?? 128000), preset: body.preset ?? { temperature: 0.7, max_tokens: 32000 }, thinkingEnabled: body.thinkingEnabled !== false, enabled: body.enabled !== false };
    browserAiStore.update((current) => { current.models.push(model); });
    return success(modelWithProvider(model, state.providers), 201);
  }
  match = path.match(/^\/api\/models\/([^/]+)$/u);
  if (match) {
    const modelId = decodeURIComponent(match[1]);
    const body = await bodyOf(init);
    let updated;
    browserAiStore.update((state) => {
      const model = state.models.find((item) => item.id === modelId);
      if (!model) return;
      Object.assign(model, body);
      updated = modelWithProvider(model, state.providers);
    });
    return updated ? success(updated) : failure("未找到模型");
  }
  match = path.match(/^\/api\/works\/([^/]+)\/models$/u);
  if (match) {
    const state = browserAiStore.read();
    return success(state.models.map((model) => modelWithProvider(model, state.providers)).filter((model) => model.enabled && model.providerStatus === "enabled"));
  }
  match = path.match(/^\/api\/works\/([^/]+)\/ai-settings$/u);
  if (match) {
    const workId = decodeURIComponent(match[1]);
    const body = await bodyOf(init);
    const settings = { ...defaultWorkAiSettings(), ...(browserAiStore.read().workSettings[workId] ?? {}) };
    if (method === "GET") return success(settings);
    browserAiStore.update((state) => { state.workSettings[workId] = { ...settings, ...body }; });
    return success({ ...settings, ...body });
  }
  match = path.match(/^\/api\/works\/([^/]+)\/task-defaults$/u);
  if (match) {
    const workId = decodeURIComponent(match[1]);
    const state = browserAiStore.read();
    return success(Object.entries(state.taskDefaults[workId] ?? {}).flatMap(([taskType, modelId]) => {
      const model = state.models.find((item) => item.id === modelId);
      return model ? [{ taskType, model: modelWithProvider(model, state.providers) }] : [];
    }));
  }
  match = path.match(/^\/api\/works\/([^/]+)\/task-defaults\/([^/]+)$/u);
  if (match) {
    const workId = decodeURIComponent(match[1]);
    const taskType = decodeURIComponent(match[2]);
    const body = await bodyOf(init);
    browserAiStore.update((state) => { state.taskDefaults[workId] = { ...(state.taskDefaults[workId] ?? {}), [taskType]: body.modelId }; });
    return success({ taskType, modelId: body.modelId });
  }
  match = path.match(/^\/api\/works\/([^/]+)\/ai-conversations$/u);
  if (match) {
    const workId = decodeURIComponent(match[1]);
    if (method === "GET") return success(page(conversationSummaries(browserAiStore.read(), workId), url));
    const createdAt = new Date().toISOString();
    const conversation = { id: demoId("conversation"), workId, title: "新对话", messages: [], createdAt, updatedAt: createdAt, contextWarningPending: false };
    browserAiStore.update((state) => { state.conversations[workId] = [conversation, ...(state.conversations[workId] ?? [])]; });
    return success({ ...conversation, messageCount: 0 }, 201);
  }
  match = path.match(/^\/api\/ai-conversations\/([^/]+)$/u);
  if (match) {
    const conversation = findConversation(browserAiStore.read(), decodeURIComponent(match[1]));
    return conversation ? success(conversation) : failure("未找到 AI 对话");
  }
  match = path.match(/^\/api\/ai-conversations\/([^/]+)\/messages$/u);
  if (match) {
    const conversationId = decodeURIComponent(match[1]);
    const body = await bodyOf(init);
    const message = { id: demoId("message"), role: body.role, content: String(body.content ?? ""), citations: body.citations ?? [], metadata: body.metadata ?? {}, createdAt: new Date().toISOString() };
    let found = false;
    browserAiStore.update((state) => {
      const conversation = findConversation(state, conversationId);
      if (!conversation) return;
      conversation.messages.push(message);
      conversation.updatedAt = message.createdAt;
      if (conversation.title === "新对话" && message.role === "user") conversation.title = Array.from(message.content).slice(0, 18).join("") || "新对话";
      found = true;
    });
    return found ? success(message, 201) : failure("未找到 AI 对话");
  }
  match = path.match(/^\/api\/ai-conversations\/([^/]+)\/context\/prepare$/u);
  if (match) {
    const body = await bodyOf(init);
    const model = browserAiStore.read().models.find((item) => item.id === body.modelId);
    return success({ action: "ready", usage: contextUsage(model) });
  }
  match = path.match(/^\/api\/works\/([^/]+)\/ai-context-usage$/u);
  if (match) {
    const body = await bodyOf(init);
    const model = browserAiStore.read().models.find((item) => item.id === body.modelId);
    return success(contextUsage(model));
  }
  match = path.match(/^\/api\/works\/([^/]+)\/chat\/stream$/u);
  if (match) {
    try {
      return aiStreamResponse(await runBrowserAi(await bodyOf(init), decodeURIComponent(match[1])));
    } catch (error) {
      const message = error instanceof TypeError ? "浏览器直连失败，请确认接口地址、网络与 CORS 配置" : error.message;
      return failure(message, 502);
    }
  }
  match = path.match(/^\/api\/works\/([^/]+)\/suggestions$/u);
  if (match) {
    try {
      const body = await bodyOf(init);
      const result = await runBrowserAi(body, decodeURIComponent(match[1]));
      const chapter = allChapters().find((item) => item.id === body.scope?.chapterId);
      return success({ id: demoId("suggestion"), content: result.content, action: "note", chapterVersion: chapter?.versionNo ?? 1, outputTokens: result.outputTokens || Math.max(1, Math.ceil(Array.from(result.content).length / 2)), model: { id: result.model.id, displayName: result.model.displayName } }, 201);
    } catch (error) {
      const message = error instanceof TypeError ? "浏览器直连失败，请确认接口地址、网络与 CORS 配置" : error.message;
      return failure(message, 502);
    }
  }
  if (path === "/api/works" && method === "GET") return success(page(works.map(({ chapters, characters, settings, races, organizations, timelineTracks, timeline, outlines, foreshadows, relationships, reviews, tasks, ...work }) => work), url));
  if (path === "/api/users") return success(page([], url));
  if (path === "/api/users/directory") return success([]);
  match = path.match(/^\/api\/works\/([^/]+)$/u);
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
