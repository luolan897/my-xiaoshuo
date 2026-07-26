const entityTargets = Object.freeze({
  setting: Object.freeze({ module: "settings", entity: "setting", resource: "settings" }),
  character: Object.freeze({ module: "characters", entity: "character", resource: "characters" }),
  race: Object.freeze({ module: "races", entity: "race", resource: "races" }),
  organization: Object.freeze({ module: "organizations", entity: "organization", resource: "organizations" })
});

export function resolveGlobalSearchTarget(result = {}) {
  const type = String(result.type ?? "").trim();
  const id = String(result.id ?? "").trim();
  if (!id) return null;
  if (type === "chapter") return { kind: "chapter", type, id, module: "editor" };
  const target = entityTargets[type];
  if (!target) return null;
  return {
    kind: "entity",
    type,
    id,
    module: target.module,
    entity: target.entity,
    apiPath: `/api/${target.resource}/${encodeURIComponent(id)}`
  };
}
