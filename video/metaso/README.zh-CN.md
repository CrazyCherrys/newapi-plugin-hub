---
locale: zh-CN
---
# MetaSo H3 Video

1.0.0 为 New API 的 `/v1/videos` 接口提供 `metaso-minimax-h3`。支持 768P 或 2K，生成 4–15 秒视频，可使用文字提示词、图片和参考音频。

- **用户调用**。用 New API 令牌创建任务、查询状态和下载视频。 [用户调用文档](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/metaso/docs/API.md)
- **管理员接入**。创建 Task Plugin（61）渠道，绑定 `crazycherrys_metaso-h3`，配置平台密钥和默认上游 Base URL `https://metaso.cn/api`，再设置两档用量价格。计费项包括输出视频时长和超过前五张的图片数。 [部署与计费](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/metaso/docs/ADMIN.md)

当前 New API 没有在预扣前提供可信的参考视频时长，因此插件会拒绝参考视频请求。开放模型前，请先在自己的 New API 实例验证生成和计费。
