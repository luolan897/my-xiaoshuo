export type CropRect = {
  x: number;
  y: number;
  size: number;
};

export type DisplayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
};

export type CropHandle = "nw" | "ne" | "sw" | "se";

export const AVATAR_CROP_OUTPUT_SIZE: number;
export const AVATAR_CROP_MIN_SIZE: number;

export function defaultCropRect(imageWidth: number, imageHeight: number): CropRect;
export function clampCropRect(
  rect: Partial<CropRect> | null | undefined,
  imageWidth: number,
  imageHeight: number,
  minSize?: number
): CropRect;
export function moveCropRect(
  rect: Partial<CropRect> | null | undefined,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number
): CropRect;
export function resizeCropRect(
  rect: Partial<CropRect> | null | undefined,
  handle: CropHandle | string,
  pointerX: number,
  pointerY: number,
  imageWidth: number,
  imageHeight: number
): CropRect;
export function containImageRect(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): DisplayRect;
export function mapDisplayPointToImage(
  point: { x: number; y: number },
  displayRect: DisplayRect
): { x: number; y: number };
export function mapImageRectToDisplay(cropRect: CropRect, displayRect: DisplayRect): {
  x: number;
  y: number;
  size: number;
};
export function cropOutputSize(cropSize: number, maxSize?: number): number;
