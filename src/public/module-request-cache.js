export function createModuleRequestCache() {
  const scopes = new Map();

  const scopeKey = (workId, module) => `${String(workId)}\u0000${String(module)}`;
  const cloneResult = (value) => structuredClone(value);

  function request(workId, module, requestKey, loader, { refresh = false } = {}) {
    const key = scopeKey(workId, module);
    let scope = scopes.get(key);
    if (!scope) {
      scope = new Map();
      scopes.set(key, scope);
    }
    if (refresh) scope.delete(requestKey);
    if (scope.has(requestKey)) return scope.get(requestKey).then(cloneResult);

    const pending = Promise.resolve().then(loader);
    scope.set(requestKey, pending);
    pending.catch(() => {
      if (scope.get(requestKey) === pending) scope.delete(requestKey);
      if (scope.size === 0) scopes.delete(key);
    });
    return pending.then(cloneResult);
  }

  function invalidate(workId, module) {
    scopes.delete(scopeKey(workId, module));
  }

  function clear() {
    scopes.clear();
  }

  return { request, invalidate, clear };
}
