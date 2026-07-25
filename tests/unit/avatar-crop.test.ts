import { describe, expect, it } from "vitest";
import {
  AVATAR_CROP_MIN_SIZE,
  AVATAR_CROP_OUTPUT_SIZE,
  clampCropRect,
  containImageRect,
  cropOutputSize,
  defaultCropRect,
  mapDisplayPointToImage,
  mapImageRectToDisplay,
  moveCropRect,
  resizeCropRect
} from "../../src/public/avatar-crop.js";

describe("头像裁剪几何", () => {
  it("默认选区取居中最大正方形", () => {
    expect(defaultCropRect(800, 600)).toEqual({ x: 100, y: 0, size: 600 });
    expect(defaultCropRect(400, 800)).toEqual({ x: 0, y: 200, size: 400 });
    expect(defaultCropRect(0, 10)).toEqual({ x: 0, y: 0, size: 0 });
  });

  it("钳制选区不越界且保持最小边长", () => {
    expect(clampCropRect({ x: -20, y: -10, size: 900 }, 400, 300)).toEqual({ x: 0, y: 0, size: 300 });
    expect(clampCropRect({ x: 350, y: 250, size: 80 }, 400, 300)).toEqual({ x: 320, y: 220, size: 80 });
    expect(clampCropRect({ x: 0, y: 0, size: 8 }, 400, 300).size).toBe(AVATAR_CROP_MIN_SIZE);
  });

  it("平移与四角缩放保持正方形", () => {
    const base = { x: 100, y: 80, size: 120 };
    expect(moveCropRect(base, 40, -30, 400, 300)).toEqual({ x: 140, y: 50, size: 120 });
    expect(moveCropRect(base, 1000, 1000, 400, 300)).toEqual({ x: 280, y: 180, size: 120 });

    expect(resizeCropRect(base, "se", 280, 260, 400, 300)).toEqual({ x: 100, y: 80, size: 180 });
    expect(resizeCropRect(base, "nw", 60, 40, 400, 300)).toEqual({ x: 60, y: 40, size: 160 });
    expect(resizeCropRect(base, "ne", 280, 40, 400, 300)).toEqual({ x: 100, y: 20, size: 180 });
    expect(resizeCropRect(base, "sw", 40, 260, 400, 300)).toEqual({ x: 40, y: 80, size: 180 });
  });

  it("显示矩形与坐标映射保持一致", () => {
    const display = containImageRect(800, 600, 400, 400);
    expect(display.scale).toBeCloseTo(0.5);
    expect(display.width).toBeCloseTo(400);
    expect(display.height).toBeCloseTo(300);
    expect(display.x).toBeCloseTo(0);
    expect(display.y).toBeCloseTo(50);

    const imagePoint = mapDisplayPointToImage({ x: 100, y: 110 }, display);
    expect(imagePoint.x).toBeCloseTo(200);
    expect(imagePoint.y).toBeCloseTo(120);

    const shown = mapImageRectToDisplay({ x: 100, y: 50, size: 200 }, display);
    expect(shown.x).toBeCloseTo(50);
    expect(shown.y).toBeCloseTo(75);
    expect(shown.size).toBeCloseTo(100);
  });

  it("输出边长不超过选区与上限", () => {
    expect(cropOutputSize(800)).toBe(AVATAR_CROP_OUTPUT_SIZE);
    expect(cropOutputSize(128)).toBe(128);
    expect(cropOutputSize(0)).toBe(1);
  });
});
