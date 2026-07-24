export const presencePageKinds = [
  "welcome",
  "editor",
  "module",
  "entity-editor",
  "settings"
] as const;

export type PresencePageKind = typeof presencePageKinds[number];

export type PresencePage = {
  kind: PresencePageKind;
  module?: string;
  resourceId?: string;
};

export type PresenceUser = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type PresenceParticipant = PresenceUser & {
  clientId: string;
  page: {
    key: string;
    label: string;
  };
  lastSeenAt: string;
};

type PresenceEntry = PresenceParticipant & {
  workId: string;
  lastSeenMs: number;
};

const moduleLabels: Record<string, string> = {
  settings: "设定库",
  characters: "角色",
  races: "种族",
  organizations: "组织",
  timeline: "时间轴",
  relationships: "人物关系",
  outlines: "大纲与伏笔",
  reviews: "审核队列",
  tasks: "AI 分析",
  "ai-settings": "AI 设置"
};

const entityLabels: Record<string, string> = {
  setting: "设定编辑",
  character: "角色编辑",
  race: "种族编辑",
  organization: "组织编辑"
};

function normalizedPage(page: PresencePage): PresenceParticipant["page"] {
  const module = String(page.module ?? "");
  const resourceId = String(page.resourceId ?? "");
  if (page.kind === "editor") return { key: `editor:${resourceId}`, label: "正文编辑" };
  if (page.kind === "entity-editor") return { key: `entity-editor:${module}:${resourceId}`, label: entityLabels[module] ?? "资料编辑" };
  if (page.kind === "module") return { key: `module:${module}`, label: moduleLabels[module] ?? "作品模块" };
  if (page.kind === "settings") return { key: "settings", label: "设置中心" };
  return { key: "welcome", label: "作品首页" };
}

export class CollaborationPresence {
  private readonly entries = new Map<string, PresenceEntry>();

  constructor(
    private readonly timeoutMs = 45_000,
    private readonly now: () => number = Date.now
  ) {}

  heartbeat(workId: string, clientId: string, user: PresenceUser, page: PresencePage): PresenceParticipant[] {
    const now = this.now();
    this.prune(now);
    const normalized = normalizedPage(page);
    this.entries.set(`${workId}:${clientId}`, {
      workId,
      clientId,
      ...user,
      page: normalized,
      lastSeenAt: new Date(now).toISOString(),
      lastSeenMs: now
    });
    return this.list(workId, now);
  }

  private list(workId: string, now: number): PresenceParticipant[] {
    this.prune(now);
    return [...this.entries.values()]
      .filter((entry) => entry.workId === workId)
      .sort((left, right) => right.lastSeenMs - left.lastSeenMs || left.displayName.localeCompare(right.displayName, "zh-CN"))
      .map(({ workId: _workId, lastSeenMs: _lastSeenMs, ...participant }) => participant);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (now - entry.lastSeenMs > this.timeoutMs) this.entries.delete(key);
    }
  }
}
