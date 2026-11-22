# 通过 New API 调用 XYSNAI 视频接口

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

本页列出的 19 个插件模型共用这三个接口。创建时通过 JSON 的 `model` 选择型号，其余字段按所选模型填写。你的令牌能调用哪些模型，以服务方实际开通的列表为准。

## 创建任务

下方以标准版 `minimax-h3` 为例，生成一段 5 秒视频。[H3 型号与参数](#minimax-h3-型号与参数) · [其他模型](#其他模型)

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

三个型号都使用 `POST /v1/videos`，都需要 `prompt`、`seconds` 和 `size`。切换型号时，在 `model` 中填写对应的完整名称，再按该型号的要求准备素材。

| `model` | 用法 |
|---|---|
| `minimax-h3` | 标准版，可使用上面的文生视频示例 |
| `minimax-h3-lh` | [H3 LH 请求示例](#h3-lh-请求示例)，尺寸按服务方开放的档位选择 |
| `minimax-h3-fl2v` | [H3 首尾帧版基础请求](#h3-fl2v-基础请求)，素材格式见该示例前的说明 |

| 字段 | 用法 |
|---|---|
| `model` | 必填，选择上表中已开通的型号 |
| `prompt` | 必填，用文字描述画面和动作 |
| `seconds` | 必填，`4` 至 `15` 的整数 |
| `size` | 必填，输出尺寸，例如 `1376x768`。使用下表中的值 |
| `images` | 可选。服务方开放参考图时，传入 1 至 9 个可公开读取的图片 URL |

| 尺寸类别 | `size` 可填值 |
|---|---|
| 480P | `864x480`、`480x864`、`640x640`、`544x800`、`800x544`、`576x736`、`736x576`、`992x416` |
| 768P | `1376x768`、`768x1376`、`1024x1024`、`832x1248`、`1248x832`、`896x1184`、`1184x896`、`1568x672` |
| 1080P | `1920x1088`、`1088x1920`、`1440x1440`、`1184x1760`、`1760x1184`、`1248x1664`、`1664x1248`、`2208x960` |
| 2K | `2K` |
| 4K | `4K` |

如果服务方为标准版 `minimax-h3` 开放了参考图，可用下面的 JSON。把图片 URL 换成实际可访问的地址。

```json
{
  "model": "minimax-h3",
  "prompt": "保留参考图中的主角，镜头缓慢拉远",
  "seconds": 5,
  "size": "1376x768",
  "images": ["https://cdn.example.com/reference.jpg"]
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

XYSNAI 将此型号标为首尾帧模式，但公开示例只包含模型名、提示词、时长和尺寸。`images` 在文档中是通用图片 URL 数组，首尾帧专用字段和数组顺序尚未公布。实际传入首尾帧前，请向服务方确认字段与顺序。下方命令对应官方的无素材基础请求。[XYSNAI FL2V 接口文档](https://xysnai.cn/zh/docs?model_id=4235d267-9fd0-4b78-8d94-0b813c383cb2)

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
