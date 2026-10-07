# Leonardo Video 适配插件

<img src="../../plugins/tasks/leonardo-video/icon.png" width="80" height="80" alt="Leonardo logo">

[仓库首页](../../README.md) · [视频插件](../README.md) · [开发与验证](docs/DEVELOPMENT.md)

版本：`0.2.0`；审阅日期：2026-10-07。

`0.2.0` 新增通过 OSS/HTTPS URL 的首帧、首尾帧和多参考图视频生成，以及 MiniMax H3（`hailuo-03`）文生视频、图生视频。图像由 Leonardo 读取，无需额外部署图片上传服务。参考图字段为本插件扩展，格式见下方示例。[S16][S17]

`0.1.4` 修复厂商 `api_key` 模式的鉴权：New API 会将原始密钥同时传入 `apiKey` 和 `authHeader`，插件现在优先使用渠道 `apiKey` 构造 Bearer 请求头，兼容回退字段中的原始密钥或已有前缀。测试改用真实宿主的输入形式，并补充协议解码和响应渲染 fixture。[S15]

`0.1.3` 移除可选的 `meta.upstreams` 声明，处理实际实例报告的 `plugin meta has unknown field "upstreams"`。厂商上游为默认模式，仍只支持直连 Leonardo，不支持 New API 网关互联。实际实例安装与运行验收仍待完成。

`0.1.2` 移除可选的 `meta.baseUrl` 声明，解决运行实例报告 `plugin meta has unknown field "baseUrl"` 的安装阻断。渠道中必须手动填写 `https://cloud.leonardo.ai`。官方 `rc.41` 源码包含该字段，但报告错误的实际 Docker 构建尚未确认；此修改不代表已验证该实例的其余运行契约。

`0.1.1` 将显示名称统一为 `Leonardo Video`；插件 key 仍为 `leonardo-video`，支持范围与调用方式不变。

**目标：通过一个 New API Task Plugin，将 Leonardo 的 Veo 3.1 / Fast 和 MiniMax H3 文生视频、图生视频接入 `/v1/videos` 异步任务流程。** 安装文件是本目录的 `plugin.js`；不需要 Node.js 服务或修改 Go 主程序。

