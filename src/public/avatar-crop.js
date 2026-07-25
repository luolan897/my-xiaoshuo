/** 头像裁剪输出边长上限（像素） */
export const AVATAR_CROP_OUTPUT_SIZE = 512;

/** 选区最小边长（原图像素） */
export const AVATAR_CROP_MIN_SIZE = 32;

/**
 * @typedef {{ x: number, y: number, size: number }} CropRect
 * @typedef {{ x: number, y: number, width: number, height: number, scale: number }} DisplayRect
 */

function finitePositive(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * 在图片内取居中最大正方形作为默认选区。
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {CropRect}
 */
export function defaultCropRect(imageWidth, imageHeight) {
  const width = Math.max(0, Math.floor(finitePositive(imageWidth)));
  const height = Math.max(0, Math.floor(finitePositive(imageHeight)));
  const size = Math.min(width, height);
  if (size < 1) return { x: 0, y: 0, size: 0 };
  return {
    x: Math.floor((width - size) / 2),
    y: Math.floor((height - size) / 2),
    size
  };
}

/**
 * 将正方形选区钳制在图片范围内。
 * @param {Partial<CropRect>} rect
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @param {number} [minSize]
 * @returns {CropRect}
 */
export function clampCropRect(rect, imageWidth, imageHeight, minSize = AVATAR_CROP_MIN_SIZE) {
  const width = Math.max(0, Math.floor(finitePositive(imageWidth)));
  const height = Math.max(0, Math.floor(finitePositive(imageHeight)));
  if (width < 1 || height < 1) return { x: 0, y: 0, size: 0 };

  const maxSize = Math.min(width, height);
  const floorMin = Math.max(1, Math.min(Math.floor(finitePositive(minSize)) || 1, maxSize));
  let size = Math.floor(finitePositive(rect?.size));
  if (size < floorMin) size = floorMin;
  if (size > maxSize) size = maxSize;

  let x = Math.floor(Number(rect?.x) || 0);
  let y = Math.floor(Number(rect?.y) || 0);
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x > width - size) x = width - size;
  if (y > height - size) y = height - size;
  return { x, y, size };
}

/**
 * 平移选区。
 * @param {CropRect} rect
 * @param {number} deltaX
 * @param {number} deltaY
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {CropRect}
 */
export function moveCropRect(rect, deltaX, deltaY, imageWidth, imageHeight) {
  return clampCropRect({
    x: (Number(rect?.x) || 0) + (Number(deltaX) || 0),
    y: (Number(rect?.y) || 0) + (Number(deltaY) || 0),
    size: rect?.size
  }, imageWidth, imageHeight);
}

/**
 * 从四角手柄调整正方形选区，对边角保持固定。
 * @param {CropRect} rect
 * @param {"nw"|"ne"|"sw"|"se"} handle
 * @param {number} pointerX 原图像素坐标
 * @param {number} pointerY 原图像素坐标
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {CropRect}
 */
export function resizeCropRect(rect, handle, pointerX, pointerY, imageWidth, imageHeight) {
  const current = clampCropRect(rect, imageWidth, imageHeight);
  const left = current.x;
  const top = current.y;
  const right = current.x + current.size;
  const bottom = current.y + current.size;
  const px = Number(pointerX) || 0;
  const py = Number(pointerY) || 0;

  let nextLeft = left;
  let nextTop = top;
  let nextRight = right;
  let nextBottom = bottom;

  if (handle === "nw") {
    nextLeft = px;
    nextTop = py;
  } else if (handle === "ne") {
    nextRight = px;
    nextTop = py;
  } else if (handle === "sw") {
    nextLeft = px;
    nextBottom = py;
  } else {
    nextRight = px;
    nextBottom = py;
  }

  const widthSpan = Math.abs(nextRight - nextLeft);
  const heightSpan = Math.abs(nextBottom - nextTop);
  const size = Math.max(widthSpan, heightSpan);

  if (handle === "nw") {
    return clampCropRect({ x: right - size, y: bottom - size, size }, imageWidth, imageHeight);
  }
  if (handle === "ne") {
    return clampCropRect({ x: left, y: bottom - size, size }, imageWidth, imageHeight);
  }
  if (handle === "sw") {
    return clampCropRect({ x: right - size, y: top, size }, imageWidth, imageHeight);
  }
  return clampCropRect({ x: left, y: top, size }, imageWidth, imageHeight);
}

/**
 * 计算 object-fit: contain 时图片在视口中的显示矩形。
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @returns {DisplayRect}
 */
export function containImageRect(imageWidth, imageHeight, viewportWidth, viewportHeight) {
  const width = finitePositive(imageWidth);
  const height = finitePositive(imageHeight);
  const viewW = finitePositive(viewportWidth);
  const viewH = finitePositive(viewportHeight);
  if (!width || !height || !viewW || !viewH) {
    return { x: 0, y: 0, width: 0, height: 0, scale: 0 };
  }
  const scale = Math.min(viewW / width, viewH / height);
  const displayWidth = width * scale;
  const displayHeight = height * scale;
  return {
    x: (viewW - displayWidth) / 2,
    y: (viewH - displayHeight) / 2,
    width: displayWidth,
    height: displayHeight,
    scale
  };
}

/**
 * 视口坐标映射到原图像素坐标。
 * @param {{ x: number, y: number }} point
 * @param {DisplayRect} displayRect
 * @returns {{ x: number, y: number }}
 */
export function mapDisplayPointToImage(point, displayRect) {
  const scale = finitePositive(displayRect?.scale);
  if (!scale) return { x: 0, y: 0 };
  return {
    x: ((Number(point?.x) || 0) - (Number(displayRect.x) || 0)) / scale,
    y: ((Number(point?.y) || 0) - (Number(displayRect.y) || 0)) / scale
  };
}

/**
 * 原图选区映射到视口显示矩形。
 * @param {CropRect} cropRect
 * @param {DisplayRect} displayRect
 * @returns {{ x: number, y: number, size: number }}
 */
export function mapImageRectToDisplay(cropRect, displayRect) {
  const scale = finitePositive(displayRect?.scale);
  return {
    x: (Number(displayRect?.x) || 0) + (Number(cropRect?.x) || 0) * scale,
    y: (Number(displayRect?.y) || 0) + (Number(cropRect?.y) || 0) * scale,
    size: (Number(cropRect?.size) || 0) * scale
  };
}

/**
 * 裁剪输出边长：不超过原选区，也不超过上限。
 * @param {number} cropSize
 * @param {number} [maxSize]
 * @returns {number}
 */
export function cropOutputSize(cropSize, maxSize = AVATAR_CROP_OUTPUT_SIZE) {
  const size = Math.max(1, Math.floor(finitePositive(cropSize)) || 1);
  const limit = Math.max(1, Math.floor(finitePositive(maxSize)) || AVATAR_CROP_OUTPUT_SIZE);
  return Math.min(size, limit);
}
