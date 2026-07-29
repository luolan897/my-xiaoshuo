import { describe, expect, it } from "vitest";
import { buildVditorLineNumberRows, normalizeVditorLineRects } from "../../src/public/vditor-line-number-layout.js";

describe("Vditor 行号布局", () => {
  it("合并同一视觉行中的多个文本片段", () => {
    expect(normalizeVditorLineRects([
      { top: 10, height: 22 },
      { top: 10.8, height: 22.5 },
      { top: 34, height: 22 }
    ])).toEqual([
      { top: 10, height: 22.5 },
      { top: 34, height: 22 }
    ]);
  });

  it("按自动换行的视觉行位置生成行号行盒，并填充段落空行", () => {
    expect(buildVditorLineNumberRows([
      { top: 10.5, height: 22.5 },
      { top: 34.5, height: 22.5 },
      { top: 74.5, height: 22.5 },
      { top: 98.5, height: 22.5 }
    ], { lineHeight: 24, blankLineCount: 1 })).toEqual([
      { top: 9.75, height: 24, blank: false },
      { top: 33.75, height: 24, blank: false },
      { top: 57.75, height: 24, blank: true },
      { top: 73.75, height: 24, blank: false },
      { top: 97.75, height: 24, blank: false }
    ]);
  });

  it("空编辑区至少保留一个与编辑器行高一致的行号行盒", () => {
    expect(buildVditorLineNumberRows([], { lineHeight: 24 })).toEqual([{ top: 0, height: 24, blank: true }]);
  });
});
