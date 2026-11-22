# 通过 New API 调用 XYSNAI 视频接口

使用服务方提供的 **New API 地址**和有模型权限的 **New API 令牌**。下方命令可在任意目录的 Bash 终端运行。把示例域名和令牌替换为实际值。基础地址省略末尾的 `/` 和 `/v1`，命令会补上接口路径。可用模型及售价以服务方为准，提交视频任务会消耗额度。

```bash
export NEW_API_BASE_URL='https://your-newapi.example.com'
export NEW_API_TOKEN='替换为你的 New API 令牌'
```

| 操作 | 方法和路径 |
|---|---|
| 创建视频任务 | `POST /v1/videos` |
| 查询任务 | `GET /v1/videos/{id}` |
| 下载视频 | `GET /v1/videos/{id}/content` |

## 创建任务

用 `minimax-h3` 生成一段 5 秒视频。请求体使用 JSON。

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

## MiniMax H3 请求参数

| 字段 | 用法 |
|---|---|
| `model` | 必填，填写服务方已开放的模型名，例如 `minimax-h3` |
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

如果服务方开放了参考图，可将创建命令的 JSON 换成下面的请求体。把图片 URL 换成实际可访问的地址。

```json
{
  "model": "minimax-h3",
  "prompt": "保留参考图中的主角，镜头缓慢拉远",
  "seconds": 5,
  "size": "1376x768",
  "images": ["https://cdn.example.com/reference.jpg"]
}
```

## 其他模型

如果你的令牌开通了下列模型，可用对应的 JSON 请求体调用同一个 `/v1/videos` 接口。尺寸和参数按各模型填写。

| 模型 | 参数要点 | 请求体示例 |
|---|---|---|
| `wan3.0-video` | `seconds` 为 2 至 30，`resolution` 使用 `480P`、`720P` 或 `1080P` | [Wan](../examples/wan.json) |
| `sd-2.0`、`sd-2.5` | `seconds` 为 4 至 30，`resolution` 使用小写，例如 `720p` | [Seedance SD](../examples/sd.json) |
| `mg-…`、`ov-…` 和特价 Seedance | 填写服务方列出的完整模型名，提供 `aspect_ratio`，例如 `16:9` | [Seedance](../examples/mg.json) |
| `Video-upscale2.6` | 使用 `reference_video` 提供输入视频 URL，省略 `seconds` | [视频超分](../examples/upscale.json) |

## 常见问题

- **返回 401 或 403**。检查请求是否带上 New API 的 Bearer 令牌，以及令牌是否有该模型或任务的访问权限。
- **找不到模型或没有可用渠道**。核对模型名及大小写，向服务方确认令牌已开通此模型。
- **提示参数错误**。先对照对应模型的最小示例检查请求体。H3 用 `size: "1376x768"`，Wan 示例用 `resolution: "720P"`。
- **提交超时或任务仍在排队**。先在任务记录里确认是否已经创建，避免再次提交产生重复任务。
