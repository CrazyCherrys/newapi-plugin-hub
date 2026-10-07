# Leonardo Video — New API 第一阶段完整插件

版本：`0.1.0`；审阅日期：2026-10-06。

**目标：通过一个 New API Task Plugin，将 Leonardo 的 Veo 3.1 文生视频接入 `/v1/videos` 的异步任务流程。** 安装文件是本目录的 `plugin.js`，不是示例骨架；不需要 Node.js 服务，不需要额外上传适配服务，不修改 Go 主程序。

**验证状态：已完成 114 项本地合成测试，全部通过；没有在实际 New API 二进制/Goja 引擎中执行，也没有使用真实 Leonardo Key 付费联调。因此这是可安装、可测试的完整实现，不是已经验收的生产发布版。** 必须先在目标实例运行官方 lint/test，并完成一次真实的创建—轮询—下载测试。

## 1. 支持范围

目标宿主契约为 `QuantumNous/new-api` 的 **`v1.0.0-rc.41` Task Plugin API v1**。没有声称兼容所有较早版本；更高版本也应复测，因为 API v1 文档明确说明契约还在演进。[S1][S2]

对外由宿主管理：

```http
POST /v1/videos
GET  /v1/videos/{id}
GET  /v1/videos/{id}/content
HEAD /v1/videos/{id}/content
```

模型：

```text
veo-3.1-generate-001
veo-3.1-fast-generate-001
```

本插件刻意采用以下第一阶段白名单：

| 档位 | size | seconds |
|---|---|---|
| 720p 横屏 | `1280x720` | `4` / `6` / `8` |
| 720p 竖屏 | `720x1280` | `4` / `6` / `8` |
| 1080p 横屏 | `1920x1080` | `8` |
| 1080p 竖屏 | `1080x1920` | `8` |

默认 `seconds=8`、`size=1280x720`、`generate_audio=true`。

**1080p 只允许 8 秒是本插件的保守限制，不是对 Leonardo 所有模式限制的断言。** Leonardo 文档还列出 4K，但本版本不开放 4K，也不开放 Lite。[S4]

这次不支持：图片/视频/音频素材输入、`input_reference`、首尾帧、视频编辑/延长/remix、SSE、批量多视频、原生 Leonardo 路由、视频列表/删除，以及任意上游参数透传。JSON 和无文件的 multipart/form 均可提交文生视频。未知字段明确拒绝，而不是忽略。

## 2. 文件说明

| 文件 | 用途 |
|---|---|
| `plugin.js` | 完整插件，唯一需要上传 New API 的文件 |
| `golden.json` | 13 个 flat-hook fixture，用于官方 `new-api plugin test` |
| `test.mjs` | 本地 Node 测试，涵盖 114 项用例；含上述 fixture |
| `package.json` | 仅让本地测试识别 ES Module；没有 npm 依赖 |
| `test-results.json` | 本地测试结果，明确区分未执行的实机测试 |
| `test-output.txt` | 本地测试逐项输出 |
| `smoke_test.py` | 使用你的 New API Key，显式付费创建一次并查询、下载；Python 标准库 |
| `SOURCES.md` | 审阅依据和源码定位 |
| `SHA256SUMS.txt` | 交付文件校验值 |

本地测试不等于真实 New API runtime 测试；V8 无 Node 全局对象测试也不等于 Goja 兼容认证。

## 3. 安装与配置

### 3.1 先做本地、宿主检查

本地测试无需安装 npm 包：

```bash
cd leonardo-video-plugin
node --check plugin.js
node test.mjs
```

在实际 New API 二进制可执行的位置运行官方检查（Docker 中需要先把文件复制进实际容器；容器名、二进制路径以你的部署为准）：[S3]

```bash
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture golden.json
```

只有宿主检查成功后再创建测试渠道。fixture 只是模拟钩子参数，不会创建真实视频，不会消耗 Leonardo 额度。

### 3.2 导入插件

使用 New API Root 账户进入任务插件管理，上传本目录的 **`plugin.js`** 并启用。插件 key：

```text
leonardo-video
```

如果部署界面没有任务插件导入或 `openai_video` 能力，先确认实际运行版本，不要改用普通 OpenAI 渠道硬接。管理入口名称以你的实例为准。

### 3.3 创建渠道

| 配置 | 内容 |
|---|---|
| 渠道类型 | Task Plugin / 任务插件，类型 `61` |
| 绑定插件 | `leonardo-video` |
| Base URL | `https://cloud.leonardo.ai` |
| API Key | Leonardo 的 Production API Key；不带 `Bearer ` 前缀 |
| 模型 | 上述两个精确模型名称 |
| 分组 | 先使用仅测试用户可访问的分组 |
| 定价 | 为两个模型分别配置，见下一节 |

