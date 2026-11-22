---
changelogVersion: 1
plugin: 'xysnai-video'
version: '1.0.0'
locale: 'zh-CN'
---
# Changelog

## [1.0.0]

### Added
- 新增 XYSNAI Video 任务插件，以带命名空间的名称接入 Wan、MiniMax H3、Seedance 与视频超分共 19 个模型。
- 支持 JSON 与 multipart 提交、异步轮询以及携带上游鉴权的视频内容请求。
- 保留各模型的参数与独立用量配置，包括时长、分辨率、尺寸、音频与素材数量；超分计费时长仅在上游实际返回时报告。

### Migration
- 本插件独立配置模型价格；Leonardo 的渠道配置和价格不会自动迁移。
- 新建 Task Plugin（61）渠道并绑定 xysnai-video，Base URL 填 https://xysnai.cn，配置 XYSNAI API Key，使用声明的 xysnai/ 模型名称；启用请求前逐个配置模型用量价格。
- 超分需要明确的定价策略；不能用输出视频时长替代上游实例计费时间，也不能将缺失的 billing_seconds 视为零。
