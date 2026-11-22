---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.3.2'
locale: 'zh-CN'
---
# Changelog

## [1.3.2]

### Changed
- H3 定价表只按分辨率列出五档。原有请求尺寸仍按各自对应的档位计量。

### Migration
- 已保存的 `u("resolution")` 公式可继续使用，新建或修改价格请按分辨率配置。New API rc.51 中只有一个插件提供该模型时，已保存的 `u("size")` 公式仍可读取转发尺寸。多个插件共享同名模型时，请在升级前迁移按宽高定价的公式。
