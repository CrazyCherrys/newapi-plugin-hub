# 验证记录

日期为 2026-11-22，插件为 DreamStudio Video 1.3.1，标识为 `crazycherrys_xysnai-video`。

## 已完成

1. Node.js 模块加载与同步 hook 行为共通过 26 组测试，包含 20 个 New API 官方格式 fixture 的本地回放，以及 Hub 的模型目录、示例和源码哈希一致性检查。
2. 元数据：使用 New API `v1.0.0-rc.51` 随附的官方 API v1 JSON Schema 独立校验，通过。
3. 模型声明：19 个唯一模型，各属于一个 usage profile，分组数量为 3 / 1 / 2 / 12 / 1。
4. 请求和用量：覆盖全部模型、26 个 H3 尺寸、秒数数字/字符串、必填字段、非法时长拒绝。
5. 参数保留：JSON 数组、嵌套扩展、false、0；multipart 重复字段、多文件、URL 与文件混用。
6. 任务生命周期：202 创建解析、四种已知状态、未知状态、公开 ID 与上游 ID 分离、内容请求路径。
7. 鉴权与渲染：使用渠道 Bearer key；客户端 Authorization 不覆盖上游凭据；不返回上游余额、费用或原始结果地址。
8. 内容请求描述符：GET、HEAD、Range 和缓存条件头；这里只验证构造结果。
9. 超分：缺失或 null 的 billing_seconds 不转换成 0。
10. 发布示例：5 份 JSON 请求以及 旧版 README 的 1 份沙盒参数，与冻结版插件实际构建函数一致。

## 未执行

- 未在用户 New API 中安装或启用插件。
- 未替用户发送任何付费生成请求。
- 未验证上游所有模型真实生成、multipart 上传、HEAD/Range 响应或成本结算。

原始参考材料提及用户上传的 `minimax-h3` 创建、查询完成、MP4 下载截图，本次 Hub 接入未重新核验这些截图。19 模型的覆盖结论属于参考材料的公开接口核对记录和本次离线适配检查。

## 复验命令

```bash
cd video/xysnai
node tests/run.mjs
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture tests/golden.json
```

Node 测试、官方 New API rc.51 的 `plugin lint` 和 `plugin test` 均通过，官方宿主通过全部 20 个 fixture。

## 源码摘要

`plugin.js` SHA-256：

```text
77aa0814e7582172b8cbe4eff5b1ccdd12740c344b49baae6ac07ecf474a1e01
```

## 官方校验规范

