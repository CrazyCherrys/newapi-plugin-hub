---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.4.0'
locale: 'zh-CN'
---
# Changelog

## [1.4.0]

### Added
- 在现有视频创建、查询和下载接口接入 MiniMax-H3-15S、MiniMax-H3-30S 和 MiniMax-H3-2K-武庚纪。三款模型均支持图像、视频和音频参考，2K 武庚纪还支持首尾帧和生成模式。

### Migration
- 升级已有渠道，按需启用新模型名。15S 和 30S 分别配置每条视频的价格，2K 武庚纪配置每输出秒的价格。原有模型可沿用已配置的价格。
