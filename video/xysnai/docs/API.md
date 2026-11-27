# 通过 New API 调用 DreamStudio Video

使用 DreamStudio Video 创建视频、查询任务和下载视频。接入 1.4.0 新增的三个 MiniMax 型号可直接查看[能力表和请求示例](#15s30s-和-2k-武庚纪)。

调用地址为 `https://api.haokun.cc`。在 Bash 终端运行下方命令，将令牌占位符替换为你有模型权限的 **New API 令牌**。可用模型及售价以服务方为准，提交视频任务会消耗额度。

```bash
export NEW_API_BASE_URL='https://api.haokun.cc'
export NEW_API_TOKEN='替换为你的 New API 令牌'
```

| 操作 | 方法和路径 |
|---|---|
| 创建视频任务 | `POST /v1/videos` |
| 查询任务 | `GET /v1/videos/{id}` |
| 下载视频 | `GET /v1/videos/{id}/content` |

本页列出的 22 个模型共用这三个接口。创建时在请求体中填写 `model`，其余字段按所选型号填写。你的令牌能调用哪些模型，以服务方实际开通的列表为准。

## 创建任务

下方以标准版 `minimax-h3` 为例，生成一段 5 秒视频。[H3 型号与参数](#minimax-h3-型号与参数) · [H3 参考图](#h3-参考图请求示例) · [FL2V 单图和双图](#h3-fl2v-首尾帧请求示例) · [其他模型](#其他模型)

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "minimax-h3",
    "prompt": "镜头缓慢推进，一只橘猫在窗边晒太阳",
    "seconds": 5,
    "size": "1376x768"
  }'
```

创建接口返回任务信息。保存响应中的 `id`，查询和下载都使用这个值。以下为响应示例。

```json
{
  "id": "task_example",
  "object": "video",
  "model": "minimax-h3",
  "status": "queued",
  "progress": 0
}
```

## 查询任务

将 `VIDEO_ID` 替换为上一步返回的 `id`。隔几秒查一次，任务完成或失败后停止查询。

```bash
export VIDEO_ID='替换为创建响应中的 id'

curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos/$VIDEO_ID" \
  -H "Authorization: Bearer $NEW_API_TOKEN"
```

| `status` | 含义 |
|---|---|
| `queued` | 任务在排队 |
| `in_progress` | 正在生成 |
| `completed` | 可下载视频 |
| `failed` | 任务失败，查看响应中的 `error.message`（如有） |

## 下载视频

等 `status` 为 `completed` 后，使用有权访问该任务的令牌下载。命令会将视频保存到当前目录的 `result.mp4`。

```bash
curl --fail --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos/$VIDEO_ID/content" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  --output result.mp4
```

## MiniMax H3 型号与参数

六个型号共用上面的创建、查询和下载接口。请求体中的模型名区分大小写。

### 六款模型共用一个生成入口

应用可以只展示一个「MiniMax H3」入口，用下表的模式和选项确定请求体中的 `model`。模式是应用界面选项。发送给 New API 时仍使用表中的完整模型名，创建、查询和下载可以共用同一套代码。

| 界面模式 | 如何选择型号 | 时长和画面 | 素材字段 |
|---|---|---|---|
| 固定横屏 | 4、6、8、12、15 秒选 `MiniMax-H3-15S`，30 秒选 `MiniMax-H3-30S` | 两款均为 16:9。短档输出 1344×768，30 秒档输出 1184×672 | 共用 `reference_images`、`reference_videos`、`reference_audios` |
| 通用生成 | 标准档选 `minimax-h3`，已开通的低价档选 `minimax-h3-lh` | 均为 4–15 秒的整数。标准档支持多种尺寸至 4K，LH 目前只公布 480P、768P 的价格 | 共用 `images` 等参考素材字段，按渠道开放能力展示 |
| 首尾帧 | 选 `minimax-h3-fl2v` | 4–15 秒的整数，以 `size` 选画面尺寸 | multipart 中先传首帧、再传可选尾帧，文件字段都叫 `images` |
| 武庚纪 2K | 选 `MiniMax-H3-2K-武庚纪` | 5–28 秒的整数，固定 2K，可选横屏、竖屏、方形 | 支持图、视频、音频参考，指定首尾帧分别用 `first_frame`、`last_frame` |

先选模式，再显示可用时长、尺寸和服务方报价。例如同为 8 秒，固定横屏、通用生成和武庚纪都有对应型号；同为 2K，标准档、FL2V 和武庚纪又有不同的素材字段。只有在「固定横屏」模式内，时长才能唯一确定型号。已选时长不在该模式的列表中时，提示用户重选。提交前展示所选型号的实际输出规格和价格，15S 和 30S 应分别取价。

### 六款模型的素材与生成模式参数

这张表列出创建请求的可选字段。JSON 中的参考素材数组填写公开可读取的 URL 字符串，即使只有一项也用数组。没有素材时省略对应字段。上传本地文件时用 `multipart/form-data`，每份文件占一个名额，字段名与表中一致。

| `model` | 参考图片 | 参考视频 | 参考音频 | 生成模式 |
|---|---|---|---|---|
| `MiniMax-H3-15S` | `reference_images`，最多 9 张 | `reference_videos`，最多 3 段 | `reference_audios`，最多 3 段 | 接口未声明 |
| `MiniMax-H3-30S` | `reference_images`，最多 9 张 | `reference_videos`，最多 3 段 | `reference_audios`，最多 3 段 | 接口未声明 |
| `MiniMax-H3-2K-武庚纪` | `reference_images`，最多 9 张 | `reference_videos`，最多 3 段 | `reference_audios`，最多 3 段 | `generation_mode`，可选字符串 |
| `minimax-h3` | `images`，1–9 张 | `reference_videos`，1–3 段 | `reference_audios`，1–3 段 | `mode`，可选字符串 |
| `minimax-h3-lh` | `images`，1–9 张 | `reference_videos`，1–3 段 | `reference_audios`，1–3 段 | `mode`，可选字符串 |
| `minimax-h3-fl2v` | `images`，实测为 1–2 张有序帧图 | `reference_videos`，接口列出 1–3 段 | `reference_audios`，接口列出 1–3 段 | `mode`，可选字符串 |

- **武庚纪**的 `generation_mode` 有五个公开取值：`reference`、`multimodal`、`text`、`image_video`、`image_audio`。指定首尾帧另用 `first_frame`、`last_frame`，每个字段传一个图片 URL 字符串或一份图片文件。接口未逐项说明每种模式允许的素材组合。
- **标准版、LH 和 FL2V** 的 `mode` 只声明了字符串类型，公开文档没有给出枚举或与 `generation_mode` 的映射。单份视频或音频还可分别用 `reference_video`、`reference_audio` 传一个 URL 字符串。
- **FL2V** 已通过实际生成确认：第一份 `images` 文件指定首帧，第二份指定可选尾帧。公开参数表沿用了最多 9 张图的通用定义，目前实测覆盖单帧和双帧。参考视频、音频与帧图组合的生成效果尚未实测。[首尾帧请求示例](#h3-fl2v-首尾帧请求示例) · [验证记录](VALIDATION.md#fl2v-multipart-真实生成)

以下武庚纪请求体展示四个字段的 JSON 写法，可提交到 `POST /v1/videos`。将示例 URL 换成可访问的素材地址。这组参数已在插件本地核对转发，真实生成效果待联测。

```json
{
  "model": "MiniMax-H3-2K-武庚纪",
  "prompt": "沿用参考图的人物造型，参考视频的运镜和音频的节奏",
  "seconds": 8,
  "generation_mode": "multimodal",
  "reference_images": ["https://cdn.example.com/character.jpg"],
  "reference_videos": ["https://cdn.example.com/motion.mp4"],
  "reference_audios": ["https://cdn.example.com/rhythm.mp3"]
}
```

### 15S、30S 和 2K 武庚纪

| `model` | `seconds` | 画面与可选参数 |
|---|---|---|
| `MiniMax-H3-15S` | 必填，4、6、8、12 或 15 | 固定 1344×768，`aspect_ratio` 可填 `16:9` |
| `MiniMax-H3-30S` | 固定 30，可省略 | 固定 1184×672，`aspect_ratio` 可填 `16:9` |
| `MiniMax-H3-2K-武庚纪` | 必填，5 至 28 的整数 | `resolution` 可填小写 `2k`，`aspect_ratio` 可选 `9:16`、`16:9`、`1:1` |

#### 输入能力与字段

创建时填写完整的 `model` 和非空字符串 `prompt`（最多 20,000 字符）。三款都支持只用提示词生成视频；素材字段均可省略。纯文本的最小 JSON 请求体见 [15S](../examples/minimax-15s.json)、[30S](../examples/minimax-30s.json) 和 [2K 武庚纪](../examples/minimax-2k.json)。

各字段的类型和数量见[六款模型的素材与生成模式参数](#六款模型的素材与生成模式参数)。15S 和 30S 的公开接口没有固定首帧、尾帧字段。三款的参考视频字段均用于提供生成素材，公开接口没有约定视频剪辑或续写操作。

#### 用 URL 提交参考图（15S）

以下 Bash 示例沿用[页首的网关地址和令牌](#通过-new-api-调用-dreamstudio-video)，执行创建命令会消耗额度。JSON 中的素材 URL 须替换成服务方可直接读取的地址。下例生成 6 秒视频；传多张图时向同一个数组追加 URL。

```bash
curl --fail-with-body -sS "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-H3-15S",
    "prompt": "保留参考图中的人物造型，镜头缓慢拉远",
    "seconds": 6,
    "reference_images": ["https://cdn.example.com/character.jpg"]
  }'
