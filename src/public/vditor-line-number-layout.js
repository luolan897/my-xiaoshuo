export function normalizeVditorLineRects(rects, tolerance = 1.5) {
  const rows = [];
  const sorted = rects
    .filter((rect) => Number.isFinite(Number(rect.top)) && Number.isFinite(Number(rect.height)) && Number(rect.height) > 0)
    .map((rect) => ({ top: Number(rect.top), height: Number(rect.height) }))
    .sort((left, right) => left.top - right.top);
  for (const rect of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current.top - rect.top) <= tolerance) {
      current.height = Math.max(current.height, rect.height);
      continue;
    }
    rows.push(rect);
  }
  return rows;
}

export function buildVditorLineNumberRows(rects, { lineHeight = 0, blankLineCount = 0 } = {}) {
  const normalizedLineHeight = Number(lineHeight) > 0 ? Number(lineHeight) : 0;
  const normalizedBlankLineCount = Math.max(0, Math.floor(Number(blankLineCount) || 0));
  const visualRows = normalizeVditorLineRects(rects);
  if (visualRows.length === 0) {
    return normalizedBlankLineCount > 0
      ? Array.from({ length: normalizedBlankLineCount }, (_, index) => ({ top: index * normalizedLineHeight, height: normalizedLineHeight, blank: true }))
      : normalizedLineHeight > 0 ? [{ top: 0, height: normalizedLineHeight, blank: true }] : [];
  }
  const rows = [];
  let remainingBlankLines = normalizedBlankLineCount;
  for (const visualRow of visualRows) {
    const height = normalizedLineHeight || visualRow.height;
    const top = visualRow.top - (height - visualRow.height) / 2;
    const previous = rows[rows.length - 1];
    if (previous && remainingBlankLines > 0 && normalizedLineHeight > 0) {
      const availableSlots = Math.max(0, Math.round((top - previous.top) / normalizedLineHeight) - 1);
      const blankLines = Math.min(remainingBlankLines, availableSlots);
      for (let index = 1; index <= blankLines; index += 1) {
        rows.push({ top: previous.top + normalizedLineHeight * index, height: normalizedLineHeight, blank: true });
      }
      remainingBlankLines -= blankLines;
    }
    rows.push({ top, height, blank: false });
  }
  const last = rows[rows.length - 1];
  let nextTop = last.top;
  while (remainingBlankLines > 0 && normalizedLineHeight > 0) {
    nextTop += normalizedLineHeight;
    rows.push({ top: nextTop, height: normalizedLineHeight, blank: true });
    remainingBlankLines -= 1;
  }
  return rows;
}
