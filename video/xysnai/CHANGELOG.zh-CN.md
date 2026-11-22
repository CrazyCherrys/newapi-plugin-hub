---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.1.0'
locale: 'zh-CN'
---
# Changelog

## [1.1.0]

### Changed
- 移除全部 19 个对外模型名及其用量分组中的 xysnai/ 服务商前缀，客户端直接使用 minimax-h3、wan3.0-video、Video-upscale2.6 等原始名称。
- 请求转发直接使用选中的上游模型名，不再自动去除前缀；示例和请求、响应 fixture 同步更新。

### Migration
- 用量字段和计费计算保持不变，但模型价格对应的名称发生变化。请为改名后的模型重新配置售价及插件级价格覆盖；不会自动迁移价格。
- 升级前完成进行中的任务。安装 1.1.0 后，更新渠道模型、客户端请求及令牌模型限制，并删除仍指向旧前缀模型名的映射。
- 插件 key crazycherrys_xysnai-video、XYSNAI Base URL 和 API Key 保持不变；插件 key 中的 GitHub 作者前缀仍用于满足社区安装要求。
