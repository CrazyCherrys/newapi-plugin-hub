<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="New API Plugin Hub"></p>

# New API Plugin Hub

New API 社区插件仓库与第三方市场源。当前只提供 **XYSNAI Video 1.0.1**：用一个任务插件接入 Wan、MiniMax H3、Seedance 与视频超分共 19 个模型。

## 添加市场源

在 New API 管理后台进入 **插件 → 市场源 → 添加源**，名称填写 `New API Plugin Hub`，索引地址填写：

```text
https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/index.json
```

保存、刷新市场，选择 **XYSNAI Video 1.0.1** 安装并启用，再按[使用指南](video/xysnai/README.md)完成渠道与模型定价：

| 配置项 | 填写内容 |
|---|---|
| 渠道类型 | Task Plugin（61） |
| 插件 key | `crazycherrys_xysnai-video` |
| Base URL | `https://xysnai.cn`，不追加 `/v1` |
| 上游密钥 | 你的 XYSNAI API Key |
| 对外模型 | 使用 `xysnai/` 前缀，例如 `xysnai/minimax-h3` |
| 计费 | 按模型的 usage profile 独立设置；超分另设定价策略 |

索引、图标和插件通过同源相对路径及 SHA-256 引用。浏览器需能访问 `raw.githubusercontent.com`；镜像需保留目录结构并支持跨域访问。Docker 容器无需挂载本仓库或安装 Node.js。

刷新市场不会自动升级已安装插件。`minApiVersion: 1` 指插件 API 版本；本插件以 New API `v1.0.0-rc.51` 的 API v1 为目标，应在实际宿主确认兼容性。

如果安装时提示“社区插件的标识必须以作者的 GitHub 用户名加下划线开头”，请刷新市场并选择 **1.0.1**：新 key 为 `crazycherrys_xysnai-video`。旧的 `xysnai-video` 1.0.0 已退出当前索引，固定版本文件只作为历史记录保留。已在旧宿主安装的用户需重新安装新 key、重新绑定渠道，并迁移旧 key 下的插件级价格覆盖；模型名和用量字段不变。

## 插件目录

| 图标 | 插件 | 模型与能力 | 文档 |
|---|---|---|---|
| <img src="plugins/tasks/crazycherrys_xysnai-video/icon.svg" width="40" height="40" alt="XYSNAI Video"> | XYSNAI Video · 1.0.1 | 19 个模型；文生视频、多媒体参考、视频超分、异步查询与下载 | [安装与使用](video/xysnai/README.md) · [模型目录](video/xysnai/model-catalog.json) · [更新日志](plugins/tasks/crazycherrys_xysnai-video/1.0.1/CHANGELOG.zh-CN.md) |

手动安装：[下载固定版本 plugin.js](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_xysnai-video/1.0.1/plugin.js)，在插件管理中上传并启用。仅需一个 JS 文件；图标可另选 [icon.svg](plugins/tasks/crazycherrys_xysnai-video/icon.svg)。

**验证范围：** 离线测试覆盖全部声明模型的请求与用量、multipart 描述符、任务状态、内容代理和官方格式 fixture；不代表已在实际 New API 容器安装或完成 XYSNAI 真实生成。验证记录见 [VALIDATION.md](video/xysnai/docs/VALIDATION.md)。

Leonardo 已从本仓库源码、发布目录和市场中移除。已安装的旧插件不会被市场自动删除；需要在 New API 中自行停用旧渠道，并为 XYSNAI 新建渠道、配置密钥与价格，旧配置不会自动迁移。

## 仓库结构

```text
index.json                          # 自动生成的市场索引
marketplace.json                    # 插件注册与明确下架记录
plugins/tasks/crazycherrys_xysnai-video/
├── icon.svg                        # 市场图标
└── 1.0.1/                          # 固定版本入口与中英文日志
video/xysnai/
├── README.md                       # 安装、配置、计费及调用说明
├── plugin.js                       # 单文件插件源码
├── package.json                    # 插件版本和测试命令
├── CHANGELOG*.md                    # 发布日志
├── model-catalog.json              # 19 个模型及参考文档
├── SHA256SUMS.txt                   # 源码与资料校验清单
├── examples/                       # 五个模型家族的 JSON 示例
├── docs/                           # 验证记录
└── tests/                          # 离线测试和宿主 fixture
tools/                             # 发布、索引生成及校验
.github/workflows/                  # 自动检查
```

## 开发与发布

维护环境需要 Node.js 22+，无需安装第三方 npm 依赖。在仓库根目录执行：

```bash
npm test
npm run release
npm run check
```

`release` 复制登记插件的源码和中英文日志到固定版本目录，再生成市场索引。索引保留每个模型的 usage profile、说明文档、渠道默认地址和文件哈希。已发布版本不可覆盖；修改源码时同步提升 `meta.version` 与 `package.json` 版本。

测试或资料修改后，需重新生成插件的 `SHA256SUMS.txt`。目录、文档、下架与提交要求见[贡献指南](CONTRIBUTING.md)，市场格式依据 [New API 发布规范](https://docs.newapi.pro/zh/docs/plugins/publishing)。原始导入材料 `参考/` 仅保留在本地，不作为第二份插件提交。

请勿提交真实密钥、`.env` 文件或真实联调产生的私有数据。
