export function formatAiMessageMeta(modelDisplayName, outputTokens, cacheHitPercent, suffix = "") {
  const modelName = String(modelDisplayName || "模型").trim();
  const tokenCount = Math.max(0, Math.round(Number(outputTokens) || 0)).toLocaleString("zh-CN");
  const cachePercent = Number(cacheHitPercent);
  const roundedCachePercent = Math.round((cachePercent + Number.EPSILON) * 10) / 10;
  const cacheLabel = Number.isFinite(cachePercent)
    ? `缓存命中 ${Math.max(0, Math.min(100, roundedCachePercent)).toLocaleString("zh-CN")}%`
    : "";
  return [modelName, `${tokenCount} tok`, cacheLabel, String(suffix || "").trim()].filter(Boolean).join(" · ");
}

export function estimateAiMessageTokens(value) {
  let wideCharacters = 0;
  let narrowCharacters = 0;
  for (const character of String(value || "")) {
    if (/[^\u0000-\u00ff]/u.test(character)) wideCharacters += 1;
    else narrowCharacters += 1;
  }
  return Math.max(1, Math.ceil(wideCharacters * 1.1 + narrowCharacters / 4));
}
