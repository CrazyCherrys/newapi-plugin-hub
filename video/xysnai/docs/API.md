# 通过 New API 调用 DreamStudio Video

使用 DreamStudio Video 创建视频、查询任务和下载视频。

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

### 15S、30S 和 2K 武庚纪

| `model` | `seconds` | 画面与可选参数 |
|---|---|---|
| `MiniMax-H3-15S` | 必填，4、6、8、12 或 15 | 固定 1344×768，`aspect_ratio` 可填 `16:9` |
| `MiniMax-H3-30S` | 固定 30，可省略 | 固定 1184×672，`aspect_ratio` 可填 `16:9` |
| `MiniMax-H3-2K-武庚纪` | 必填，5 至 28 的整数 | `resolution` 可填小写 `2k`，`aspect_ratio` 可选 `9:16`、`16:9`、`1:1` |

三款都要求提供 `prompt`，最长 20,000 字符。可选的 `reference_images`、`reference_videos`、`reference_audios` 分别最多 9、3、3 项。JSON 用 URL 数组，上传文件用同名的 multipart 文件字段。武庚纪可用 `first_frame` 和 `last_frame` 各传一张图，`generation_mode` 可选 `reference`、`multimodal`、`text`、`image_video` 或 `image_audio`。

沿用上方的网关地址和令牌，以下 Bash 命令创建一条 5 秒的 2K 任务，会消耗额度。返回的 `id` 用于上方的查询与下载步骤。另两款的最小请求体见 [15S 示例](../examples/minimax-15s.json) 和 [30S 示例](../examples/minimax-30s.json)。

```bash
curl --fail-with-body -sS "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"model":"MiniMax-H3-2K-武庚纪","prompt":"镜头缓缓推向山顶","seconds":5,"resolution":"2k","aspect_ratio":"16:9"}'
```

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
- **提示参数错误**。先对照对应模型的最小示例检查请求体。H3 用 `size: "1376x768"`，Wan 示例用 `resolution: "720P"`。
- **提交超时或任务仍在排队**。先在任务记录里确认是否已经创建，避免再次提交产生重复任务。
