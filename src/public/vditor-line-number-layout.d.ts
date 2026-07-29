export type VditorLineRect = {
  top: number;
  height: number;
};

export type VditorLineNumberRow = VditorLineRect & {
  blank: boolean;
};

export function normalizeVditorLineRects(rects: VditorLineRect[], tolerance?: number): VditorLineRect[];
export function buildVditorLineNumberRows(
  rects: VditorLineRect[],
  options?: { lineHeight?: number; blankLineCount?: number }
): VditorLineNumberRow[];
