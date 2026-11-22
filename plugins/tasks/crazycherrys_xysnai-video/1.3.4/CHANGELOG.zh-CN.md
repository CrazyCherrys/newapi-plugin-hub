---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.3.4'
locale: 'zh-CN'
---
# Changelog

## [1.3.4]

### Fixed
- 统一对外视频失败文案，避免插件在标准响应中回传上游错误原文。
- 移除用户调用文档里的上游链接，并提供旧任务查询、HTTP 错误及下载响应头的网关过滤配置。

### Migration
- 升级原插件即可沿用现有渠道和价格表达式。在公开网关应用 Nginx 配置，覆盖由宿主管理的错误和下载响应。
