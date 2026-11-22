---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.0.1'
locale: 'zh-CN'
---
# Changelog

## [1.0.1]

### Fixed
- 将插件标识改为带 GitHub 作者前缀的 crazycherrys_xysnai-video，并补齐作者 CrazyCherrys 及其 GitHub 主页，满足社区市场的安装校验。
- 发布到与新标识一致的目录并更新市场入口；不带前缀的 1.0.0 不再列入当前市场。

### Migration
- 19 个 xysnai/ 模型的用量事实和计费计算保持不变。若已在 xysnai-video 下配置插件级价格覆盖，管理员需在 crazycherrys_xysnai-video 下重新配置；不会自动迁移。
- 刷新市场后安装新 key 的 1.0.1。已安装旧 key 的用户需将类型 61 渠道重新绑定到新插件；XYSNAI Base URL、密钥与模型名保持原配置。
