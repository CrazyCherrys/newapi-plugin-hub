# MetaSo H3 Video 部署与计费

本指南适用于插件 **1.0.0** 和 **New API v1.0.0-rc.51** 的 `openai_video` 协议。新建独立渠道和模型价格。用户通过自己的 New API 令牌提交请求。 [用户调用文档](API.md)

## 安装并配置渠道

1. 使用 New API 的超级管理员账号启用任务插件，从 Hub 市场安装并启用 **MetaSo H3 Video 1.0.0**。也可下载固定版本插件后上传。 [市场源配置](../../../README.md#添加市场源) · [下载插件](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_metaso-h3/1.0.0/plugin.js)
2. 新建 **Task Plugin（61）** 渠道，选择插件 `crazycherrys_metaso-h3`。Base URL 使用 `https://metaso.cn/api`，API Key 使用 MetaSo H3 平台密钥。 [MetaSo 官方接入教程的任务插件页](https://metaso.cn/minimax-h3/new-api-guide)
3. 渠道模型填写 `metaso-minimax-h3`，选中调用令牌可用的分组，模型映射留空。插件会把该模型转为上游模型名 `MiniMax-H3`。
4. 保存模型价格后，用一枚 New API 测试令牌调用 768P，再验证 2K。对照任务状态、下载结果和扣费日志。连接真实渠道提交任务会消耗上游额度。 [用户调用示例](API.md)

此插件采用独立的模型名与类型 61 渠道。公开接入面向 4–15 秒、768P 和 2K 的标准生成任务，支持文字、参考图片和参考音频。当前 New API 无法在预扣前提供可信的参考视频时长，插件会拒绝参考视频请求。

公网域名如需将提交阶段的 HTTP 错误替换为通用响应，现有 Nginx 配置也覆盖此插件使用的 `/v1/videos`。它会限制同一域名的部分旧接口、任务列表和价格页面，启用前请核对这些路由的使用需求。 [Nginx 配置说明](../../xysnai/docs/NGINX.md)

## 配置任务用量价格

1. 在 New API 打开 **系统设置 → 计费与支付 → 模型定价 → 模型价格**。如果模型还未定价，可在 **未设置价格模型** 中查找 `metaso-minimax-h3`。
2. 选中模型，打开 **MetaSo H3 Video** 标签，开启 **为此服务方单独设置**。
3. 将 **编辑器模式** 切换为 **表达式编辑器**，把下方整段公式粘贴到 **计费表达式** 框，再点击 **保存模型价格** 并确认。**请求规则计费** 用于设置请求倍率，留空即可。 [New API 计费文档](https://docs.newapi.pro/zh/docs/plugins/billing)

| 用量字段 | 含义 |
|---|---|
| `resolution` | 输出价格档位 `768P` 或 `2K`。画幅比例不参与计费 |
| `seconds` | 输出视频秒数。请求未指定时按 4 秒预扣 |
| `image_count_after_free` | 超出前五张免费额度的输入图片数，包含通过 `first_frame` 或 `last_frame` 提交的图片 |

MetaSo 官网列出的标准通道、15 秒及以内档位，按以下人民币价格展示。官网人民币报价由积分折算并四舍五入，使用前请以账号有效报价为准。 [MetaSo 视频定价](https://metaso.cn/minimax-h3)

| 计费项 | `768P` | `2K` |
|---|---:|---:|
| 输出视频每秒 | ¥0.09 | ¥0.15 |
| 超出前五张的每张图 | ¥0.05 | ¥0.05 |
| 输入音频 | 免费 | 免费 |

下式以示例汇率 **1 USD = ¥7.00** 把人民币单价转换为美元。保存前请将两处 `7.00` 换成你的结算汇率，并按实际售价调整各单价。New API 会在表达式返回的美元基础金额上应用分组倍率。

```text
u("resolution") == "768P"
  ? tier("768P", (u("seconds") * 0.09 + u("image_count_after_free") * 0.05) / 7.00)
  : tier("2K", (u("seconds") * 0.15 + u("image_count_after_free") * 0.05) / 7.00)
```

## 核对扣费

开放模型前，请在自己的 New API 实例和真实上游账号核对成功任务的最终扣费、失败任务的退款，以及提交第六张图片时是否按一张额外图片结算。以 1 USD = ¥7.00、分组倍率为 1 为例，768P 生成 4 秒且不超过五张图时，表达式返回约 $0.0514。2K 生成 8 秒并使用七张图时，表达式返回约 $0.1857。

本地 lint 和 14 个宿主测试用例通过。在独立的 New API v1.0.0-rc.51 与模拟上游中，验证了与 DreamStudio Video 同时启用、提交和轮询、multipart 图片上传及 GET/HEAD 下载。按本页公式，768P 任务预扣 4 秒并按实际 5 秒结算。2K 任务输入 7 张图时只计 2 张超额图片。失败任务全额退款，参考视频在请求上游和扣费之前被拒绝。真实 MetaSo 接口和生产实例仍待联调。