```

#### 上传本地参考视频（30S）

在素材所在目录运行下例，将 `motion.mp4` 替换为自己的文件。省略 `seconds` 会生成 30 秒视频。curl 会自动设置 multipart boundary。同一类素材有多份时，重复提交同名的文件字段，每份文件占一个名额。

```bash
curl --fail-with-body -sS "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  --form-string 'model=MiniMax-H3-30S' \
  --form-string 'prompt=参考素材中的运镜节奏，生成海岸风景视频' \
  --form 'reference_videos=@./motion.mp4;type=video/mp4'
```

同一接口也接受音频参考。上传本地音频可使用 `--form 'reference_audios=@./rhythm.mp3;type=audio/mpeg'`；用 JSON 提交时写成 `"reference_audios": ["https://cdn.example.com/rhythm.mp3"]`。

#### 用 URL 指定首尾帧（2K 武庚纪）

下例生成 8 秒竖屏视频。首帧和尾帧各用独立字段，传 URL 时各填一个字符串，上传本地图片时分别使用同名文件字段。纯文生视频可省略这两个字段。

```bash
curl --fail-with-body -sS "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-H3-2K-武庚纪",
    "prompt": "镜头从山脚缓慢上升，最后停在云海之上",
    "seconds": 8,
    "resolution": "2k",
    "aspect_ratio": "9:16",
    "first_frame": "https://cdn.example.com/first.jpg",
    "last_frame": "https://cdn.example.com/last.jpg"
  }'
