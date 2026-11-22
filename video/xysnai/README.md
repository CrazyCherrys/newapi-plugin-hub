# XYSNAI Video：一个 New API 插件接入多个视频模型

[返回 Hub](../../README.md) · [验证记录](docs/VALIDATION.md) · [更新日志](CHANGELOG.zh-CN.md)

核对日期：2026-11-22。插件版本：1.2.0。插件 key：`crazycherrys_xysnai-video`。

1.1.0 取消全部模型的 `xysnai/` 前缀，模型名直接使用上游名称。插件 key 仍为 `crazycherrys_xysnai-video`，其中 `crazycherrys_` 是社区插件安装要求的作者命名空间。

从仍带模型前缀的版本升级时，请先完成进行中的任务，再更新渠道、请求、令牌模型限制和价格键，例如从 `xysnai/minimax-h3` 改为 `minimax-h3`。从 1.1.0 升级到 1.2.0 可沿用现有模型名、渠道和按 `size` 或 `seconds` 定价的表达式。

## 结论与验证边界

XYSNAI 当前公开文档中的 19 个视频模型都通过 `POST /v1/videos` 创建异步任务。平台还提供 `GET /v1/videos/{id}` 查询和 `GET /v1/videos/{id}/content` 下载。最接近的是 New API 的 **OpenAI Video 宿主协议 `openai_video`**，官方 Sora 插件可作为任务驱动的参考。XYSNAI 为不同模型添加自己的请求字段，因此不能直接套用原版 Sora 的模型列表和尺寸枚举。

本包提供一个独立的 **Task Plugin（类型 61）**。它将不同品牌的模型接入同一套任务创建、轮询和内容代理逻辑，使用各自的参数与用量定义。它不声明 `channelTypes`，不接管已有的 Sora/OpenAI/MiniMax 提供商。

验证范围必须区分：

- XYSNAI 19 个模型的创建文档已逐页核对；统一查询及下载文档已读取。
- 随附参考材料记录过 `minimax-h3` 的 5 秒、`1376x768` 直连请求；这不等于通过当前 New API 部署完成端到端验证。
- 1.2.0 通过 New API rc.51 官方二进制的 `plugin lint`、`plugin test` 及本地用量测试。
- 未在用户实际 New API 容器中加载；未替用户发起付费视频生成；其余模型、multipart 实际上传、HEAD/Range 和超分最终计费仍需联调。

## 1. 文件说明

- `plugin.js`：要上传到 New API 的唯一插件源码。
- `model-catalog.json`：19 个上游模型、对外名称、文档链接、参数分组及验证边界。
- `examples/*.json`：按不同模型家族编写的请求样例。
- `tests/run.mjs`：本地离线钩子测试；运行 `node tests/run.mjs`。
- `tests/golden.json`：New API CLI fixture。
- `tests/test-summary.json`：测试摘要和验证范围。
- `docs/VALIDATION.md`：原始验证边界与本次 Hub 接入检查。
- `CHANGELOG.md`、`CHANGELOG.zh-CN.md`：市场发布日志。
- `SHA256SUMS.txt`：源码、测试、示例及资料的校验清单。

安装只需要一个 JS 文件。其它文件供核对、调试和维护。

## 2. 在 New API 中配置

