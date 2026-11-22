---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.2.0'
locale: 'zh-CN'
---
# Changelog

## [1.2.0]

### Added
- 根据文档中的尺寸归类上报 H3 分辨率计费档位，同时上报原始尺寸和请求时长。

### Fixed
- 修正 New API 普通按次模式将用量当作价格倍率的问题，固定售价按任务收取一次。
- 按上游文档校验 H3 的宽高比、mode 和可选素材数组。只将文档中的 images 字段计入 H3 图片用量，类型不明的素材单独上报。

### Migration
- 固定按次价格现在每个请求只收一次。既有 seconds 和 size 计费表达式可继续使用。H3 的 input_images 按文档中的 images 字段统计，也可使用新增的 resolution 按档位定价。
- 请在 New API 中按模型和开放档位配置美元售价。输出时长和明确的图片数可以根据请求用量计价。启用输入视频按秒售价前，需与 XYSNAI 核对该项实际用量。
