const STREAMING_CHARACTERS_PER_FRAME = 1;
const FINISHING_CHARACTERS_PER_FRAME = 2;

export function streamTypewriterBatchSize(pendingCharacters, finishing = false) {
  const pending = Math.max(0, Math.floor(Number(pendingCharacters) || 0));
  if (pending === 0) return 0;
  const maximum = finishing ? FINISHING_CHARACTERS_PER_FRAME : STREAMING_CHARACTERS_PER_FRAME;
  return Math.min(pending, maximum);
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
  let finishing = false;

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
        : streamTypewriterBatchSize(pendingCharacters.length, finishing);
      visibleCharacters.push(...pendingCharacters.splice(0, batchSize));
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
      finishing = true;
      schedule();
      return new Promise((resolve) => idleResolvers.push(resolve));
    },
    reveal() {
      if (scheduledFrame !== null) {
        cancelFrame(scheduledFrame);
        scheduledFrame = null;
      }
      visibleCharacters.push(...pendingCharacters.splice(0));
      finishing = false;
      render();
      resolveIdle();
      return snapshot();
    }
  };
}
