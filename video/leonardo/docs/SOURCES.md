# 审阅依据

审阅日期：2026-10-06。New API 以固定 `v1.0.0-rc.41` 源码和当前官方文档交叉核对；Leonardo 为当日可获取的官方文档/SDK。这里列出的是依据，不代表已完成实际账号 API 联调。

| 编号 | 官方来源 | 本项目使用的内容 |
|---|---|---|
| S1 | [New API rc.41 v1.d.ts](https://raw.githubusercontent.com/QuantumNous/new-api/v1.0.0-rc.41/docs/plugin-api/v1.d.ts) | meta、协议、钩子、request descriptor、TaskView/state 范围 |
| S2 | [New API rc.41 v1.md](https://raw.githubusercontent.com/QuantumNous/new-api/v1.0.0-rc.41/docs/plugin-api/v1.md) | 同步运行、宿主协议、任务存储和接口限制 |
| S3 | [New API 插件开发指南](https://docs.newapi.ai/zh/docs/plugins/development) | CLI lint/test、fixture、无外部 HTTP 的测试边界 |
| S4 | [Leonardo Veo 3.1](https://docs.leonardo.ai/docs/veo-31) | 模型 slug、文生视频参数、尺寸、时长、音频、seed |
| S5 | [New API 用量与计费](https://docs.newapi.ai/zh/docs/plugins/billing) | 用量事实、表达式、预估与完成结算 |
| S6 | [New API 渠道配置](https://docs.newapi.ai/zh/docs/plugins/configuration) | 类型 61、插件 key、Base URL、映射模型与客户端模型 |
| S7 | [New API rc.41 JS Task adaptor](https://raw.githubusercontent.com/QuantumNous/new-api/v1.0.0-rc.41/relay/channel/task/jsplugin/adaptor.go) | 实际钩子调用、私有 state、公开 presenter、credentialless 下载限制；尤其 parseTaskResult、ConvertToOpenAIVideo、BuildContentRequest |
| S8 | [Leonardo Get generation by ID](https://docs.leonardo.ai/v1.0/reference/getgenerationbyid) | v1 生成任务查询路径 |
| S9 | [Leonardo API FAQ](https://docs.leonardo.ai/docs/api-faq) | PENDING/COMPLETE/FAILED、generationId 与 imageId 的区别 |
| S10 | [Leonardo Getting Started](https://docs.leonardo.ai/docs/getting-started) | Production API Key、API credits |
| S11 | [Leonardo 官方 Python SDK getgenerationbyid.py](https://raw.githubusercontent.com/Leonardo-Interactive/leonardo-python-sdk/main/src/leonardo_ai_sdk/models/operations/getgenerationbyid.py) | generations_by_pk、generated_images、motionMP4URL、imageWidth/imageHeight；未列出可可靠回显的 duration |
| S12 | [Leonardo Create Async Generation](https://docs.leonardo.ai/reference/creategeneration) | POST v2/generations 与异步 generation ID；动态响应 schema 未完整展开 |
| S13 | [New API rc.41 官方 Sora 插件](https://raw.githubusercontent.com/QuantumNous/new-api/v1.0.0-rc.41/plugins/tasks/sora/plugin.js) | 同类协议实现模式交叉参考；本交付代码独立编写 |
| S14 | [New API Task Plugin API v1 参考](https://docs.newapi.ai/zh/docs/plugins/api-reference) | UNKNOWN、宿主路由、产物和允许主机等规则 |

## 本插件自行选择的策略，不伪装成官方限制

- 2026-10-07 安装反馈：用户的 Docker 实例（自述版本 41）拒绝 `meta.baseUrl`，而所引用官方 `rc.41` 的 schema 和 `pkg/jsplugin/registry.go` 均接受该字段。`0.1.2` 移除该可选声明并要求手填渠道地址；实际镜像/构建及其余契约仍待验证，不据此声称所有 41 构建兼容。

- 只支持 Veo 3.1 普通与 Fast；暂不开放 Lite/4K。
- 1080p 只开放 8 秒。
- `public=false`、`quantity=1` 固定。
- `provider_options.leonardo` 扩展结构。
- COMPLETE 缺少可用 MP4 观察三次后失败。
- 对外按请求秒数计费，而非 MP4 实测时长或上游 credit 数。
- URL 语法过滤仅作前置防护，真实 DNS/重定向 SSRF 防护由宿主负责。
- 显式兼容多种 generationId envelope；真实 v2 响应需要付费 smoke test 验证。
