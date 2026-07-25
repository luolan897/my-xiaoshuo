import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Runtime } from "../../src/app.js";
import { createTestRuntime } from "../helpers.js";

describe("AI 分析全流程追踪", () => {
  let runtime: Runtime | null = null;

  afterEach(() => {
    runtime?.close();
    runtime = null;
  });

  it("保存每轮完整 Prompt、模型响应与工具执行结果", async () => {
    let completionRound = 0;
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input).endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: "trace-model" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      completionRound += 1;
      if (completionRound === 1) {
        return new Response(JSON.stringify({
          choices: [{
            finish_reason: "tool_calls",
            message: {
              content: "先查询角色档案和正文证据。",
              reasoning_content: "需要完成两项必需查询。",
              tool_calls: [
                {
                  id: "tool-search",
                  type: "function",
                  function: { name: "search_story_entities", arguments: JSON.stringify({ query: "林舟", categories: ["character"] }) }
                },
                {
                  id: "tool-grep",
                  type: "function",
                  function: { name: "grep", arguments: JSON.stringify({ keyword: "林舟", limit: 10 }) }
                }
              ]
            }
          }],
          usage: { prompt_tokens: 120, completion_tokens: 30 }
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({
        choices: [{ finish_reason: "stop", message: { content: "<json>[]</json>", reasoning_content: "没有重复角色。" } }],
        usage: { prompt_tokens: 180, completion_tokens: 12 }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    runtime = createTestRuntime(fetchMock);

    const work = await request(runtime.app).post("/api/works").send({ title: "追踪测试作品" }).expect(201);
    const workId = work.body.data.id;
    const volume = await request(runtime.app).post(`/api/works/${workId}/volumes`).send({ title: "第一卷" }).expect(201);
    const chapter = await request(runtime.app).post(`/api/works/${workId}/chapters`).send({
      volumeId: volume.body.data.id,
      title: "第一章",
      content: "林舟在北港遇见林川，两人确认彼此并非同一个人。"
    }).expect(201);
    await request(runtime.app).post(`/api/works/${workId}/characters`).send({
      name: "林舟",
      aliases: ["阿舟"],
      firstChapterId: chapter.body.data.id
    }).expect(201);
    await request(runtime.app).post(`/api/works/${workId}/characters`).send({
      name: "林川",
      aliases: ["阿川"],
      firstChapterId: chapter.body.data.id
    }).expect(201);

    const provider = await request(runtime.app).post(`/api/works/${workId}/providers`).send({
      name: "追踪测试服务",
      baseUrl: "https://trace-ai.test/v1",
      apiKey: "sk-trace-secret",
      status: "enabled"
    }).expect(201);
    await request(runtime.app).post(`/api/providers/${provider.body.data.id}/test`).send({}).expect(200);
    const model = await request(runtime.app).post(`/api/providers/${provider.body.data.id}/models`).send({
      displayName: "追踪模型",
      modelId: "trace-model",
      purposes: ["book-analysis"]
    }).expect(201);

    const task = await request(runtime.app).post(`/api/works/${workId}/tasks`).send({
      taskType: "character-identity-audit",
      scope: { type: "book" }
    }).expect(201);
    await request(runtime.app).post(`/api/tasks/${task.body.data.id}/run`).send({
      modelId: model.body.data.id
    }).expect(200);

    const traceResponse = await request(runtime.app).get(`/api/tasks/${task.body.data.id}/trace`).expect(200);
    const trace = traceResponse.body.data;
    expect(trace).toMatchObject({ taskId: task.body.data.id, captured: true });
    expect(trace.calls).toHaveLength(1);
    expect(trace.calls[0]).toMatchObject({
      status: "completed",
      model: { displayName: "追踪模型" },
      trace: { initialMessages: expect.any(Array), rounds: expect.any(Array) }
    });
    expect(trace.calls[0].trace.initialMessages[1].content).toContain("审核角色规范表");
    expect(trace.calls[0].trace.rounds).toHaveLength(2);
    expect(trace.calls[0].trace.rounds[0]).toMatchObject({
      round: 1,
      request: {
        model: "trace-model",
        messages: expect.any(Array),
        toolChoice: "auto",
        tools: expect.any(Array)
      },
      attempts: [{
        attempt: 1,
        status: "completed",
        httpStatus: 200,
        response: { choices: [{ message: { tool_calls: expect.any(Array) } }] }
      }],
      toolExecutions: [
        { id: "tool-search", name: "search_story_entities", status: "completed" },
        { id: "tool-grep", name: "grep", status: "completed" }
      ]
    });
    expect(trace.calls[0].trace.rounds[1].request.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "assistant", tool_calls: expect.any(Array) }),
      expect.objectContaining({ role: "tool", tool_call_id: "tool-search" }),
      expect.objectContaining({ role: "tool", tool_call_id: "tool-grep" })
    ]));
    expect(JSON.stringify(trace)).not.toContain("sk-trace-secret");

    const call = runtime.database.get<Record<string, unknown>>("SELECT task_id FROM ai_calls WHERE id = ?", trace.calls[0].id);
    expect(call?.task_id).toBe(task.body.data.id);
  });

  it("历史任务没有追踪记录时返回明确的空状态", async () => {
    runtime = createTestRuntime();
    const work = await request(runtime.app).post("/api/works").send({ title: "历史追踪测试" }).expect(201);
    const task = await request(runtime.app).post(`/api/works/${work.body.data.id}/tasks`).send({
      taskType: "book-analysis",
      scope: { type: "book" }
    }).expect(201);

    const trace = await request(runtime.app).get(`/api/tasks/${task.body.data.id}/trace`).expect(200);
    expect(trace.body.data).toEqual({
      taskId: task.body.data.id,
      captured: false,
      calls: []
    });
  });
});
