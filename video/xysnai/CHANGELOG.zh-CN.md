---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.3.0'
locale: 'zh-CN'
---
# Changelog

## [1.3.0]

### Added
- H3 接受 6 个常用的 OpenAI Video 和全高清尺寸，并转换为 XYSNAI 支持的尺寸。省略时长时使用 4 秒，省略尺寸时使用 `768x1376`。
- H3 标准版和 LH 版将 `input_reference.image_url` 对象及对应 multipart 文本字段转为一张 `images` 图片。FL2V 需另行确认首尾帧素材格式。

### Migration
- 现有模型价格表达式继续使用原字段。档位、时长和图片数按规范化后实际转发的请求计量。为 LH 版开放高分辨率别名前，请核对该档位售价。
- 客户端继续通过原视频接口使用模型。兼容尺寸映射后实际像素可能变化，要求固定像素时请填写上游原生尺寸。
