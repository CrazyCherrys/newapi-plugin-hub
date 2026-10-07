---
changelogVersion: 1
plugin: 'leonardo-video'
version: '0.2.0'
locale: 'zh-CN'
---
# Changelog

## [0.2.0]

### Added
- Veo 3.1 与 Fast 新增 HTTPS 图片 URL（含 OSS 签名 URL）的首帧、首尾帧图生视频。
- 普通 Veo 3.1 新增多参考图生成，并支持 Leonardo UPLOADED/GENERATED 图片 ID。
- 新增 MiniMax H3（hailuo-03）文生视频、图生视频：固定 TURBO，5–15 秒，480p、768p、2K，始终生成音频。

### Security
- 校验图片来源；提交后不将图片签名 URL 写入插件返回的任务数据、私有状态或公开响应。

### Migration
- 既有 Veo 用量字段及计费表达式含义不变，分辨率枚举新增 480p、768p、2k。启用 H3 前必须为 hailuo-03 单独配置固定 TURBO 档位价格；不会自动迁移价格。
- 需主动升级到 0.2.0，按需在渠道添加 hailuo-03。原有 Veo 文本请求保持兼容；图片 URL 使用本插件定义的 input_reference 或 provider_options.leonardo 扩展。
