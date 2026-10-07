---
changelogVersion: 1
plugin: 'leonardo-video'
version: '0.1.4'
locale: 'zh-CN'
---
# Changelog

## [0.1.4]

### Added
- 首次发布至插件市场，支持通过 Leonardo 调用 Veo 3.1 与 Veo 3.1 Fast 文生视频、异步查询和 MP4 下载。

### Fixed
- 优先使用渠道原始 API Key，规范化备用认证头，避免重复添加 Bearer 前缀。
- 拒绝包含空白或控制字符的无效 API Key。

### Migration
- 计费字段未改变。安装后需手动配置 Leonardo 渠道地址、密钥、模型和计费；安装不会迁移渠道配置。
- 从之前手动上传的版本升级时，管理员需明确安装此版本；刷新市场不会自动更新已安装插件。