```

三款任务都用创建响应中的 `id` [查询状态](#查询任务)。`queued` 和 `in_progress` 继续轮询，`completed` 后[下载 MP4](#下载视频)，`failed` 时停止并读取 `error.message`。创建请求超时先查任务记录，以免重复生成和扣费。

**验证范围**　上述能力和数量上限来自公开接口定义。DreamStudio Video 1.4.0 已在 New API v1.0.0-rc.51 上使用模拟上游验证三款的创建、查询和下载。三款的真实素材上传和付费生成效果尚未联测。[验证记录](VALIDATION.md)

### 标准版、LH 与 FL2V

| `model` | 用法 |
|---|---|
| `minimax-h3` | 标准版，可使用上面的文生视频示例 |
| `minimax-h3-lh` | [H3 LH 请求示例](#h3-lh-请求示例)，尺寸按服务方开放的档位选择 |
| `minimax-h3-fl2v` | 首帧必填，尾帧可选。[FL2V 单图和双图](#h3-fl2v-首尾帧请求示例) |

| 字段 | 用法 |
|---|---|
| `model` | 必填，选择上表中已开通的型号 |
| `prompt` | 必填，用文字描述画面和动作 |
| `seconds` | 可选，`4` 至 `15` 的整数，也可传数字字符串。省略时使用 `4` 秒 |
| `size` | 可选，见下方常用画幅和 [2K、4K 档位](#h3-的-2k-和-4k)。省略时使用竖屏 `768x1376` |
| `images` | H3 标准版和已开放参考图的 LH 可传 1 至 9 个可公开读取的图片 URL。FL2V 使用 `multipart/form-data` 发送 1 至 2 份同名 `images` 图片文件，按首帧、尾帧顺序排列 |

### H3 常用画幅

标准版、LH 和 FL2V 都可以直接填写表中的 `size`，省略 `aspect_ratio`。这三个尺寸都归到 768P 档，单价以各模型在 New API 上配置的价格为准。

| 画幅 | `size` |
|---|---|
| 横屏（约 16:9） | `1376x768` |
| 竖屏（约 9:16） | `768x1376` |
| 方形（1:1） | `1024x1024` |

### H3 的 2K 和 4K

使用 `minimax-h3` 或 `minimax-h3-fl2v` 时，如果服务方已开通对应档位，把请求里的 `size` 改为大写的 `"2K"` 或 `"4K"`。New API 按选用的档位计费。LH 请使用服务方开放的 480P 或 768P 档位。

以下命令沿用开头设置的 New API 地址和令牌，用 `minimax-h3` 创建一段 5 秒的 2K 视频。调用 4K 时，把命令中的 `"size": "2K"` 改成 `"size": "4K"`。

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "minimax-h3",
    "prompt": "云海在群山之间缓慢流动，镜头向前推进",
    "seconds": 5,
    "size": "2K"
  }'
```

