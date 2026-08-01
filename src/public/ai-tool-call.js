export function formatAiToolCallResult(result) {
  const text = JSON.stringify(result ?? {}, null, 2);
  return { text, characterCount: text.length };
}
