# XYSNAI Video 部署与计费

本文面向 New API 管理员。部署完成后，把网关地址、已开放的模型与[用户调用文档](API.md)交给调用者。渠道侧的 XYSNAI API Key 填在 New API 后台，调用者使用自己的 New API 令牌。

## 安装并配置渠道

XYSNAI Video **1.2.0** 已在官方 New API `v1.0.0-rc.51` 上通过隔离验证。[验证记录](VALIDATION.md)

1. 用超级管理员账号启用任务插件功能。通过[市场源](../../../README.md#添加市场源)安装并启用 **XYSNAI Video 1.2.0**，或[下载固定版本插件](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_xysnai-video/1.2.0/plugin.js)后上传。
2. 新建 **Task Plugin（61）** 渠道，选择 `crazycherrys_xysnai-video`。上游 Base URL 填 `https://xysnai.cn`，API Key 填 XYSNAI 平台密钥。插件会在上游地址后追加 `/v1/videos`。
3. 先开通 `minimax-h3`，选择调用令牌有权限访问的分组，模型映射留空。按需要再添加其他模型。[插件声明的模型目录](../model-catalog.json)
4. 保存模型价格后，用一枚 New API 测试令牌走一遍创建、查询和下载，核对相应的扣费日志。用真实渠道提交会消耗上游额度。[用户调用步骤](API.md)

rc.51 安装时报 `MiniMax-H3` 与 `minimax-h3` 冲突时，先检查内置 Hailuo 的关联渠道与进行中的任务。确定可以停用 `hailuo` 后，再安装 XYSNAI Video。已使用旧模型前缀的实例，升级后需要将渠道、客户端、令牌限制及价格键改用无前缀模型名。

## 配置 MiniMax H3 价格

在 **系统设置 → 模型价格** 中找到 `minimax-h3`，选择 **任务用量定价 → 表达式编辑器**，粘贴下方整段。如果列出了多个提供方，在 XYSNAI Video 的插件级价格覆盖中设置，键为 `crazycherrys_xysnai-video::minimax-h3`。原始表达式输出 USD，最终扣费会乘以 New API 分组倍率。[New API 计费文档](https://docs.newapi.pro/zh/docs/plugins/billing)

表达式按 2026 年 11 月 20 日人民币中间价 **1 USD = ¥6.7131** 换算。XYSNAI 标准 H3 的输出档位从低到高为 ¥0.05、¥0.08、¥0.14、¥0.20、¥0.25 每秒。`images` 前 5 张免费，之后 ¥0.10 每张。根据实际结算汇率和计划售价调整表达式。[汇率中间价](https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do?endDate=2026-11-20&queryYN=true&startDate=2026-11-20) · [XYSNAI 上游费率](https://xysnai.cn/api/model-marketplace/detail?model_id=4d25e564-875f-44ef-bdf5-d0f3194a10b1)

```text
u("resolution") == "480P"
  ? tier("480P", (u("seconds") * 0.05 + max(u("input_images") - 5, 0) * 0.10) / 6.7131)
  : u("resolution") == "768P"
  ? tier("768P", (u("seconds") * 0.08 + max(u("input_images") - 5, 0) * 0.10) / 6.7131)
  : u("resolution") == "1080P"
  ? tier("1080P", (u("seconds") * 0.14 + max(u("input_images") - 5, 0) * 0.10) / 6.7131)
  : u("resolution") == "2K"
  ? tier("2K", (u("seconds") * 0.20 + max(u("input_images") - 5, 0) * 0.10) / 6.7131)
  : tier("4K", (u("seconds") * 0.25 + max(u("input_images") - 5, 0) * 0.10) / 6.7131)
```

分组倍率为 `1` 时，用 `1376x768` 生成 5 秒视频的基础金额约为 `$0.059585`，传 6 张 `images` 则约为 `$0.074481`。这段配置已经在隔离的 rc.51 上验证了五个档位的预扣。

- **素材计费**。此表达式覆盖纯文本和明确传入的 `images`。XYSNAI 按参考视频的实际时长收费，插件只上报视频数量。`input_reference` 还可能是图片或视频。此价格表达式不会拦截这些请求。按上游成本收费的服务应先限制 `reference_video`、`reference_videos` 和 `input_reference`，再开放对应输入。
- **H3 变体**。`minimax-h3-fl2v` 使用相同的公开费率，可在其价格项单独粘贴。`minimax-h3-lh` 的公开价格只有 `480P` 的 ¥0.01/秒和 `768P` 的 ¥0.04/秒，需要独立定价。[FL2V 费率](https://xysnai.cn/api/model-marketplace/detail?model_id=4235d267-9fd0-4b78-8d94-0b813c383cb2) · [LH 费率](https://xysnai.cn/api/model-marketplace/detail?model_id=f9033ed1-a558-4b0c-8e90-4675eac83a37)
- **其他模型**。按各自上游口径和用量字段定价。部分 Seedance 型号按任务计费。视频超分按上游实际用量收费，现阶段可配置明确的按次售价，实际时长结算需要先核实上游返回字段。[XYSNAI 模型目录](https://xysnai.cn/zh/models)

## 排查接入

| 症状 | 检查项 |
|---|---|
| 模型不可调用 | 启用插件并检查渠道模型、分组和令牌模型限制 |
| `model_price_error` | 检查当前模型或提供方的计费配置，表达式字段需匹配 1.2.0 的用量定义 |
| 上游鉴权失败 | 检查类型 61 渠道的 XYSNAI API Key 和 Base URL |
| 任务长期无进度或无法下载 | 根据 New API 任务 ID 查看后台轮询、上游响应和内容代理日志 |

上线验收优先使用 JSON。真实 XYSNAI 请求、multipart 上传及 HEAD/Range 以部署后的实际测试为准。[验证范围](VALIDATION.md)