`2K` 和 `4K` 表示清晰度。如需指定画幅，请从下方尺寸表中选择明确的宽高，最高到 1080P 档。

<details>
<summary>查看客户端尺寸映射和完整尺寸表</summary>

已有 OpenAI Video 客户端可以继续使用下表中的常用尺寸。计量使用实际尺寸、时长和图片数。省略 `size` 时使用默认竖屏尺寸。需要指定画幅时，请填写 `size`。

| 请求的 `size` | 实际使用的 `size` | 计费档位 |
|---|---|---|
| `1280x720` | `1376x768` | 768P |
| `720x1280` 或省略 | `768x1376` | 768P |
| `1792x1024`、`1920x1080` | `1920x1088` | 1080P |
| `1024x1792`、`1080x1920` | `1088x1920` | 1080P |

下表列出标准版、LH 和 FL2V 的尺寸值，实际开放的档位以服务方配置为准。

| 尺寸类别 | `size` 可填值 |
|---|---|
| 480P | `864x480`、`480x864`、`640x640`、`544x800`、`800x544`、`576x736`、`736x576`、`992x416` |
| 768P | `1376x768`、`768x1376`、`1024x1024`、`832x1248`、`1248x832`、`896x1184`、`1184x896`、`1568x672` |
| 1080P | `1920x1088`、`1088x1920`、`1440x1440`、`1184x1760`、`1760x1184`、`1248x1664`、`1664x1248`、`2208x960` |
| 2K | `2K` |
| 4K | `4K` |

</details>

### H3 参考图请求示例

把示例中的图片 URL 换成可公开读取的 HTTP 或 HTTPS 地址。服务方开放了 LH 版参考图时，也可以把下方命令的 `model` 改为 `minimax-h3-lh`。

**JSON**。已有 OpenAI Video 客户端可以使用 `input_reference.image_url`，该 URL 按一张图片计量。下方命令省略了时长，会按 4 秒和 `1376x768`（768P）提交和计费。

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "minimax-h3",
    "prompt": "保留参考图中的主角，镜头缓慢拉远",
    "size": "1280x720",
    "input_reference": { "image_url": "https://cdn.example.com/reference.jpg" }
  }'
```

**multipart**。同一请求也可以用 `input_reference[image_url]` 文本字段提交。

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  --form-string 'model=minimax-h3' \
  --form-string 'prompt=保留参考图中的主角，镜头缓慢拉远' \
  --form-string 'size=1280x720' \
  --form-string 'input_reference[image_url]=https://cdn.example.com/reference.jpg'
```

如果需要传多张图片，改用 JSON 的 `images` 数组，并省略 `input_reference`。

```json
{
  "model": "minimax-h3",
  "prompt": "保留参考图中的主角，镜头缓慢拉远",
  "seconds": 5,
  "size": "1376x768",
  "images": [
    "https://cdn.example.com/reference.jpg",
    "https://cdn.example.com/reference-2.jpg"
  ]
}
```

