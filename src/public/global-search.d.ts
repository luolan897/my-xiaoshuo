export type GlobalSearchTarget =
  | { kind: "chapter"; type: "chapter"; id: string; module: "editor" }
  | {
      kind: "entity";
      type: "setting" | "character" | "race" | "organization";
      id: string;
      module: "settings" | "characters" | "races" | "organizations";
      entity: "setting" | "character" | "race" | "organization";
      apiPath: string;
    };

export function resolveGlobalSearchTarget(result?: { type?: unknown; id?: unknown }): GlobalSearchTarget | null;