**验证状态：本地合成测试覆盖文生视频、OSS 图片映射、参数拒绝、计费状态及下载；实际结果见 tests/test-results.json。尚未在实际 New API 二进制的插件引擎中执行，也没有使用真实 Leonardo Key 付费联调。** 必须先在目标实例运行官方 lint/test，并分别完成文生视频、图生视频的创建—轮询—下载测试。

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
hailuo-03
```

Veo 3.1 / Fast 的尺寸与时长：

| 档位 | size | seconds |
|---|---|---|
| 720p 横屏 | `1280x720` | `4` / `6` / `8` |
| 720p 竖屏 | `720x1280` | `4` / `6` / `8` |
| 1080p 横屏 | `1920x1080` | `8` |
| 1080p 竖屏 | `1080x1920` | `8` |

Veo 默认 `seconds=8`、`size=1280x720`、`generate_audio=true`。

**1080p 只允许 8 秒是本插件的保守限制，不是对 Leonardo 所有模式限制的断言。** Leonardo 文档还列出 4K，但本版本不开放 4K，也不开放 Lite。[S4]

| 模式 | Veo 3.1 | Veo Fast | H3 |
|---|---|---|---|
| 文生视频 | 支持 | 支持 | 支持 |
| 首帧图片 | 支持 | 支持 | 支持 |
| 首尾帧 | 支持 | 支持 | 支持 |
| 多参考图 | 最多 3 张，仅 8 秒 | 不支持 | 最多 5 张 |
| 原生音频 | 可开关 | 可开关 | 始终开启 |

多参考图与首尾帧在本插件中互斥；尾帧必须配合首帧。多参考图用于指导内容，不承诺将每张图按顺序拼成视频。没有专门的“环视”参数，可在提示词中描述镜头围绕主体移动。

H3 固定使用 `TURBO`，时长为 5–15 的整数秒，默认 `seconds=5`、`size=856x480`；不接受 `seed`、`negative_prompt` 或关闭音频。以下显式尺寸来自 Leonardo 当前 v2 OpenAPI，暂不开放自动尺寸和 4K；提示词保守限制为 2000 字符，多参考图限制 5 张，取指南与 schema 的共同范围。[S16][S17]

| H3 分辨率 | 宽屏 21:9 | 横屏约 16:9 | 4:3 | 正方形 | 3:4 | 竖屏约 9:16 |
|---|---|---|---|---|---|---|
| 480p | 1120x480 | 856x480 | 640x480 | 480x480 | 480x640 | 480x856 |
| 768p | 1792x768 | 1376x768 | 1024x768 | 768x768 | 768x1024 | 768x1376 |
| 2k | 3360x1440 | 2560x1440 | 1920x1440 | 1440x1440 | 1440x1920 | 1440x2560 |

图片支持 HTTPS URL 或已有 Leonardo 图片 ID。仍不支持二进制文件上传、Base64 输入、视频/音频素材、视频编辑/延长/remix、SSE、批量多视频及任意参数透传。JSON 和 multipart/form 文本字段均可提交。

## 2. 获取插件与目录说明

推荐在 New API 的市场源中添加仓库的 [index.json](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/index.json)，随后安装 `Leonardo Video 0.2.0`。完整步骤见[仓库首页](../../README.md#添加市场源)。

固定发布文件为 [0.2.0/plugin.js](../../plugins/tasks/leonardo-video/0.2.0/plugin.js)，与本版本开发源码一致；市场图标独立提供，不修改插件 meta。发布说明见[中文日志](../../plugins/tasks/leonardo-video/0.2.0/CHANGELOG.zh-CN.md)。手动上传 JS 不会自动携带图片，需在支持的管理界面单独选择 [icon.png](../../plugins/tasks/leonardo-video/icon.png)。

下载本目录的 [plugin.js](plugin.js)，或克隆仓库获取测试和联调工具：

```bash
git clone https://github.com/CrazyCherrys/newapi-plugin-hub.git
cd newapi-plugin-hub/video/leonardo
```

本文后续本地命令均在 video/leonardo/ 目录执行。调用示例使用 Bash 语法。运行代码只需要 plugin.js，图标在支持的上传界面独立选择。

| 路径 | 用途 |
|---|---|
| [plugin.js](plugin.js) | 上传到 New API 的插件入口 |
| [README.md](README.md) | 安装、渠道配置、调用示例与限制 |
| [tests/](tests/) | 本地测试、宿主 fixture 和验证结果 |
| [scripts/smoke_test.py](scripts/smoke_test.py) | 创建、查询、下载一次真实视频的联调脚本 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 开发验证与内部实现 |
| [docs/SOURCES.md](docs/SOURCES.md) | 宿主及上游契约的审阅依据 |
| [package.json](package.json) | 本地测试命令，无 npm 依赖 |
| [SHA256SUMS.txt](SHA256SUMS.txt) | 交付文件校验值 |

## 3. 安装与配置

### 3.1 先做本地、宿主检查

本地测试无需安装 npm 包：

```bash
node --check plugin.js
node tests/test.mjs
```

在实际 New API 二进制可执行的位置运行官方检查（Docker 中需要先把文件复制进实际容器；容器名、二进制路径以你的部署为准）：[S3]

```bash
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture tests/golden.json
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
| 模型 | 按需添加上述三个精确模型名称 |
| 分组 | 先使用仅测试用户可访问的分组 |
| 定价 | 为启用的模型分别配置，见下一节 |

**Base URL 不带 `/v1`、`/api/rest/v1` 或 `/api/rest/v2`。** 插件自行拼接路径，只接受 HTTPS origin；不支持在 Base URL 上附加路径、查询参数或账户密码。

直连 Leonardo 用类型 61，而不是“New API 上游”的类型 60。本插件省略可选的 `upstreams` 声明，使用默认厂商上游模式；驱动仍拒绝显式的非厂商上游，不支持网关互联。[S6]

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