### H3 LH 请求示例

沿用上文的 New API 地址和令牌。以下示例使用 `1376x768` 生成 5 秒视频。

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "minimax-h3-lh",
    "prompt": "一只橘猫望向窗外，镜头缓慢靠近",
    "seconds": 5,
    "size": "1376x768"
  }'
```

### H3 FL2V 首尾帧请求示例

向 `POST /v1/videos` 提交 `multipart/form-data`。首帧必填，尾帧可选。每张图片都作为独立的二进制文件提交，**字段都叫 `images`**。传两张图时，**第一份 `images` 是首帧，第二份 `images` 是尾帧**。`curl --form` 按命令中的顺序发送文件，并自动生成 multipart 的 `Content-Type` 和 boundary。

下面的命令沿用上文的 New API 地址和令牌。将当前目录下的 JPEG 文件名替换成你的文件路径。示例使用 `864x480` 和 4 秒。

#### 单图（仅首帧）

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  --form-string 'model=minimax-h3-fl2v' \
  --form-string 'prompt=从首帧开始，镜头缓慢推进' \
  --form-string 'seconds=4' \
  --form-string 'size=864x480' \
  --form 'images=@./first.jpg;type=image/jpeg'
```

#### 双图（首帧和尾帧）

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  --form-string 'model=minimax-h3-fl2v' \
  --form-string 'prompt=固定镜头，画面平滑过渡' \
  --form-string 'seconds=4' \
  --form-string 'size=864x480' \
  --form 'images=@./first.jpg;type=image/jpeg' \
  --form 'images=@./last.jpg;type=image/jpeg'
```

创建后使用返回的 `id` 查询，任务完成后从 `/v1/videos/{id}/content` 下载。[查询任务](#查询任务) · [下载视频](#下载视频)

## 其他模型

如果你的令牌开通了下列模型，可用对应的 JSON 请求体调用同一个 `/v1/videos` 接口。尺寸和参数按各模型填写。

| 模型 | 参数要点 | 请求体示例 |
|---|---|---|
| `wan3.0-video` | `seconds` 为 2 至 30，`resolution` 使用 `480P`、`720P` 或 `1080P` | [Wan](../examples/wan.json) |
| `sd-2.0`、`sd-2.5` | `seconds` 为 4 至 30，`resolution` 使用小写，例如 `720p` | [Seedance SD](../examples/sd.json) |
| `mg-seedance-2.0-720p`、`mg-seedance-2.5-480p`、`mg-seedance-2.5-720p`、`mg-seedance-2.5-4k` | `seconds` 为 4 至 30，提供 `aspect_ratio`，例如 `16:9` | [Seedance](../examples/mg.json) |
| `ov-seedance-2.5-480p-nv`、`ov-seedance-2.5-720p-nv`、`ov-seedance-2.5-1080p-nv` | 沿用 Seedance 请求结构并填写相应的完整模型名 | [Seedance](../examples/mg.json) |
| `特价V2seedance-2.5-720p-30s`、`特价seedance-2.5-480p-30s`、`特价seedance-2.5-nv-1080p-30s`、`特价seedance-2.5-nv-480p`、`特价seedance-2.5-nv-720p-30s` | 沿用 Seedance 请求结构并填写相应的完整模型名 | [Seedance](../examples/mg.json) |
| `Video-upscale2.6` | 使用 `reference_video` 提供输入视频 URL，省略 `seconds` | [视频超分](../examples/upscale.json) |

## 常见问题

- **返回 401 或 403**。检查请求是否带上 New API 的 Bearer 令牌，以及令牌是否有该模型或任务的访问权限。
- **找不到模型或没有可用渠道**。核对模型名及大小写，向服务方确认令牌已开通此模型。
- **提示参数错误**。先对照对应模型的最小示例检查请求体。H3 标准版的示例使用 `size: "1376x768"`；15S 和 30S 固定尺寸，武庚纪用 `resolution: "2k"`，Wan 示例用 `resolution: "720P"`。
- **提交超时或任务仍在排队**。先在任务记录里确认是否已经创建，避免再次提交产生重复任务。
