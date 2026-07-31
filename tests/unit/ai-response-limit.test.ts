import { describe, expect, it } from "vitest";
import { AppError } from "../../src/errors.js";
import { AI_RESPONSE_MAX_BYTES, readResponseTextLimited } from "../../src/ai.js";

describe("readResponseTextLimited", () => {
  it("读取未超限的响应正文", async () => {
    const response = new Response("hello-ai", {
      status: 200,
      headers: { "content-type": "text/plain", "content-length": "8" }
    });
    await expect(readResponseTextLimited(response)).resolves.toBe("hello-ai");
  });

  it("在 Content-Length 声明超限时直接拒绝", async () => {
    const response = new Response("ignored", {
      status: 200,
      headers: { "content-length": String(AI_RESPONSE_MAX_BYTES + 1) }
    });
    await expect(readResponseTextLimited(response, 64)).rejects.toMatchObject({
      code: "AI_RESPONSE_TOO_LARGE"
    } satisfies Partial<AppError>);
  });

  it("在流式读取过程中超过字节上限时中止", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("abcdefghij"));
        controller.enqueue(encoder.encode("klmnopqrst"));
        controller.close();
      }
    });
    const response = new Response(stream, { status: 200 });
    await expect(readResponseTextLimited(response, 12)).rejects.toMatchObject({
      code: "AI_RESPONSE_TOO_LARGE"
    } satisfies Partial<AppError>);
  });
});