**Base URL 不带 `/v1`、`/api/rest/v1` 或 `/api/rest/v2`。** 插件自行拼接路径。第一阶段只接受 HTTPS origin；不支持在 Base URL 上附加路径、查询参数或账户密码。

直连 Leonardo 用类型 61，而不是“New API 上游”的类型 60。本插件声明 `upstreams:["vendor"]`，不会声称支持网关互联。[S6]

先使用一个 Leonardo Key 对应一个渠道，避免测试阶段混淆账号归属。客户端只使用 New API 用户 Key，绝不能拿 Leonardo Key 提供给下游用户。上游 Key 不写在插件代码里。[S6][S10]

第一轮不要配置模型别名。代码在 driver 层遵循 `ctx.upstreamModel || ctx.model`；后续若新增别名，除了渠道映射，还要满足插件/协议的模型声明与路由要求，不能只填任意名字就假定能路由。

### 3.4 计费

插件报告的是：

```json
{
  "seconds": 8,
  "resolution": "720p",
  "generate_audio": true
}
```

口径是**请求时长**，不是下载后测量的 MP4 实际时长，也不是 Leonardo credit 数量或美元成本。预计与完成结算使用同一请求口径。没有可恢复的完成用量时返回空对象，让宿主保留提交时冻结的事实，而不是把费用设为零。[S5]

推荐使用宿主的表达式计费。下面仅演示表达式语法，**0.10 是假设的对外每秒售价，不是 Leonardo 成本或推荐售价**：

```text
tier("standard", u("seconds") * 0.10)
```

以你自己的售价替换数值，两个模型分别设置；存在不同分辨率/音频档位售价时，还需要在宿主定价中分档，不应直接沿用统一示例价格。优先在正式放开所有参数之前验证每个档位的结算。

`extractUsage` 在宿主的 `usagePurpose="billing_ratios"` 调用下返回 `{}`，避免旧式按次定价又额外乘一次秒数。因此：

- 使用表达式定价，`u("seconds")` 才是本插件推荐的按秒方式。
- 若继续使用旧式固定单次价格，它就是固定单次价格，不会因为请求 8 秒自动变成 8 倍。
- 不要同时在多个层级重复乘时长。

New API 对用户退款，不代表 Leonardo 也退回上游费用。上游完成却没有可用 MP4、提交超时或日志解析异常，都可能产生财务差异，需要人工核对。

## 4. 调用示例

### 4.1 最小文生视频请求

```bash
export NEW_API_BASE='https://your-newapi.example'
export NEW_API_KEY='你的NewAPI用户Key'

curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE/v1/videos" \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "veo-3.1-fast-generate-001",
    "prompt": "A paper boat drifting on a quiet pond, gentle daylight, cinematic camera movement.",
    "seconds": "4",
    "size": "1280x720"
  }'
```

这是付费请求。创建成功后保存返回的 `id`，后续只查询这个 ID。**不要因为暂时没有视频而重复 POST。** 客户端 ID 由 New API 分配，不要把它改成 Leonardo generationId，也不要假定一定以 `video_` 开头。[S7]

### 4.2 带受支持扩展

```json
{
  "model": "veo-3.1-generate-001",
  "prompt": "A cinematic shot of waves reaching a rocky coastline.",
  "seconds": "8",
  "size": "1920x1080",
  "provider_options": {
    "leonardo": {
      "generate_audio": false,
      "seed": 12345,
      "negative_prompt": "blur, low quality"
    }
  }
}
```

`provider_options` 是这个插件定义的扩展，并非 OpenAI 原生字段。JSON 中 `generate_audio` 必须是布尔值，`"false"` 不是 `false`。`seed=0` 会被保留。

只支持 `generate_audio`、`seed`、`negative_prompt` 三个扩展。`public=false` 与 `quantity=1` 在上游请求中固定，不允许下游覆盖。

如使用接受 `extra_body` 的 SDK，它通常是 SDK 的“将额外字段合并进请求体”参数：应检查最终 HTTP 请求是否真的包含顶层 `provider_options`。本插件不接受名为 `extra_body` 的嵌套 HTTP JSON 字段。

### 4.3 multipart 文本字段

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE/v1/videos" \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -F 'model=veo-3.1-fast-generate-001' \
  -F 'prompt=A paper boat on a quiet pond.' \
  -F 'seconds=4' \
  -F 'size=1280x720' \
  -F 'provider_options={"leonardo":{"generate_audio":false}}'
```

这仍是一个新的付费提交示例，不要为了“走完文档”把所有示例都执行一遍。本阶段上传任意文件都会在上游请求前被拒绝。

### 4.4 查询与下载

```bash
TASK_ID='复制创建响应里的id'

curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE/v1/videos/$TASK_ID" \
  -H "Authorization: Bearer $NEW_API_KEY"

# 仅在 status=completed 之后下载：
curl --fail --silent --show-error \
  "$NEW_API_BASE/v1/videos/$TASK_ID/content" \
  -H "Authorization: Bearer $NEW_API_KEY" \
  --output video.mp4
