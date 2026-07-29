export type StreamTypewriterProgress = {
  visibleCharacters: number;
  pendingCharacters: number;
};

export type StreamTypewriter = {
  append(value: unknown): void;
  finish(): Promise<string>;
  reveal(): string;
};

export function streamTypewriterBatchSize(pendingCharacters: number, finishingFrames?: number | null): number;

export function createStreamTypewriter<FrameHandle = number>(options: {
  onRender: (text: string, progress: StreamTypewriterProgress) => void;
  scheduleFrame?: (callback: () => void) => FrameHandle;
  cancelFrame?: (handle: FrameHandle) => void;
  reducedMotion?: boolean;
}): StreamTypewriter;