推荐先按 [Hub 首页](../../README.md#添加市场源)添加市场源，刷新后安装 **XYSNAI Video 1.2.0**。市场中只有一个插件，安装后可以选择其声明的 19 个模型；不需要按模型安装多份插件。

也可[下载固定版本 plugin.js](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_xysnai-video/1.2.0/plugin.js)手动上传。以下渠道配置对两种安装方式均适用。

rc.51 的内置 Hailuo 插件声明了 `MiniMax-H3`，宿主会把它与 XYSNAI 的 `minimax-h3` 视为同名。若安装出现此冲突，请先核对内置 Hailuo 的关联渠道及进行中的任务。确定不再使用内置 Hailuo 时，在任务插件管理中停用 `hailuo`，再安装 XYSNAI。保留内置 Hailuo 时，这两个同名模型无法在该宿主同时启用。

1. 以 Root 身份进入插件管理，启用任务插件功能。
2. 上传 `plugin.js`，或在源码导入处粘贴其完整内容；保存、启用。
3. 添加渠道，类型选择 **Task Plugin（61）**，插件选择 **XYSNAI Video**，key 为 `crazycherrys_xysnai-video`。
4. Base URL 填 `https://xysnai.cn`，不要追加 `/v1` 或 `/v1/videos`。
5. API Key 填 XYSNAI 的上游密钥。
6. 模型从插件声明列表选取，例如 `minimax-h3` 与 `wan3.0-video`。
7. 选择你的实例实际使用的分组，确认客户端 New API 令牌可访问此分组和模型。
8. 初次联调将模型映射留空，保存渠道，然后分别配置模型价格。

渠道由 `setting.task_plugin_key` 绑定插件。不要将上述名称手动填入 Sora 提供商渠道，也不要继续使用高级自定义类型 58 的 `advanced_routes` JSON。

### 对外模型名称

| 客户端请求 New API 的 model | 插件发给 XYSNAI 的 model |
|---|---|
| `minimax-h3` | `minimax-h3` |
| `wan3.0-video` | `wan3.0-video` |
| `sd-2.5` | `sd-2.5` |
| `mg-seedance-2.5-720p` | `mg-seedance-2.5-720p` |
| `Video-upscale2.6` | `Video-upscale2.6` |

客户端模型名与上游名称一致，渠道模型列表和调用请求直接使用上表中的原始名称，不需要填写模型映射。名称大小写以模型目录为准。

模型声明、请求转发和各家族的 usage profile 已统一使用无前缀名称。跨家族映射会改变校验和计费含义，本版仍会拒绝。

## 3. 参数按模型保留

| 家族 | 数量 | 主要字段 | 时长 |
|---|---:|---|---|
| `wan3.0-video` | 1 | `resolution`：`480P` / `720P` / `1080P`；支持首尾帧及多媒体参考 | 2–30 秒整数 |
| `minimax-h3` / `-fl2v` / `-lh` | 3 | `size` 使用 XYSNAI 的 26 个允许值；`1376x768` 已有直连成功证据 | 4–15 秒整数 |
| `sd-2.0` / `sd-2.5` | 2 | `resolution`：`480p` / `720p` / `1080p` / `2k` / `4k` | 4–30 秒整数 |
| `mg-…` / `ov-…` / 特价 Seedance | 12 | `aspect_ratio` 必填；保留 `quality`、`size`、`reference_image_urls` 等扩展 | 4–30 秒整数 |
| `Video-upscale2.6` | 1 | 公开协议使用 `reference_video`；`scale`、`enhancement_strength` | 不使用输出 `seconds` |

JSON 中 `seconds: 5` 和 `seconds: "5"` 都能在本插件中被接受、校验，并以数字发往 XYSNAI。正确命中此插件后，不再依赖之前会报 `Alias.seconds` 的固定类型解析路径。

必须保留不同模型的真实字段，不将所有分辨率统一改为 `size` 或 `768P`。本插件也不会把字段塞入 `metadata` 来代替上游要求的顶层参数。

### 多媒体输入

JSON 可以直接携带公开可访问的素材 URL。不同家族使用不同字段：

- Wan / `sd-…`：`first_image`、`last_image`、`reference_images`、`reference_videos`、`reference_audios`。
- H3：`images`、`input_reference`、`reference_video`、`reference_audio` 及相应复数数组。
- `mg-…` / `ov-…` / 特价：`reference_image_urls`、`reference_videos`、`reference_audios`。
- 超分：一段输入视频。

multipart 转发保留原始字段名、重复字段和文件引用；只对模型及已校验的数值做必要处理。实际表单编码仍需按 XYSNAI 测试，建议首先用 JSON + URL 完成联调。New API 宿主还有自己的文件数量、大小及 parts 限制；这与 XYSNAI 文档的模型上限是两层限制。

`minimax-h3-fl2v` 被上游描述为首尾帧模式，但公开示例未明确首尾帧顺序和完整业务条件。本插件保留其字段，不宣称已验证该模式的素材语义。

## 4. 在 New API 中配置计费

- 普通按次售价使用固定每次价格。1.2.0 会按 New API 契约关闭动态倍率，`seconds` 和素材数量只作为任务用量事实。
- 按时长或档位收费时，为模型启用 **任务用量定价**。同名模型由多个插件提供时，给 XYSNAI 配置插件级表达式，例如 `crazycherrys_xysnai-video::minimax-h3`。每个模型分别定价。
- 最终价格由 New API 根据已保存的表达式、USD 单价和分组倍率计算。XYSNAI 的人民币价格需要另行换算。不要把上游 `cost` 字段填作 New API 价格。

### MiniMax H3

H3 上报请求的 `seconds`、原始 `size` 与从尺寸映射的 `resolution`。已有 `size` 表达式可以继续使用。例如 `1376x768` 和 `1024x1024` 都归入 `768P`。XYSNAI 当前公开模型目录列出的人民币费率如下。

| `resolution` | `minimax-h3` / `minimax-h3-fl2v` | `minimax-h3-lh` |
|---|---:|---:|
| `480P` | ¥0.05/秒 | ¥0.01/秒 |
| `768P` | ¥0.08/秒 | ¥0.04/秒 |
| `1080P` | ¥0.14/秒 | 未公布 |
| `2K` | ¥0.20/秒 | 未公布 |
| `4K` | ¥0.25/秒 | 未公布 |

以上费率分别乘以输出请求时长及实际输入视频时长。输入图片前 5 张免费，之后 ¥0.10/张。标准版 `1376x768` 的 5 秒纯文本请求，公开规则计算为 ¥0.40。价格和账户分组以 [XYSNAI 模型目录](https://xysnai.cn/zh/models)为准。

使用纯文本或通过 `images` 传入图片时，可以在 New API 中按 `resolution` 选择每秒 USD 售价，并用 `max(u("input_images") - 5, 0)` 计算超出的图片数。下式只演示一个档位的写法，两个数字都是示例 USD 售价。

```text
tier("768P", u("seconds") * 0.02 + max(u("input_images") - 5, 0) * 0.01)
```

配置完整 H3 价格时，每个实际开放的档位都应配置对应规则。`-lh` 的三个未公布档位不能沿用标准版价格来核对上游成本。

参考视频当前只有 `input_videos` 数量。`input_reference` 既可能是图片，也可能是视频，故独立报告为 `input_references`。上游接口文档没有提供可供插件结算的输入视频实测时长或素材类型。按上游成本收费时，先对纯文本和 `images` 场景核账，再开放需要输入视频或 `input_reference` 的请求。

### 其他视频模型

Wan 与 `sd-…` 上报请求秒数、各自的分辨率和音频模式。Seedance 上报请求秒数、任务次数和质量选项。部分特价 30s 模型的上游公开口径为按任务收费，对这些模型使用 `requests` 或固定按次价格。按秒收费的型号再用 `seconds`。不同型号和分组的费率见上游目录。

### 视频超分必须独立定价

XYSNAI 文档说明超分费用按实例实际占用时间后付费，不等于输出视频长度。`billing_seconds` 的真实完成响应、单位与结算规则尚未得到实测确认。

本版只在上游真实返回合法 `billing_seconds` 时报告该字段，不将缺失、空值写成 0。若要先联调超分，可明确配置按任务次数的固定售价；这与上游成本不一定一致。自动按实例时长结算，应在取得真实完成响应并设计预扣/最终结算表达式后启用。不要直接使用 `u("seconds")` 或在提交阶段直接乘不存在的 `billing_seconds`。

## 5. 请求示例

先为当前终端设置自己的 New API 令牌；它与 XYSNAI 上游 Key 是不同的凭据。

```bash
export XYS_NEWAPI_KEY='你的NewAPI令牌'
```

### MiniMax H3

```bash
curl --fail-with-body --silent --show-error \
  'https://your-newapi.example.com/v1/videos' \
  -H "Authorization: Bearer $XYS_NEWAPI_KEY" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "minimax-h3",
    "prompt": "镜头缓慢推进，一只橘猫在窗边晒太阳",
    "seconds": 5,
    "size": "1376x768"
  }'
```

### 万相 3.0

```bash
curl --fail-with-body --silent --show-error \
  'https://your-newapi.example.com/v1/videos' \
  -H "Authorization: Bearer $XYS_NEWAPI_KEY" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "wan3.0-video",
    "prompt": "镜头缓慢推进，一只橘猫在窗边晒太阳",
    "seconds": 5,
    "resolution": "720P",
    "aspect_ratio": "16:9",
    "generate_audio": true
  }'
```

`examples/sd.json`、`examples/mg.json` 给出 Seedance 请求。`examples/upscale.json` 中的 `cdn.example.com` 是占位地址，需替换成实际可访问的视频素材。

### 查询与下载

保存 **你的 New API 创建响应返回的 id**，不要混用 XYSNAI 的内部任务 ID。

```bash
export XYS_PUBLIC_TASK_ID='NewAPI返回的任务ID'

curl --fail-with-body --silent --show-error \
  "https://your-newapi.example.com/v1/videos/$XYS_PUBLIC_TASK_ID" \
  -H "Authorization: Bearer $XYS_NEWAPI_KEY"

# 等查询返回 completed 后下载：
curl --fail --location \
  "https://your-newapi.example.com/v1/videos/$XYS_PUBLIC_TASK_ID/content" \
  -H "Authorization: Bearer $XYS_NEWAPI_KEY" \
  --output result.mp4
```

New API 查询读取保存的任务快照，后台轮询上游，查询一次不代表实时请求上游一次。先完整核对一条任务的创建、完成、下载和计费，再测试下一个模型家族。

## 6. 离线验证与现场排查

从仓库根目录进入插件目录；以下命令使用 Bash。本地测试不发送 HTTP 请求：

```bash
cd video/xysnai
npm test
sha256sum --check SHA256SUMS.txt
```

在带有目标版本 New API 二进制的环境中，继续执行官方 CLI：

```bash
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture tests/golden.json
```

也可在插件详情沙盒检查 `buildSubmitRequest`。输入参数示例：

```json
[
  {
    "model": "minimax-h3",
    "upstreamModel": "minimax-h3",
    "baseUrl": "https://xysnai.cn",
    "apiKey": "test-key-for-sandbox-only",
    "files": [],
    "requestBody": {
        "payload": {
          "model": "minimax-h3",
          "prompt": "窗边的一只猫",
          "seconds": "5",
          "size": "1376x768"
        },
        "formFields": null
    }
  }
]
```

应输出上游 URL `https://xysnai.cn/v1/videos`、`model: minimax-h3`、数字 `seconds: 5` 和 `size: 1376x768`。沙盒只检查函数输出，不会创建视频。上述 `payload/formFields` 仅是插件内部钩子结构；客户端请求仍使用第 5 节的普通 JSON，不应添加这层包装。

| 症状 | 优先检查 |
|---|---|
| `invalid_api_platform: 58` | 请求仍选中了高级自定义渠道，核对类型 61 与插件 key |
| 报 `MiniMax-H3` 无可用渠道 | 请求或渠道仍用旧名称；本版使用 `minimax-h3` |
| `model_not_found` | 插件启用状态、声明模型、渠道模型和令牌分组是否一致 |
| `model_price_error` | 对应无前缀模型的任务用量售价是否已配置 |
| `plugin_usage_invalid` | 实际命中插件与其 usage profile；记录完整错误和钩子事实 |
| 上游 401/403 | XYSNAI Key、权限与 `Bearer` 鉴权 |
| 上游 404 | 实际 URL 是否误含双 `/v1` 或原生厂商路径 |
| 上游 422/缺字段 | 按对应模型文档检查 `size`/`resolution`/`aspect_ratio` |
| 创建成功、一直不完成 | 后台轮询日志、上游状态、任务超时配置 |
| 完成但无法下载 | 上游 `/content`、host内容代理日志；区分 GET 与 HEAD/Range |

源码以审计到的 API v1 与 rc.51 契约为目标。实际实例版本未知；若插件启用失败，应保留编译/元数据错误及镜像版本，针对该版本处理，而不是继续切换厂商渠道。

## 7. 以后新增模型

一个插件可以维护多模型，但目前任务模型认领是明确列表，不是任意字符串通配。XYSNAI 新增模型后，需要在本文件的 `UPSTREAM_MODELS` 和必要的家族/usage profile 中增加它，确认接口与字段，再更新渠道的可用模型列表。已有 19 个模型的全部精确名称见 `model-catalog.json`。

## 8. 依据

- [XYSNAI 万相文档](https://xysnai.cn/zh/docs?model_id=bbc49ae0-c92d-46dd-876f-bf56e1b0579a)
- [XYSNAI H3 文档](https://xysnai.cn/zh/docs?model_id=4d25e564-875f-44ef-bdf5-d0f3194a10b1)
- [XYSNAI sd-2.5 文档](https://xysnai.cn/zh/docs?model_id=6ff9b9e1-67b0-45f7-8d9a-80a0e780c13d)
- [XYSNAI 视频超分文档](https://xysnai.cn/zh/docs?model_id=962644b7-a8ef-463e-8af5-7b05cf04f008)
- [New API 官方插件索引](https://github.com/QuantumNous/new-api-plugins/blob/main/index.json)
- [Sora 1.1.0 驱动参考](https://github.com/QuantumNous/new-api-plugins/blob/main/plugins/tasks/sora/1.1.0/plugin.js)
- [New API 渠道配置](https://docs.newapi.pro/zh/docs/plugins/configuration)
- [New API 用量与计费](https://docs.newapi.pro/zh/docs/plugins/billing)
- [New API 调用指南](https://docs.newapi.pro/zh/docs/plugins/usage)
- [New API 开发指南](https://docs.newapi.pro/zh/docs/plugins/development)
- [API v1 类型契约](https://github.com/QuantumNous/new-api-plugins/blob/main/docs/plugin-api/v1.d.ts)

本插件是针对上述公开接口编写的独立适配实现，不是 XYSNAI 或 New API 官方发布的插件。