```

`/content` 是文件响应，不是返回一段 Leonardo JSON。`HEAD` 和 Range/条件请求由宿主处理转发，具体 CDN 行为必须实测。[S1][S7]

### 4.5 一次完整的显式付费测试

脚本仅使用 Python 标准库，使用的是 New API 用户 Key：

```bash
export NEW_API_BASE='https://your-newapi.example'
export NEW_API_KEY='你的NewAPI用户Key'

python3 smoke_test.py --submit --seconds 4 --size 1280x720 --out smoke-first
```

脚本只执行一次 POST，然后查询同一任务，成功后检查 MP4 文件头并保存文件。它不会自动重试提交，也不会携带密钥跟随重定向。

中断/超时后恢复已有任务，不要再次 `--submit`：

```bash
python3 smoke_test.py --task-id '之前返回的id' --out smoke-resume
```

输出目录包含请求、创建响应、最近查询结果和视频，可能含用户提示词，应作为私有数据保存。脚本会设置目录/文件权限；不要将实测目录上传公共仓库。

## 5. 内部实现与审阅结论

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

## 6. 重要限制：上线前必须知道

### 6.1 是任务流程兼容，不是完整 OpenAI Video schema 的无差别替身

创建响应在元数据仍存在时可返回 `seconds`/`size`/`prompt`。轮询后宿主用 Leonardo 的原始查询 JSON 替换 Task.Data，而公开 `TaskView` 不提供私有 `state`；已审阅的 Leonardo 查询 SDK 也没有可靠的时长字段。因此：

**查询响应可能缺少 `seconds`；插件没有用默认 8 秒填假数据。** 请求时长仍在私有 state 中用于计费。严格要求查询响应每次都带 `seconds` 的客户端，需要自行保留创建请求元数据，或单独扩展宿主受控的公开元数据通道。不要把本版宣传为所有 OpenAI SDK/schema 都 100% 兼容。[S1][S7][S11]

### 6.2 创建响应 envelope 必须实测

Leonardo 的动态 v2 reference 页面确认了“返回 generation ID”，但本次抓取没有展开完整 200 JSON schema。代码显式支持以下 `generationId` 位置：

```text
$.generationId
$.generate.generationId
$.generation.generationId
$.generationJob.generationId
$.sdGenerationJob.generationId
$.motionVideoGenerationJob.generationId
$.data.generationId
```

它不递归搜索任意 `id`，不使用图片 ID 冒充生成 ID；多个不同候选会报错。**这些是防御性兼容分支，不代表它们全都经过 Leonardo v2 实际响应验证。** 测试中的 envelope 是合成 fixture，第一条真实付费请求必须核对返回结构。缺少可识别 ID 时先查上游任务记录，不要反复 POST。[S8][S12]

### 6.3 插件不能保证 exactly-once 提交

网络超时可能发生在上游已经接收任务之后。第一阶段没有上游幂等键契约，JS 钩子也不能替宿主强制修改所有重试策略。**测试阶段关闭客户端/网关对创建请求的盲目自动重试；查询 GET 可限速重试。** 插件不会自己循环重新提交，但不能承诺外层 New API、代理或 SDK 不会重试。[S7]

### 6.4 `/content` 不等于永久存储

视频由上游 CDN 提供，插件不自动复制进你的对象存储。宿主已经完成的任务通常不再持续轮询；若保存的 CDN URL 失效，下载可能失败。持久存储、地址刷新和断链修复属于后续阶段，不在这版承诺中。

### 6.5 其他实际验收项

本地测试无法验证：实际生产模型权限/API credits、上游速率/并发限制、New API 实例的渠道路由、预扣与退款、重启恢复、跨用户任务隔离、真实 CDN 的 HEAD/Range 行为。放量前要在你的实例逐项验证，而不是因为 Node 测试通过就默认成立。

插件抛出的 `unsupported_size:` 等是错误消息前缀；最终 HTTP 状态和错误对象代码由 New API 宿主包装，不能假定客户端一定收到同名 `error.code`。

## 7. 最小上线验收

1. 实际宿主 `lint` 和 `plugin test` 通过；插件启用、类型 61 渠道绑定、分组和两个模型价格配置正确。
2. 一个 720p/4 秒 Fast 测试完成创建、查询、下载、真实视频播放；保存 public ID 和对应上游 ID 便于核对。
3. 故意提交非法时长/图片输入，确认在上游付费调用前被拒绝。
4. 核对用量 `seconds`、分辨率、音频档位与账务；验证失败路径，不将“网关退款”误作“上游退款”。
5. 用另一测试用户查询该任务应被拒绝；验证宿主重启、HEAD/Range 和提交重试配置。

引用编号及完整审阅链接见 `SOURCES.md`。
