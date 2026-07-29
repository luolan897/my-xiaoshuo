import { describe, expect, it } from "vitest";
import { createStreamTypewriter, streamTypewriterBatchSize } from "../../src/public/stream-typewriter.js";
// @ts-expect-error 浏览器端 Markdown 模块没有单独的类型声明，测试仅调用纯函数导出。
import { renderMarkdown } from "../../src/public/markdown.js";

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

  it("逐帧解析复杂 Markdown 并在完成时渲染为真实表格", async () => {
    const frames = manualFrames();
    const renderedFrames: string[] = [];
    const markdown = [
      "### 航行状态",
      "",
      "| 舰船 | 状态 | 备注 |",
      "| :--- | :---: | ---: |",
      "| 远航号 | **跃迁完成** | `冷却 12h` |",
      "| 归潮号 | 检修中 | 引擎\\|护盾 |",
      "",
      "- 表格后列表仍然可用",
      "",
      "```txt",
      "航线已锁定",
      "```"
    ].join("\n");
    const typewriter = createStreamTypewriter({
      onRender: (text) => renderedFrames.push(renderMarkdown(text)),
      scheduleFrame: frames.schedule,
      cancelFrame: frames.cancel,
      reducedMotion: false
    });

    typewriter.append(markdown.slice(0, 42));
    frames.runNext();
    typewriter.append(markdown.slice(42));
    const completed = typewriter.finish();
    frames.runAll();

    await expect(completed).resolves.toBe(markdown);
    expect(renderedFrames.length).toBeGreaterThan(2);
    expect(renderedFrames.some((html) => !html.includes("<table>"))).toBe(true);
    expect(renderedFrames.some((html) => html.includes("<table>"))).toBe(true);
    expect(renderedFrames.at(-1)).toContain('<div class="markdown-table-scroll" role="region" aria-label="Markdown 表格" tabindex="0">');
    expect(renderedFrames.at(-1)).toContain("<thead><tr>");
    expect(renderedFrames.at(-1)).toContain('<tbody><tr><td class="markdown-align-left">远航号</td>');
    expect(renderedFrames.at(-1)).toContain('<td class="markdown-align-center"><strong>跃迁完成</strong></td>');
    expect(renderedFrames.at(-1)).toContain('<td class="markdown-align-right"><code>冷却 12h</code></td>');
    expect(renderedFrames.at(-1)).toContain('<td class="markdown-align-right">引擎|护盾</td>');
    expect(renderedFrames.at(-1)).toContain("<ul><li");
    expect(renderedFrames.at(-1)).toContain('<pre><code class="language-txt">航线已锁定</code></pre>');
  });
});
