# AI 供应商兼容性与配置

本文记录叙界（Scriverse）当前已经验证的 OpenAI Chat Completions、Anthropic Messages 兼容服务商、配置填写方式和已知差异。

验证日期：2026-07-26。

## 通用填写规则

在 AI 管理中分别填写供应商和模型：

- 先选择接口协议。OpenAI Chat Completions 会自动追加 `/chat/completions`；Anthropic Messages 会自动补全 `/v1/messages`。
- 供应商地址可以填写基础地址，也可以填写完整端点；系统会规范化已知的末尾资源路径。
- API 密钥只填写密钥本身，不要带 `Bearer ` 前缀。
- 模型标识符必须填写供应商 API 接受的精确值，不要复制其他客户端附加的上下文或路由标记。
- 保存供应商后先点击“测试连接”，确认 `/models` 请求成功，再启用模型或设置任务默认模型。
- `max_tokens` 应根据模型上下文窗口设置。上下文较长或模型推理较慢时，不要把输出上限设置得过大。

## 已验证配置

| 供应商 | 协议与基础地址 | 模型标识符 | 验证内容 |
| --- | --- | --- | --- |
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-pro`、`deepseek-v4-flash` | 支持普通请求、Thinking、SSE 流式和工具调用 |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `Qwen/Qwen3-8B` | 普通请求、Thinking、SSE 流式、工具调用和项目自身调用链 |
| LongCat | OpenAI：`https://api.longcat.chat/openai/v1`；Anthropic：`https://api.longcat.chat/anthropic` | `LongCat-2.0` | Chat Completions；Messages 普通响应、Thinking、SSE 和工具格式自动化测试 |
| Kimi Coding | `https://api.kimi.com/coding/v1` | `kimi-for-coding`、`kimi-for-coding-highspeed` | 普通请求、Thinking、SSE 流式和工具调用；默认温度为 1 |

### DeepSeek

推荐填写：

```text
显示名称：DeepSeek
Chat Completions 基础地址：https://api.deepseek.com
模型标识符：deepseek-v4-pro
模型上下文总量：按 DeepSeek 官方模型信息填写
默认 max_tokens：建议从 8192 或更低开始
Thinking：开启
```

不要把其他客户端的以下协议地址或模型标记直接填写到本项目：

```text
https://api.deepseek.com/anthropic
deepseek-v4-pro[1m]
```

前者必须配合 Anthropic Messages 协议使用，不能作为 OpenAI Chat Completions 地址；后者包含客户端上下文标记，DeepSeek OpenAI 接口只接受 `deepseek-v4-pro` 或 `deepseek-v4-flash`。

