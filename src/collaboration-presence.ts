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

export type CollaborativeChange = {
  id: string;
  pageKey: string;
  label: string;
  actorUserId: string;
  actorDisplayName: string;
  savedAt: string;
};

export type PresenceHeartbeatResult = {
  participants: PresenceParticipant[];
  recentChanges: CollaborativeChange[];
};

type PresenceEntry = PresenceParticipant & {
  workId: string;
  lastSeenMs: number;
};

type ChangeEntry = CollaborativeChange & {
  workId: string;
  savedAtMs: number;
  recipientClientIds: string[];
};

const moduleLabels: Record<string, string> = {
  settings: "设定库",
  characters: "角色",
  races: "种族",
  organizations: "组织",
  timeline: "时间轴",
  comments: "正文评论",
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
  organization: "组织编辑",
  relationship: "人物关系编辑"
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

export function editorPageKey(chapterId: string): string {
  return `editor:${chapterId}`;
}

export function entityEditorPageKey(module: "setting" | "character" | "race" | "organization" | "relationship", resourceId: string): string {
  return `entity-editor:${module}:${resourceId}`;
}

export function modulePageKey(module: keyof typeof moduleLabels | string): string {
  return `module:${module}`;
}

export function pageLabelForKey(pageKey: string): string {
  if (pageKey.startsWith("editor:")) return "正文编辑";
  if (pageKey.startsWith("entity-editor:")) {
    const module = pageKey.split(":")[1] ?? "";
    return entityLabels[module] ?? "资料编辑";
  }
  if (pageKey.startsWith("module:")) {
    const module = pageKey.slice("module:".length);
    return moduleLabels[module] ?? "作品模块";
  }
  if (pageKey === "settings") return "设置中心";
  return "作品页面";
}

export class CollaborationPresence {
  private readonly entries = new Map<string, PresenceEntry>();
  private readonly changes: ChangeEntry[] = [];
  private changeSequence = 0;

  constructor(
    private readonly timeoutMs = 45_000,
    private readonly now: () => number = Date.now,
    private readonly changeTtlMs = 120_000,
    private readonly maxChanges = 50
  ) {}

  heartbeat(workId: string, clientId: string, user: PresenceUser, page: PresencePage): PresenceHeartbeatResult {
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
    return {
      participants: this.list(workId, now),
      recentChanges: this.listChanges(workId, normalized.key, clientId, now)
    };
  }

  publishChange(
    workId: string,
    pageKey: string,
    actor: { userId: string; displayName: string },
    label = pageLabelForKey(pageKey)
  ): CollaborativeChange | null {
    const now = this.now();
    this.prune(now);
    const recipientClientIds = [...new Set([...this.entries.values()]
      .filter((entry) => (
        entry.workId === workId
        && entry.page.key === pageKey
        && entry.userId !== actor.userId
      ))
      .map((entry) => entry.clientId))];
    if (recipientClientIds.length === 0) return null;
    this.changeSequence += 1;
    const change: ChangeEntry = {
      id: `change-${now}-${this.changeSequence}`,
      workId,
      pageKey,
      label,
      actorUserId: actor.userId,
      actorDisplayName: actor.displayName,
      savedAt: new Date(now).toISOString(),
      savedAtMs: now,
      recipientClientIds
    };
    this.changes.push(change);
    while (this.changes.length > this.maxChanges) this.changes.shift();
    return {
      id: change.id,
      pageKey: change.pageKey,
      label: change.label,
      actorUserId: change.actorUserId,
      actorDisplayName: change.actorDisplayName,
      savedAt: change.savedAt
    };
  }

  listChanges(workId: string, pageKey: string, receiverClientId: string, now = this.now()): CollaborativeChange[] {
    this.pruneChanges(now);
    return this.changes
      .filter((change) => (
        change.workId === workId
        && change.pageKey === pageKey
        && change.recipientClientIds.includes(receiverClientId)
      ))
      .sort((left, right) => right.savedAtMs - left.savedAtMs)
      .map(({ workId: _workId, savedAtMs: _savedAtMs, recipientClientIds: _recipientClientIds, ...change }) => change);
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
    this.pruneChanges(now);
  }

  private pruneChanges(now: number): void {
    while (this.changes.length > 0) {
      const oldest = this.changes[0];
      if (!oldest || now - oldest.savedAtMs <= this.changeTtlMs) break;
      this.changes.shift();
    }
  }
}