[New API rc.51 API v1 Schema](https://github.com/QuantumNous/new-api/blob/v1.0.0-rc.51/docs/plugin-api/v1.schema.json)

该固定版本 Schema 已读取并用于此次校验。

## 本次 Hub 接入

- 将参考文件 `xysnai-video.js` 整理为 `video/xysnai/plugin.js`；1.1.0 取消对外模型前缀及上游前缀转换，19 个模型和 5 个计费用量分组改用原始名称，其余参数与用量逻辑沿用原实现。
- 从当前仓库删除旧插件的源码、发布文件和市场入口，登记完整下架记录；Git 历史仍保留旧提交。
- 市场发布为 `plugins/tasks/crazycherrys_xysnai-video/1.1.0/plugin.js`，补齐中英文日志与原创适配图标；索引保留全部 5 个 usage profile 及 19 个模型。
- 执行 6 组发布工具测试、22 组插件测试（包含 16 个宿主格式 fixture）、Node 语法检查、官方 rc.51 元数据 Schema 校验、发布生成与索引校验。
- 测试套件读取全部 5 份请求样例及模型目录；原始参考材料记录的 README 沙盒示例检查不替代目标宿主的执行。
- SHA256SUMS.txt 覆盖源码、模型目录、日志、示例、测试和本记录；GitHub Actions 同步执行语法及校验清单检查。

1.1.0 发布时未执行 New API 二进制 CLI、安装到实际宿主或发送 XYSNAI 付费请求。超分的实际结算和 multipart、HEAD/Range 的上游行为仍需联调。

## 社区市场安装规则回归

用户在实际市场安装时遇到作者前缀错误。此前离线 Schema 校验没有覆盖控制器的市场准入检查。

- 核对 [New API 安装控制器](https://github.com/QuantumNous/new-api/blob/8542c9d6490b4330fe18160930f81ae7428bc777/controller/task_plugin.go)：社区及第三方来源安装要求 key 带作者前缀与下划线。
- 核对 [ValidPluginKey](https://github.com/QuantumNous/new-api/blob/8542c9d6490b4330fe18160930f81ae7428bc777/pkg/jsplugin/registry.go)：允许小写字母、数字、下划线和连字符，最多 30 字符。
- 发布工具同时校验 key 的格式、长度、GitHub 作者主页与前缀一致性；回归测试拒绝旧 key、错误作者、空插件名、大写 key 和超长 key，并验证发布入口确实拒绝旧标识。
- 1.1.0 市场条目使用 crazycherrys_xysnai-video 1.1.0，作者为 CrazyCherrys；1.0.1 的历史文件保持不变，旧 key 的 1.0.0 不再出现在当前索引中。

此回归验证覆盖已定位的命名准入规则，不代表已在用户宿主完成安装或真实生成。

## 1.1.0 模型名称回归

- 验证 19 个模型声明、5 个用量分组和模型目录中的名称与上游原名一致，不含服务商前缀。
- 全部家族的 JSON 请求、multipart 表单、模型别名和公开响应 fixture 使用无前缀模型名；额外测试拒绝旧前缀模型及旧前缀上游映射。
- 发布工具检查最新市场模型列表和用量分组均不含前缀；历史固定版本文件不修改。
- 同步更新 5 份示例、16 个宿主格式 fixture、安装文档和升级迁移说明；模型价格与渠道配置需由管理员按新名称调整。

本次验证仍为离线测试与发布检查，没有执行实际宿主安装或付费生成。

## 1.2.0 协议与计费复核

- 直接读取 [XYSNAI 模型目录](https://xysnai.cn/zh/models)及 [H3 接口文档](https://xysnai.cn/zh/docs?model_id=4d25e564-875f-44ef-bdf5-d0f3194a10b1)页面加载的公开数据。目录中的 19 个视频模型与插件完全一致。逐一比对了 26 个 H3 尺寸与公开价格的 5 个档位。
- 使用官方 [New API rc.51 发布二进制](https://github.com/QuantumNous/new-api/releases/tag/v1.0.0-rc.51)执行 `plugin lint` 和 `plugin test`，17 个 fixture 全部通过。
- 在独立的 rc.51 和 SQLite 测试库中，停用产生同名冲突的内置 Hailuo 后，安装并启用本插件，绑定类型 61 渠道。使用本地模拟上游生成成功和失败任务，核对实际预扣、结算及全额退款。
- 模拟用量表达式按 `resolution=768P` 与 5 秒计费，每个任务预扣 50,000 quota，成功任务最终扣 50,000，失败任务退款后为 0。
- 模拟普通按次 USD 0.02，5 秒和 2 张图片在 1.1.0 会预扣 100,000 quota。1.2.0 每次预扣 10,000 quota，成功最终扣 10,000，失败退款后为 0。
- 从 New API 下载已完成的模拟视频，确认返回字节与模拟上游一致。

上述价格仅用于测试。用户实际部署、XYSNAI 付费生成、输入视频实际计费时长和超分结算字段仍待验收。

## 1.3.0 H3 标准请求兼容

- 离线测试覆盖 6 种尺寸映射、默认时长和尺寸、JSON 和 multipart 图片对象转换、旧版图片传参，以及冲突字段和无效对象拒绝。
- 在官方 New API rc.51 中分别用 JSON 图片对象和 multipart 的 `input_reference[image_url]` 创建任务。两种请求均省略时长并请求 `1280x720`，模拟上游均收到 `1376x768`、4 秒和 1 张 `images` 图片。New API 以同一尺寸、时长和图片数计算用量，分辨率档位为 `768P`。
- 测试费率为每秒 USD 0.02、每张图片 USD 0.01。两种请求各预扣 45,000 quota，成功后最终扣除 45,000 quota，失败后退款至 0。成功任务的下载字节与模拟上游一致。
- 本次宿主验证使用隔离的测试库和模拟上游。用户宿主和 XYSNAI 真实生成仍未联测。

## 1.3.1 改名与升级

- 在隔离的官方 New API rc.51 实例中安装 1.3.0 并绑定渠道和模型价格，再上传并启用 1.3.1。插件详情和渠道选择列表均显示 DreamStudio Video，原渠道及其插件绑定保持有效。
- 升级后沿用已有模型价格创建两个模拟任务，各预扣 50,000 测试 quota。成功任务最终扣除 50,000 quota，失败任务全额退款。计费日志显示 DreamStudio Video 1.3.1 和原插件标识。
