export const BROWSER_AI_STORAGE_KEY = "scriverse-demo-browser-ai";

const defaultState = () => ({
  providers: [],
  models: [],
  platformSettings: { systemPrompt: "" },
  workSettings: {},
  taskDefaults: {},
  conversations: {}
});

function normalizedState(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    providers: Array.isArray(source.providers) ? source.providers : [],
    models: Array.isArray(source.models) ? source.models : [],
    platformSettings: source.platformSettings && typeof source.platformSettings === "object" ? source.platformSettings : { systemPrompt: "" },
    workSettings: source.workSettings && typeof source.workSettings === "object" ? source.workSettings : {},
    taskDefaults: source.taskDefaults && typeof source.taskDefaults === "object" ? source.taskDefaults : {},
    conversations: source.conversations && typeof source.conversations === "object" ? source.conversations : {}
  };
}

export function createBrowserAiStore(storage) {
  return {
    read() {
      const raw = storage.getItem(BROWSER_AI_STORAGE_KEY);
      if (!raw) return defaultState();
      try {
        return normalizedState(JSON.parse(raw));
      } catch {
        return defaultState();
      }
    },
    update(mutator) {
      const state = this.read();
      const result = mutator(state) ?? state;
      storage.setItem(BROWSER_AI_STORAGE_KEY, JSON.stringify(result));
      return result;
    }
  };
}

export function normalizeProviderBaseUrl(value) {
  const url = new URL(String(value ?? "").trim());
  if (!/^https?:$/u.test(url.protocol)) throw new Error("供应商地址必须使用 HTTP 或 HTTPS");
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/(?:chat\/completions|models)\/?$/u, "").replace(/\/+$/u, "");
  return url.toString().replace(/\/$/u, "");
}

export function providerApiUrl(baseUrl, resource) {
  return `${normalizeProviderBaseUrl(baseUrl)}/${String(resource).replace(/^\/+/, "")}`;
}

export function publicProvider(provider) {
  const key = String(provider.apiKey ?? "");
  return {
    ...provider,
    apiKey: key ? `${key.slice(0, 3)}••••${key.slice(-2)}（仅浏览器）` : "未配置"
  };
}

function chapterList(work) {
  if (Array.isArray(work?.chapters)) return work.chapters;
  return (work?.volumes ?? []).flatMap((volume) => volume.chapters ?? []);
}

function scopeContext(work, scope) {
  const chapters = chapterList(work);
  if (scope?.type === "chapter" || scope?.chapterId) {
    const chapter = chapters.find((item) => item.id === scope.chapterId);
    if (chapter) return `当前章节：${chapter.title}\n\n${String(chapter.content ?? "").slice(0, 24000)}`;
  }
  if (scope?.type === "volume") {
    const volume = (work?.volumes ?? []).find((item) => item.id === scope.volumeId);
    if (volume) return `当前分卷：${volume.title}\n${(volume.chapters ?? []).map((chapter) => `${chapter.title}：${String(chapter.content ?? "").slice(0, 500)}`).join("\n")}`;
  }
  if (scope?.type === "book") {
    return `全书章节概览：\n${chapters.map((chapter) => `${chapter.title}：${String(chapter.content ?? "").slice(0, 280)}`).join("\n").slice(0, 24000)}`;
  }
  return "本次请求未附加正文上下文。";
}

export function buildBrowserAiMessages({ work, scope, instruction, platformPrompt = "", workPrompt = "", conversationMessages = [], citations = [] }) {
  const systemParts = [
    "你是叙界演示站中的小说创作助手。请使用简体中文回答，尊重作者决定，不要声称已经修改正文。",
    platformPrompt,
    workPrompt,
    `作品：${work?.title ?? "未命名作品"}\n简介：${work?.description ?? ""}`,
    scopeContext(work, scope)
  ].filter((part) => String(part).trim());
  if (citations.length) systemParts.push(`作者引用：\n${citations.map((item) => `${item.chapterTitle ?? "章节"}：${item.text ?? ""}`).join("\n").slice(0, 12000)}`);
  const history = conversationMessages
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .slice(-12)
    .map((message) => ({ role: message.role, content: String(message.content ?? "") }));
  if (history.at(-1)?.role !== "user" || history.at(-1)?.content !== instruction) history.push({ role: "user", content: instruction });
  return [{ role: "system", content: systemParts.join("\n\n") }, ...history];
}

function completionText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => typeof item === "string" ? item : item?.text ?? "").join("");
  if (typeof payload?.output_text === "string") return payload.output_text;
  throw new Error("模型响应中没有可用文本");
}

export async function requestBrowserAi({ fetchImpl, provider, model, messages }) {
  const response = await fetchImpl(providerApiUrl(provider.baseUrl, "chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: model.modelId,
      messages,
      stream: false,
      temperature: Number(model.preset?.temperature ?? 0.7),
      max_tokens: Number(model.preset?.max_tokens ?? provider.maxTokens ?? 32000)
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message ?? `供应商请求失败：${response.status}`);
  return {
    content: completionText(payload),
    outputTokens: Number(payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? 0)
  };
}

export async function testBrowserAiProvider({ fetchImpl, provider }) {
  const response = await fetchImpl(providerApiUrl(provider.baseUrl, "models"), {
    headers: { Accept: "application/json", Authorization: `Bearer ${provider.apiKey}` }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error?.message ?? `连接测试失败：${response.status}`);
  }
  return { ok: true };
}
