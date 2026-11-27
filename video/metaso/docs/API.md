# 通过 New API 调用 MetaSo H3 Video

使用服务方提供的网关地址和 **New API 令牌**。以下命令在 Bash 终端执行，示例域名与令牌请替换成实际值。提交生成任务会消耗额度，模型权限和价格以服务方为准。

```bash
export NEW_API_BASE_URL='https://gateway.example.com'
export NEW_API_TOKEN='替换为你的 New API 令牌'
```

| 操作 | 方法和路径 |
|---|---|
| 创建任务 | `POST /v1/videos` |
| 查询任务 | `GET /v1/videos/{id}` |
| 下载视频 | `GET /v1/videos/{id}/content` |

## 创建视频

下面的请求生成 4 秒横屏视频。需要参考图片时，在同一请求体中添加 `input_reference`，例如 `"input_reference": {"image_url": "https://cdn.example.com/reference.jpg"}`。素材 URL 需要可公开访问。

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{
    "model": "metaso-minimax-h3",
    "prompt": "一只橘猫穿过雨后的街道，镜头缓慢跟随",
    "seconds": 4,
    "size": "1280x720"
  }'
```

| 字段 | 用法 |
|---|---|
| `model` | 使用 `metaso-minimax-h3` |
| `prompt` | 描述画面或动作。若 `metadata.metaso_content` 已含文字项，使用数组里的文字 |
| `seconds` | `4` 至 `15` 的整数，默认 `4` |
| `size` | 下表列出四种预设，默认竖屏 `720x1280` |
| `input_reference` | 可选，使用 `image_url` 提供单张参考图的链接 |

| `size` | 分辨率 | 画幅 |
|---|---|---|
| `1280x720` | `768P` | `16:9` |
| `720x1280` | `768P` | `9:16` |
| `1792x1024` | `2K` | `16:9` |
| `1024x1792` | `2K` | `9:16` |

也可省略 `size`，在请求体或 `metadata` 中填写 `resolution` 和 `ratio`，也兼容 `metaso_resolution` 和 `metaso_ratio`。`resolution` 支持 `768P` 和 `2K`，`ratio` 支持 `adaptive`、`21:9`、`16:9`、`4:3`、`1:1`、`3:4` 和 `9:16`。同时传 `size` 时，请使用与该预设一致的值。

### 多张参考图或参考音频

将下方 JSON 作为 `POST /v1/videos` 的请求体。`metadata.metaso_content` 按数组顺序提交素材。下面的链接为占位地址，请换成可访问的素材。

```json
{
  "model": "metaso-minimax-h3",
  "seconds": 5,
  "size": "1792x1024",
  "metadata": {
    "metaso_content": [
      { "type": "text", "text": "参考图片构建场景，并随音频节奏缓慢推进镜头" },
      { "type": "image_url", "role": "reference_image", "image_url": { "url": "https://cdn.example.com/reference.jpg" } },
      { "type": "image_url", "role": "reference_image", "image_url": { "url": "https://cdn.example.com/scene.jpg" } },
      { "type": "audio_url", "role": "reference_audio", "audio_url": { "url": "https://cdn.example.com/reference.mp3" } }
    ]
  }
}
```

每个任务最多 9 张图片和 3 段音频。如需指定首帧或尾帧，请在数组中把相应图片的 `role` 设为 `first_frame` 或 `last_frame`。尾帧需与首帧一起提交，且排在首帧后面。当前版本拒绝参考视频链接和上传。

### 上传本地参考图

在终端当前目录放置 `reference.png`，或在命令中替换文件路径。`curl --form` 会自动设置 multipart 请求头。也可用 `reference_image` 字段上传图片，或用 `reference_audio` 上传参考音频。支持 PNG、JPEG、WebP 图片和 MP3、M4A、WAV 音频。每张图片最多 30 MiB，每段音频最多 15 MiB。单次请求总上限由网关设置，New API 默认 128 MiB。

```bash
curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  --form-string 'model=metaso-minimax-h3' \
  --form-string 'prompt=保持参考图中的人物形象，镜头缓慢靠近' \
  --form-string 'seconds=4' \
  --form-string 'size=720x1280' \
  --form 'input_reference=@./reference.png;type=image/png'
```

## 查询与下载

保存创建响应中的 `id`，将它填入 `VIDEO_ID`。隔几秒查询一次，收到 `completed` 或 `failed` 后停止。`queued` 表示在排队，`in_progress` 表示正在生成。

```bash
export VIDEO_ID='替换为创建响应中的 id'

curl --fail-with-body --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos/$VIDEO_ID" \
  -H "Authorization: Bearer $NEW_API_TOKEN"
```

状态为 `completed` 后，用同一个任务 ID 下载。命令会将视频保存到当前目录的 `result.mp4`。

```bash
curl --fail --silent --show-error \
  "$NEW_API_BASE_URL/v1/videos/$VIDEO_ID/content" \
  -H "Authorization: Bearer $NEW_API_TOKEN" \
  --output result.mp4
```
