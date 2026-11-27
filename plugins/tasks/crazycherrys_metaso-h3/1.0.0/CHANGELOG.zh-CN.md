---
changelogVersion: 1
plugin: 'crazycherrys_metaso-h3'
version: '1.0.0'
locale: 'zh-CN'
---

# Changelog

## [1.0.0]

### Added

- 通过 New API 标准视频接口生成 768P 或 2K 的 MiniMax H3 视频。支持文字、图片、首尾帧和音频参考。
- 用量包含输出时长、分辨率及超过前 5 张的输入图片。当前宿主无法测量参考视频计费时长，插件在提交前拒绝参考视频。
- 通过 New API 代理下载已完成的视频，下载请求不携带渠道密钥。

### Migration

- 为新模型 `metaso-minimax-h3` 设置任务用量计费。新建 61 类型渠道，绑定本插件并填入秘塔 API 密钥。现有 DreamStudio Video 渠道和价格可继续使用。
