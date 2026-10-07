# Leonardo Video 开发与验证

[返回使用指南](../README.md) · [审阅依据](SOURCES.md)

## 本地测试

从仓库根目录运行，需要 Node.js 18 或更高版本，无需安装 npm 依赖：

```bash
cd video/leonardo
node --check plugin.js
node tests/test.mjs
# 或 npm test
```

当前有 159 项合成测试，包含 tests/golden.json 的 20 个 fixture。测试不会访问网络或消耗上游额度；每次运行更新 tests/test-results.json。tests/test-output.txt 保存本次验证的逐项输出。

厂商 `api_key` 模式的 fixture 使用原始 `apiKey` / `authHeader`，不能预先给宿主输入添加 Bearer 前缀。鉴权测试覆盖提交与查询、回退字段、已有前缀、渠道密钥优先级和非法凭据。协议 fixture 通过 `hook: "protocols"` 与 `path: ["openai_video", "decodeRequest" | "render"]` 调用嵌套钩子；公开 TaskView 不包含私有 state，标准身份字段由宿主覆盖。

## 实际宿主检查

在插件目录、使用目标 New API 二进制运行：

```bash
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture tests/golden.json
```

Docker 部署需将插件与 fixture 复制到容器，按容器内实际路径执行。本地 V8 测试不代表宿主引擎兼容认证，也不替代宿主生命周期和真实 Leonardo API 验收。审阅的官方 rc.41 提交 `2035a82aeb5414253a728bd937d4b8f97aa99b9b` 使用 moejs；此前文档将其称为 Goja 不准确。官方发布程序下载超时，实际 CLI 验证尚未完成。付费联调步骤见[使用指南](../README.md#45-一次完整的显式付费测试)。

## 文件维护

- plugin.js 是运行入口；市场安装还读取独立 icon.png，手动安装需另外选择图标。tests/、scripts/、docs/ 只服务于验证和维护。
- 修改路径时同步更新 package.json、测试导入和使用指南中的命令。
- 更新 tests/test-output.txt 时保留实际执行输出，不手工修改测试结论。
- 修改交付文件后更新 SHA256SUMS.txt；条目均相对于 video/leonardo/，覆盖本目录所有已跟踪文件（校验清单自身除外）。校验以 Git 中的 LF 文本内容为准。
- 更新兼容性声明时，在 SOURCES.md 记录所依据的宿主版本与审阅日期。

## 内部实现

### 提交

```text
OpenAI 风格参数
  → decodeRequest 规范化、白名单校验
  → buildSubmitRequest 构造请求描述符
  → New API 执行 POST /api/rest/v2/generations
  → parseSubmitResponse 保存 generationId 和私有请求状态
  → New API 返回自己的公开任务 ID
```

插件不是 Node 服务，不能直接执行 fetch。同步 JS 钩子只返回描述符，宿主负责 HTTP、数据库、轮询和结算。[S1][S2][S3]

0.2.0 的图片 URL 直接映射成 `parameters.guidances.*[].image = {type:"URL",url}`；支持 OSS 签名地址并保留原始查询串。网关只调用 Leonardo，图片下载由 Leonardo 执行；不添加 allowedHosts，也不需要多步上传钩子。图片 URL 语法检查只是输入约束，不执行 DNS 探测。

`input_reference` 与 `start_frame` 同时出现时报错；`reference_images` 不与帧输入混用。H3 使用明确的尺寸白名单和固定 TURBO，不传未验证的 seed/negative_prompt。用量事实仍为 seconds、resolution、generate_audio；H3 增加分辨率枚举，需独立配置模型价格。

提交成功后删除图片引用再保存请求状态，防止 OSS 签名出现在插件产生的 taskData/state。state 中使用实际上游模型 ID 进行后续参数校验，公开模型仍由宿主维护，旧版 Veo 任务状态保持可读。

### 查询

```text
GET /api/rest/v1/generations/{Leonardo-generationId}
```

不是从创建地址自行推导的 v2 查询路径。[S8]

状态映射：

| Leonardo | 插件 |
|---|---|
| `PENDING` | `QUEUED`，进度 0% |
| `COMPLETE` 且存在可用视频 | `SUCCESS`，进度 100% |
| `FAILED` | `FAILURE` |
| 未知状态/缺字段/任务 ID 不匹配 | `UNKNOWN` |

没有伪造中间百分比。`COMPLETE` 后缺少 MP4 最多观察三次；仍缺少则失败，不把封面当视频，也不永远轮询。这个三次限制是本插件的策略。[S9]

### 下载

唯一采用的视频地址：

```text
generations_by_pk.generated_images[].motionMP4URL
```

不使用同条结果里的图片 `url`。对标记 `nsfw=true` 的输出不提供视频。下载描述符采用 `credentialless:true`，不添加任何 header/body，更不会把 Leonardo/New API 的 Bearer Key 发给 CDN。宿主仍必须执行 DNS/IP 和重定向的 SSRF 检查；插件的 URL 语法过滤不能替代宿主检查。[S7][S11]


引用编号见[审阅依据](SOURCES.md)。
