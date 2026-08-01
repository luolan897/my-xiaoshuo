import { describe, expect, it } from "vitest";
import { publicAiStreamError } from "../../src/app.js";
import { AppError } from "../../src/errors.js";

describe("publicAiStreamError", () => {
  it("保留 AppError 的公开错误码与文案", () => {
    expect(publicAiStreamError(new AppError(400, "MODEL_REQUIRED", "请选择模型", {
      failure: "missing_model",
      callId: "call_1",
      providerName: "demo",
      providerId: "provider_1",
      modelId: "gpt-test",
      modelRecordId: "model_1"
    }))).toEqual({
      code: "MODEL_REQUIRED",
      message: "请选择模型",
      status: 400,
      failure: "missing_model",
      callId: "call_1",
      providerName: "demo",
      providerId: "provider_1",
      modelId: "gpt-test",
      modelRecordId: "model_1"
    });
  });

  it("对内部 Error 使用通用文案，不透传原始 message", () => {
    expect(publicAiStreamError(new Error("ENOENT: /secret/path.sql failed at https://provider.example/v1"))).toEqual({
      code: "AI_STREAM_FAILED",
      message: "AI 流式调用失败"
    });
  });

  it("不向客户端透传服务端 AppError 中记录的底层失败详情", () => {
    expect(publicAiStreamError(new AppError(502, "AI_CALL_FAILED", "AI 调用失败", {
      failure: "ENOENT: /secret/path.sql failed at https://provider.example/v1",
      callId: "call_secret",
      providerId: "provider_1"
    }))).toEqual({
      code: "AI_CALL_FAILED",
      message: "AI 调用失败",
      status: 502,
      callId: "call_secret",
      providerId: "provider_1"
    });
  });
});