以你自己的售价替换数值，各模型分别设置；存在不同分辨率/音频档位售价时，还需要在宿主定价中分档，不应直接沿用统一示例价格。H3 按固定 TURBO 档位设置 480p、768p、2k 价格，不能沿用 Veo 的价格。原有 Veo 表达式含义不变，不会自动迁移已有配置。优先在正式放开所有参数之前验证每个档位的结算。

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

Veo 支持 `generate_audio`、`seed`、`negative_prompt`；图像扩展包括 `start_frame`、`end_frame`、`reference_images`。H3 始终生成音频，不接受 seed 或负面提示词。`public=false` 与 `quantity=1` 固定。

如使用接受 `extra_body` 的 SDK，它通常是 SDK 的“将额外字段合并进请求体”参数：应检查最终 HTTP 请求是否真的包含顶层 `provider_options`。本插件不接受名为 `extra_body` 的嵌套 HTTP JSON 字段。

### 4.2.1 OSS 首帧图生视频

向相同的 `POST /v1/videos` 提交以下 JSON。示例会创建付费任务：

```json
{
  "model": "veo-3.1-fast-generate-001",
  "prompt": "The camera slowly orbits around the product, keeping its shape and color consistent.",
  "seconds": "4",
  "size": "1280x720",
  "input_reference": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/product.png",
  "provider_options": {"leonardo": {"generate_audio": false}}
}
```

`input_reference` 是首帧的快捷字段，也接受 `{"image_url":"https://..."}`。图片必须是外网可读取的 HTTPS 图片直链，不能是 OSS 控制台页面。私有桶可使用签名 URL，插件原样保留查询参数；有效期需覆盖上游排队和读取时间，建议测试时至少 1 小时，不需要公开整个桶。不要传 OSS AccessKey，也不支持附加图片请求头。Leonardo 读取图片，浏览器跨域配置不决定这次读取是否成功。

提交钩子不会将参考图签名 URL 写入返回的任务数据/state 或公开响应；宿主请求日志以及下方测试脚本的 request.json 仍可能记录它，应按临时访问凭据管理。

### 4.2.2 首尾帧、多参考图与 H3

首尾帧使用：

```json
"provider_options": {
  "leonardo": {
    "start_frame": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/start.png",
    "end_frame": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/end.png"
  }
}
```

多参考图使用 `reference_images` 数组，选择普通 Veo 3.1 或 H3，不同时传首尾帧：

```json
{
  "model": "hailuo-03",
  "prompt": "Animate the product naturally with a slow camera orbit.",
  "seconds": "5",
  "size": "856x480",
  "provider_options": {
    "leonardo": {
      "reference_images": [
        "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/front.png",
        "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/side.png"
      ]
    }
  }
}
```

H3 文生视频删除上述 `provider_options`；H3 首帧图生视频改用 `input_reference` 即可。H3 默认选择 480p/5 秒/TURBO 以减少测试量，但不承诺其价格低于其他模型，提交前查看 Leonardo API 价格计算器。请先在 New API 渠道中添加 `hailuo-03` 并配置价格。

所有图片位置也接受 `{"type":"UPLOADED","id":"Leonardo图片UUID"}` 或 `GENERATED` 类型；ID 必须属于可被当前 Leonardo 渠道访问的图片。同一个图片对象不能同时填写 URL 与 ID；不同图片可以分别使用 URL 或 ID。不自动上传 OSS 图片到 Leonardo 图片库。

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

这是新的付费提交示例，不要为了“走完文档”把所有示例都执行一遍。图生视频可增加 `-F 'input_reference=https://你的OSS图片地址'`，这里是文本字段，不是 `@文件` 上传。上传二进制文件会被拒绝。

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

