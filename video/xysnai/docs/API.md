# 通过 New API 调用 DreamStudio Video

DreamStudio Video 通过 New API 提供 XYSNAI 的视频模型。

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

本页列出的 19 个插件模型共用这三个接口。创建时在请求体中填写 `model`，其余字段按所选型号填写。你的令牌能调用哪些模型，以服务方实际开通的列表为准。

## 创建任务

下方以标准版 `minimax-h3` 为例，生成一段 5 秒视频。[H3 型号与参数](#minimax-h3-型号与参数) · [参考图调用示例](#h3-参考图请求示例) · [其他模型](#其他模型)

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

三个型号都使用 `POST /v1/videos`。切换型号时，在 `model` 中填写对应的完整名称，再按该型号的要求准备素材。以下默认值和尺寸映射适用于插件 1.3.0 及以上版本。

| `model` | 用法 |
|---|---|
| `minimax-h3` | 标准版，可使用上面的文生视频示例 |
| `minimax-h3-lh` | [H3 LH 请求示例](#h3-lh-请求示例)，尺寸按服务方开放的档位选择 |
| `minimax-h3-fl2v` | [H3 首尾帧版基础请求](#h3-fl2v-基础请求)，素材格式见该示例前的说明 |

| 字段 | 用法 |
|---|---|
| `model` | 必填，选择上表中已开通的型号 |
| `prompt` | 必填，用文字描述画面和动作 |
| `seconds` | 可选，`4` 至 `15` 的整数，也可传数字字符串。省略时使用 `4` 秒 |
| `size` | 可选，见下方常用画幅和 [2K、4K 档位](#h3-的-2k-和-4k)。省略时使用竖屏 `768x1376` |
| `images` | 可选。服务方开放参考图时，传入 1 至 9 个可公开读取的图片 URL |

### H3 常用画幅

三款 H3 都可以直接填写表中的 `size`，省略 `aspect_ratio`。这三个尺寸都归到 768P 档，单价以各模型在 New API 上配置的价格为准。

| 画幅 | `size` |
|---|---|
| 横屏（约 16:9） | `1376x768` |
| 竖屏（约 9:16） | `768x1376` |
| 方形（1:1） | `1024x1024` |

### H3 的 2K 和 4K

使用 `minimax-h3` 或 `minimax-h3-fl2v` 时，如果服务方已开通对应档位，把请求里的 `size` 改为大写的 `"2K"` 或 `"4K"`。插件直接转发该值，New API 按对应档位计费。LH 的公开报价只覆盖 480P 和 768P。

`2K` 和 `4K` 表示清晰度。上游公开协议未说明默认画幅，也未列出与 `aspect_ratio` 的组合规则。需要固定画幅时，可以直接选择明确的宽高尺寸。

<details>
<summary>查看客户端尺寸映射和完整尺寸表</summary>

已有 OpenAI Video 客户端可以继续使用下表中的常用尺寸。插件按实际转发的尺寸、时长和图片数计量。仅传 `aspect_ratio` 时，插件仍会补齐默认的竖屏尺寸，建议按画幅直接填写 `size`。

| 客户端 `size` | 转发给 H3 的 `size` | 计费档位 |
|---|---|---|
| `1280x720` | `1376x768` | 768P |
| `720x1280` 或省略 | `768x1376` | 768P |
| `1792x1024`、`1920x1080` | `1920x1088` | 1080P |
| `1024x1792`、`1080x1920` | `1088x1920` | 1080P |

下表为 H3 原生尺寸。可用档位以服务方开放的配置为准，LH 的公开报价覆盖 480P 和 768P。

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

**JSON**。已有 OpenAI Video 客户端可以使用 `input_reference.image_url`。插件会将 URL 作为一张图片转发。下方命令省略了时长，会按 4 秒和 `1376x768`（768P）提交和计费。

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

沿用上文的 New API 地址和令牌。以下示例使用 `1376x768` 生成 5 秒视频。[XYSNAI LH 接口文档](https://xysnai.cn/zh/docs?model_id=f9033ed1-a558-4b0c-8e90-4673eac83a37)

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

### H3 FL2V 基础请求

XYSNAI 将此型号标为首尾帧模式，但公开示例只包含模型名、提示词、时长和尺寸。首尾帧专用字段与数组顺序尚未公布，插件会拒绝 FL2V 的 `input_reference` 图片对象。实际传入首尾帧前，请向服务方确认字段与顺序。下方命令对应官方的无素材基础请求。[XYSNAI FL2V 接口文档](https://xysnai.cn/zh/docs?model_id=4235d267-9fd0-4b78-8d94-0b813c383cb2)

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "minimax-h3-fl2v",
    "prompt": "一只橘猫望向窗外，镜头缓慢靠近",
    "seconds": 5,
    "size": "1376x768"
  }'
```

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
