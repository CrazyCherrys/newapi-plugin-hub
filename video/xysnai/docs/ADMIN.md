# DreamStudio Video 部署与计费

本文面向 New API 管理员。部署完成后，把网关地址、已开放的模型与[用户调用文档](API.md)交给调用者。渠道侧的 XYSNAI API Key 填在 New API 后台，调用者使用自己的 New API 令牌。

## 安装并配置渠道

已有实例可刷新市场并升级到 DreamStudio Video **1.4.0**，继续使用同一插件标识 `crazycherrys_xysnai-video`、渠道和模型。[验证记录](VALIDATION.md)

1. 首次安装时，用超级管理员账号启用任务插件功能。通过市场安装并启用 **DreamStudio Video 1.4.0**，也可下载固定版本插件后上传。[市场源](../../../README.md#添加市场源) · [下载插件](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_xysnai-video/1.4.0/plugin.js)
2. 新建 **Task Plugin（61）** 渠道，选择 `crazycherrys_xysnai-video`。上游 Base URL 填 `https://xysnai.cn`，API Key 填 XYSNAI 平台密钥。插件会在上游地址后追加 `/v1/videos`。
3. 先开通 `minimax-h3`，选择调用令牌有权限访问的分组，模型映射留空。按需要再添加其他模型。[插件声明的模型目录](../model-catalog.json)
4. 保存模型价格后，用一枚 New API 测试令牌走一遍创建、查询和下载，核对相应的扣费日志。用真实渠道提交会消耗上游额度。[用户调用步骤](API.md)

rc.51 安装时报 `MiniMax-H3` 与 `minimax-h3` 冲突时，先检查内置 Hailuo 的关联渠道与进行中的任务。确定可以停用 `hailuo` 后，再安装 DreamStudio Video。仍在使用旧模型前缀的实例需要将渠道、客户端、令牌限制及价格键改用无前缀模型名。

## 对外视频网关

1.3.4 将标准视频接口里的任务失败文案统一为 `Video generation failed`。旧查询路由、提交时宿主直接返回的 HTTP 错误和下载响应头由网关处理。对外域名使用 Nginx 时，可加载配置并按指南检查现有控制台、价目表和通用任务接口的访问需求。[Nginx 使用指南](NGINX.md) · [配置文件](nginx-video-privacy.conf)

## 15S、30S 和 2K 武庚纪的价格

在现有类型 61 渠道中按需添加下表模型名，确认渠道密钥可访问 XYSNAI 的 `h3-mf` 分组。各模型名称可直接转发，模型映射留空。按下文 rc.51 的表达式编辑器步骤，分别保存对应模型的价格。

| 模型 | 2026-11-27 公开上游价 | 示例美元计费表达式 |
|---|---|---|
| `MiniMax-H3-15S` | ¥0.40/条 | `tier("base", u("requests") * 0.40 / 6.7131)` |
| `MiniMax-H3-30S` | ¥0.50/条 | `tier("base", u("requests") * 0.50 / 6.7131)` |
| `MiniMax-H3-2K-武庚纪` | ¥0.10/输出秒 | `tier("base", u("seconds") * 0.10 / 6.7131)` |

示例沿用下文的历史换算值 6.7131，部署时可按实际结算汇率及售价调整。三个表达式均在隔离 rc.51 上以模拟上游核对过预扣和成功结算。[15S 费率](https://xysnai.cn/api/model-marketplace/detail?model_id=449b2ba4-90dd-4f5d-adf4-d91293cbf819) · [30S 费率](https://xysnai.cn/api/model-marketplace/detail?model_id=a92b01f2-5330-4c49-8004-c147a0e60f75) · [武庚纪费率](https://xysnai.cn/api/model-marketplace/detail?model_id=a903db6e-2704-48c9-a817-57a15d5d7eac)

## 配置 H3 标准版、FL2V 和 LH 价格

插件自 1.3.0 起按实际转发的时长、分辨率档位和图片数计量。`1280x720` 会转为 `1376x768` 并归入 `768P`，省略时长会按 4 秒计费，URL 图片对象会按一张 `images` 计量。[客户端尺寸映射](API.md#minimax-h3-型号与参数)

从 1.3.2 起，三个 H3 型号的可视化定价只列 480P、768P、1080P、2K、4K 五档。同一档位下的宽高共用档位价格，视频请求继续通过 `size` 选择尺寸。下方使用 `u("resolution")` 的价格可直接沿用。

自定义价格如果使用了 `u("size")`，新增或编辑时需改按 `u("resolution")` 定价。rc.51 中仅有一个插件提供模型时，已保存的旧公式仍可读取真实尺寸，后台会提示公式不兼容。多个插件共享同名模型时，应在升级前迁移这类旧公式。同档内需要区分宽高收费的规则，应先确认合并档位后的售价。[New API 用量分组说明](https://docs.newapi.pro/zh/docs/plugins/billing#按模型区分用量配置)

### 在 New API rc.51 保存价格

1. 用超级管理员账号打开 **系统设置 → 计费与支付 → 模型定价 → 模型价格**。如果列表里找不到模型，查看 **未设置价格模型**，并确认已启用插件和渠道，渠道里填了该模型名。
2. 选中模型，打开 **DreamStudio Video** 标签，开启 **为此服务方单独设置**。
3. 将 **编辑器模式** 切到 **表达式编辑器**。在 **计费表达式** 文本框里全选替换为下方对应模型的整段公式。
4. 保持表达式编辑器，点击 **保存模型价格** 并确认。三个模型各填一次。

**请求规则计费** 接收数字倍率，会把输入乘到基础价上。把 `u("resolution") == "480P"` 填在这里会出现 `float64 * string`。页面的 **切换到 JSON** 用于固定价格和倍率字段。这两条任务用量公式应填在各模型的 **计费表达式** 框。[New API 计费文档](https://docs.newapi.pro/zh/docs/plugins/billing)

### minimax-h3 和 minimax-h3-fl2v

给 `minimax-h3` 和 `minimax-h3-fl2v` 分别粘贴下方同一段公式。公式按 2026 年 11 月 20 日人民币中间价 **1 USD = ¥6.7131** 换算，返回美元金额。New API 再应用分组倍率。480P、768P、1080P、2K、4K 的秒价依次为 ¥0.05、¥0.08、¥0.14、¥0.20、¥0.25。前 5 张 `images` 免费，之后 ¥0.10 每张。[汇率中间价](https://www.safe.gov.cn/AppStructured/hlw/RMBQuery.do?endDate=2026-11-20&queryYN=true&startDate=2026-11-20) · [H3 费率](https://xysnai.cn/api/model-marketplace/detail?model_id=4d25e564-875f-44ef-bdf5-d0f3194a10b1) · [FL2V 费率](https://xysnai.cn/api/model-marketplace/detail?model_id=4235d267-9fd0-4b78-8d94-0b813c383cb2)

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

分组倍率为 `1` 时，用 `1376x768` 生成 5 秒视频的基础金额约为 `$0.059585`，传 6 张 `images` 则约为 `$0.074481`。

### minimax-h3-lh

LH 公布的秒价为 `480P` ¥0.01、`768P` ¥0.04，图片仍是前 5 张免费，之后 ¥0.10 每张。**开放 LH 前，请把请求限制在 480P 和 768P**。以下公式的第二个分支会把其他档位也按 768P 收费。[LH 费率](https://xysnai.cn/api/model-marketplace/detail?model_id=f9033ed1-a558-4b0c-8e90-4673eac83a37)

```text
u("resolution") == "480P"
  ? tier("480P", (u("seconds") * 0.01 + max(u("input_images") - 5, 0) * 0.10) / 6.7131)
  : tier("768P", (u("seconds") * 0.04 + max(u("input_images") - 5, 0) * 0.10) / 6.7131)
```

两段公式已在隔离的 rc.51 上验证保存和预扣。

- **素材计费**。公式覆盖纯文本、明确传入的 `images` 和转换为 `images` 的 H3 图片对象。XYSNAI 按参考视频的实际时长收费，插件只上报视频数量。通过 `input_reference` 字段传入的旧格式字符串或上传文件仍计为未区分类型的参考素材。要与上游成本对齐，请先限制这些未能按素材实际用量计价的输入。
- **其他模型**。按各自上游口径和用量字段定价。部分 Seedance 型号按任务计费。视频超分按上游实际用量收费，现阶段可配置明确的按次售价，实际时长结算需要先核实上游返回字段。[XYSNAI 模型目录](https://xysnai.cn/zh/models)

## 排查接入

| 症状 | 检查项 |
|---|---|
| 市场预览显示「部分插件信息无法读取」 | 1.3.3 修复了 rc.51 的源码预览兼容并提供中英文独立说明。可刷新市场后选 1.3.3 查看预览 |
| 市场预览显示「文件尚未校验」 | 检查当前页面是否通过 HTTPS 打开且浏览器 Web Crypto 可用。通过市场安装时，New API 服务端会按索引校验文件哈希 |
| 模型不可调用 | 启用插件并检查渠道模型、分组和令牌模型限制 |
| `model_price_error` | 检查当前模型或提供方的计费配置，表达式字段需匹配 1.3.0 的用量定义 |
| 上游鉴权失败 | 检查类型 61 渠道的 XYSNAI API Key 和 Base URL |
| 任务长期无进度或无法下载 | 根据 New API 任务 ID 查看后台轮询、上游响应和内容代理日志 |

上线验收时按型号选择请求示例。FL2V 的 JPEG 单图和双图已通过测试网关实测，使用 `multipart/form-data` 上传。其他型号的 multipart 上传及 HEAD/Range 以部署后的实际测试为准。[FL2V 请求示例](API.md#h3-fl2v-首尾帧请求示例) · [验证范围](VALIDATION.md)
