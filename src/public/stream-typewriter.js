const DEFAULT_FINISH_FRAMES = 36;
const DEFAULT_BACKLOG_FRAMES = 18;

export function streamTypewriterBatchSize(pendingCharacters, finishingFrames = null) {
  const pending = Math.max(0, Math.floor(Number(pendingCharacters) || 0));
  if (pending === 0) return 0;
  const targetFrames = finishingFrames === null
    ? DEFAULT_BACKLOG_FRAMES
    : Math.max(1, Math.floor(Number(finishingFrames) || 1));
  return Math.max(1, Math.ceil(pending / targetFrames));
}

export function createStreamTypewriter({
  onRender,
  scheduleFrame = (callback) => window.requestAnimationFrame(callback),
  cancelFrame = (handle) => window.cancelAnimationFrame(handle),
  reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
}) {
  if (typeof onRender !== "function") throw new TypeError("onRender must be a function");

  const visibleCharacters = [];
  const pendingCharacters = [];
  const idleResolvers = [];
  let scheduledFrame = null;
  let finishingFrames = null;

  const snapshot = () => visibleCharacters.join("");
  const resolveIdle = () => {
    if (pendingCharacters.length || scheduledFrame !== null) return;
    const value = snapshot();
    for (const resolve of idleResolvers.splice(0)) resolve(value);
  };
  const render = () => {
    onRender(snapshot(), {
      visibleCharacters: visibleCharacters.length,
      pendingCharacters: pendingCharacters.length
    });
  };
  const schedule = () => {
    if (scheduledFrame !== null || pendingCharacters.length === 0) return;
    scheduledFrame = scheduleFrame(() => {
      scheduledFrame = null;
      const batchSize = reducedMotion
        ? pendingCharacters.length
        : streamTypewriterBatchSize(pendingCharacters.length, finishingFrames);
      visibleCharacters.push(...pendingCharacters.splice(0, batchSize));
      if (finishingFrames !== null) finishingFrames = Math.max(1, finishingFrames - 1);
      render();
      if (pendingCharacters.length) schedule();
      else resolveIdle();
    });
  };

  return {
    append(value) {
      const characters = Array.from(String(value ?? ""));
      if (!characters.length) return;
      pendingCharacters.push(...characters);
      schedule();
    },
    finish() {
      if (!pendingCharacters.length && scheduledFrame === null) return Promise.resolve(snapshot());
      finishingFrames = reducedMotion ? 1 : DEFAULT_FINISH_FRAMES;
      schedule();
      return new Promise((resolve) => idleResolvers.push(resolve));
    },
    reveal() {
      if (scheduledFrame !== null) {
        cancelFrame(scheduledFrame);
        scheduledFrame = null;
      }
      visibleCharacters.push(...pendingCharacters.splice(0));
      finishingFrames = null;
      render();
      resolveIdle();
      return snapshot();
    }
  };
}
