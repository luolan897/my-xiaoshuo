import { describe, expect, it } from "vitest";
import { createStreamTypewriter, streamTypewriterBatchSize } from "../../src/public/stream-typewriter.js";

function manualFrames() {
  const callbacks: Array<() => void> = [];
  return {
    schedule(callback: () => void) {
      callbacks.push(callback);
      return callback;
    },
    cancel(callback: () => void) {
      const index = callbacks.indexOf(callback);
      if (index >= 0) callbacks.splice(index, 1);
    },
    runNext() {
      callbacks.shift()?.();
    },
    runAll(limit = 200) {
      let count = 0;
      while (callbacks.length && count < limit) {
        callbacks.shift()?.();
        count += 1;
      }
      return count;
    }
  };
}

describe("流式打字机", () => {
  it("逐帧显示收到的 Unicode 字符并在完成时返回全文", async () => {
    const frames = manualFrames();
    const renders: string[] = [];
    const typewriter = createStreamTypewriter({
      onRender: (text) => renders.push(text),
      scheduleFrame: frames.schedule,
      cancelFrame: frames.cancel,
      reducedMotion: false
    });

    typewriter.append("你好");
    typewriter.append("，A");
    frames.runNext();
    expect(renders).toEqual(["你"]);

    const completed = typewriter.finish();
    expect(frames.runAll()).toBeLessThanOrEqual(36);
    await expect(completed).resolves.toBe("你好，A");
    expect(renders.at(-1)).toBe("你好，A");
  });

  it("在减少动态效果时单帧显示完整内容", async () => {
    const frames = manualFrames();
    const renders: string[] = [];
    const typewriter = createStreamTypewriter({
      onRender: (text) => renders.push(text),
      scheduleFrame: frames.schedule,
      cancelFrame: frames.cancel,
      reducedMotion: true
    });

    typewriter.append("完整回复");
    const completed = typewriter.finish();
    expect(frames.runAll()).toBe(1);
    await expect(completed).resolves.toBe("完整回复");
    expect(renders).toEqual(["完整回复"]);
  });

  it("中断时立即显露所有已收到的字符并取消待处理帧", () => {
    const frames = manualFrames();
    const renders: string[] = [];
    const typewriter = createStreamTypewriter({
      onRender: (text) => renders.push(text),
      scheduleFrame: frames.schedule,
      cancelFrame: frames.cancel,
      reducedMotion: false
    });

    typewriter.append("部分回复");
    expect(typewriter.reveal()).toBe("部分回复");
    expect(frames.runAll()).toBe(0);
    expect(renders).toEqual(["部分回复"]);
  });

  it("根据积压量增加每帧字符数", () => {
    expect(streamTypewriterBatchSize(0)).toBe(0);
    expect(streamTypewriterBatchSize(4)).toBe(1);
    expect(streamTypewriterBatchSize(180)).toBe(10);
    expect(streamTypewriterBatchSize(180, 6)).toBe(30);
  });
});
