---
locale: zh-CN
---
# DreamStudio Video

通过 New API 的 `/v1/videos` 接口使用 XYSNAI 视频模型。插件声明 22 个模型，覆盖 MiniMax H3、Wan、Seedance 和视频超分。部署方决定实际开放的模型。

- **用户调用**。用服务方提供的 New API 地址和令牌创建任务、查询状态并下载视频。[用户调用文档](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/xysnai/docs/API.md)
- **管理员接入**。安装或升级到 1.4.0。首次接入需配置 Task Plugin（61）渠道及模型价格。部署指南包含 H3 的五档美元计费表达式。[部署与计费](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/xysnai/docs/ADMIN.md)

插件标识为 `crazycherrys_xysnai-video`，使用 New API Task Plugin API v1 的 `openai_video` 协议。新增的 MiniMax-H3-15S 和 MiniMax-H3-30S 按条计费，MiniMax-H3-2K-武庚纪 按输出秒数计费。原有三款 H3 可沿用已配置的分辨率价格。[验证记录](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/xysnai/docs/VALIDATION.md) · [更新日志](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/plugins/tasks/crazycherrys_xysnai-video/1.4.0/CHANGELOG.zh-CN.md)