python3 scripts/smoke_test.py --submit --seconds 4 --size 1280x720 --out smoke-first
```

脚本只执行一次 POST，然后查询同一任务，成功后检查 MP4 文件头并保存文件。它不会自动重试提交，也不会携带密钥跟随重定向。

图生视频测试添加 `--reference-url 'https://你的OSS图片地址'`；首尾帧再添加 `--end-frame-url`。H3 使用 `--model hailuo-03`，省略时长/尺寸时默认 5 秒/480p。多参考图可重复使用 `--reference-image-url`。这些命令各自创建一次任务，不要重复执行。测试输出中的 request.json 可能含签名 URL。

中断/超时后恢复已有任务，不要再次 `--submit`：

```bash
python3 scripts/smoke_test.py --task-id '之前返回的id' --out smoke-resume
```

输出目录包含请求、创建响应、最近查询结果和视频，可能含用户提示词，应作为私有数据保存。脚本会设置目录/文件权限；不要将实测目录上传公共仓库。

## 5. 重要限制：上线前必须知道

### 5.1 是任务流程兼容，不是完整 OpenAI Video schema 的无差别替身

创建响应在元数据仍存在时可返回 `seconds`/`size`/`prompt`。轮询后宿主用 Leonardo 的原始查询 JSON 替换 Task.Data，而公开 `TaskView` 不提供私有 `state`；已审阅的 Leonardo 查询 SDK 也没有可靠的时长字段。因此：

**查询响应可能缺少 `seconds`；插件没有用默认 8 秒填假数据。** 请求时长仍在私有 state 中用于计费。严格要求查询响应每次都带 `seconds` 的客户端，需要自行保留创建请求元数据，或单独扩展宿主受控的公开元数据通道。不要把本版宣传为所有 OpenAI SDK/schema 都 100% 兼容。[S1][S7][S11]

### 5.2 创建响应 envelope 必须实测

Leonardo 当前 v2 OpenAPI 明确返回顶层 `generationId`；本版已按此契约测试，但仍需用实际账户核对响应。代码也保留以下兼容位置：

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

### 5.3 插件不能保证 exactly-once 提交

网络超时可能发生在上游已经接收任务之后。当前没有已验证的上游幂等键契约，JS 钩子也不能替宿主强制修改所有重试策略。**测试阶段关闭客户端/网关对创建请求的盲目自动重试；查询 GET 可限速重试。** 插件不会自己循环重新提交，但不能承诺外层 New API、代理或 SDK 不会重试。[S7]

### 5.4 `/content` 不等于永久存储

视频由上游 CDN 提供，插件不自动复制进你的对象存储。宿主已经完成的任务通常不再持续轮询；若保存的 CDN URL 失效，下载可能失败。持久存储、地址刷新和断链修复属于后续阶段，不在这版承诺中。

### 5.5 其他实际验收项

本地测试无法验证：实际生产模型权限/API credits、上游速率/并发限制、New API 实例的渠道路由、预扣与退款、重启恢复、跨用户任务隔离、真实 CDN 的 HEAD/Range 行为。放量前要在你的实例逐项验证，而不是因为 Node 测试通过就默认成立。

插件抛出的 `unsupported_size:` 等是错误消息前缀；最终 HTTP 状态和错误对象代码由 New API 宿主包装，不能假定客户端一定收到同名 `error.code`。

## 6. 最小上线验收

1. 实际宿主 `lint` 和 `plugin test` 通过；插件启用、类型 61 渠道绑定、分组和所用模型价格配置正确。
2. 分别完成一次文生视频和 OSS 首帧图生视频的创建、查询、下载、播放；按需再验证首尾帧、H3 和多参考图。保存 public ID 和对应上游 ID 便于核对。
3. 故意提交非法时长/图片输入，确认在上游付费调用前被拒绝。
4. 核对用量 `seconds`、分辨率、音频档位与账务；验证失败路径，不将“网关退款”误作“上游退款”。
5. 用另一测试用户查询该任务应被拒绝；验证宿主重启、HEAD/Range 和提交重试配置。

引用编号及完整审阅链接见[审阅依据](docs/SOURCES.md)。开发、测试及内部实现见[开发文档](docs/DEVELOPMENT.md)。