官方资料：[首次 API 调用](https://api-docs.deepseek.com/guides/reasoning_model)、[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)、[工具调用](https://api-docs.deepseek.com/guides/tool_calls/)。

### SiliconFlow

推荐填写：

```text
显示名称：硅基流动
Chat Completions 基础地址：https://api.siliconflow.cn/v1
模型标识符：Qwen/Qwen3-8B
模型上下文总量：按硅基流动模型页面填写
默认 max_tokens：建议从 8192 或更低开始
Thinking：按需要开启
```

硅基流动官方 Qwen3 参数名是 `enable_thinking`，并返回 `reasoning_content`。本项目当前对非 Gemini 供应商发送通用 `thinking` 字段；该配置已用 Qwen/Qwen3-8B 实际验证通过，包括流式输出和工具调用。

官方资料：[Chat Completions](https://docs.siliconflow.cn/en/api-reference/chat-completions/chat-completions)、[快速开始](https://docs.siliconflow.cn/en/userguide/quickstart)、[流式输出](https://docs.siliconflow.cn/cn/faqs/stream-mode)。

### LongCat

推荐填写：

```text
显示名称：LongCat
接口协议：Anthropic Messages
API 基础地址：https://api.longcat.chat/anthropic
模型标识符：LongCat-2.0
Thinking：开启
```

Anthropic 配置会调用 `https://api.longcat.chat/anthropic/v1/messages`，并携带 `Authorization: Bearer`、`x-api-key` 与 `anthropic-version: 2023-06-01`。LongCat 的模型列表位于根级 `/v1/models`；连接测试会在协议路径未提供模型列表时自动回退到该地址。

若要继续使用 OpenAI 格式，请把接口协议改为 OpenAI Chat Completions，并填写 `https://api.longcat.chat/openai/v1`。

官方资料：[API 概述](https://longcat.chat/platform/docs/APIDocs.html)、[Anthropic Messages](https://longcat.chat/platform/docs/api/messages)、[中文快速开始](https://longcat.chat/platform/docs/zh/)。

### Kimi Coding

推荐填写：

```text
显示名称：Kimi Coding
Chat Completions 基础地址：https://api.kimi.com/coding/v1
模型标识符：kimi-for-coding
模型上下文总量：按 Kimi 官方模型信息填写
默认 max_tokens：建议从 8192 或更低开始
默认温度：1
Thinking：开启
```

本项目会在模型标识符包含 `kimi` 且未填写有效温度时默认填入 `1`，并在前端显示提示。温度仍可手动修改；Kimi Coding 接口对不支持的温度值会返回参数错误。

官方资料：[Kimi Code 第三方 Agent 配置](https://www.kimi.com/help/kimi-code/third-party-agents)、[Kimi OpenAI 兼容接口](https://platform.kimi.com/docs/guide/migrating-from-openai-to-kimi)。

### Gemini OpenAI 兼容接口

Gemini 的 OpenAI 兼容地址通常为：

```text
Chat Completions 基础地址：https://generativelanguage.googleapis.com/v1beta/openai/
模型标识符：gemini-2.5-flash、gemini-3-flash-preview 等实际可用模型名
```

Gemini 不接受本项目原先通用发送的 `thinking` 字段。本项目现在会在供应商地址包含 `gemini` 或 `generativelanguage.googleapis.com`，或者模型标识符包含 `gemini` 时，自动省略该字段。Gemini 的 Thinking 参数应使用其官方支持的 `reasoning_effort` 或 Google 专用 `thinking_config`。

本项目目前只省略 Gemini 不支持的 `thinking` 字段，Gemini 专用 Thinking 参数仍需按官方接口单独配置。

官方资料：[Gemini OpenAI 兼容性](https://ai.google.dev/gemini-api/docs/openai)。

### Google Vertex

Google Vertex 是独立协议选项，使用 Vertex 的 OpenAI 兼容端点，但鉴权为 GCP 服务账号 JSON（不是 AI Studio API Key，也不需要在叙界侧配置 OAuth 回调）。

推荐填写：

```text
显示名称：Google Vertex
接口协议：Google Vertex
API 基础地址：https://aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/global/endpoints/openapi
服务账号 JSON：粘贴完整 JSON（含 type、client_email、private_key）
模型标识符：google/gemini-2.0-flash-001 等 Vertex 实际模型名
```

说明：

- 将 `PROJECT_ID` 换成你的 GCP 项目 ID；如使用区域端点，也可写成 `https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/openapi`。
- 服务账号需具备调用 Vertex AI 的权限（例如 Vertex AI User）。
- 叙界会用服务账号私钥向 `https://oauth2.googleapis.com/token` 换取短期 access token，再以 Bearer 调用 Vertex；请求体仍为 OpenAI Chat Completions 形状，并自动省略通用 `thinking` 字段。
- 若上游 `/models` 不可用，可先添加本地模型后再点“测试连接”。

官方资料：[Vertex OpenAI 兼容](https://cloud.google.com/vertex-ai/generative-ai/docs/start/openai)、[服务账号](https://cloud.google.com/iam/docs/service-account-overview)。

## 已知兼容性边界

OpenAI Chat Completions 适配读取以下响应字段：

- 普通响应：`choices[0].message.content`
- Thinking 响应：`choices[0].message.reasoning_content`
- 工具调用：`choices[0].message.tool_calls`
- 流式响应：SSE 的 `data:` 数据、`delta.content`、`delta.reasoning_content` 和 `[DONE]`

Anthropic Messages 适配会把系统消息移到顶层 `system`，转换工具定义，并处理 `text`、`thinking`、`tool_use`、`tool_result` 内容块和 Messages SSE 事件。工具调用后的 thinking 签名会原样回传，以满足多轮工具调用要求。

不同供应商的扩展参数并不通用。当前 Gemini（含 Google Vertex 协议与 AI Studio OpenAI 兼容地址）会跳过 `thinking`；LongCat Messages 使用其官方支持的 `{"type":"enabled"}` 或 `{"type":"disabled"}`。其他 Anthropic Messages 供应商默认不注入 thinking 参数，避免不同 Claude 模型的手动预算与自适应思考模式冲突。新增供应商时，应至少验证普通请求、流式请求、关闭 Thinking 和工具调用四条路径。

如果看到 `This operation was aborted`，优先检查基础地址、模型标识符、浏览器是否中断了 SSE，以及请求是否超过项目当前的上游超时；不要先把它判断为 OpenAI 协议不兼容。
