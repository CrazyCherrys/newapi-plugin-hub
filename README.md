<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="New API Plugin Hub"></p>

# New API Plugin Hub

面向 New API 的社区插件仓库和第三方市场源，按能力分类、按服务商独立维护。当前提供 Leonardo 视频适配插件，后续可在同一目录约定下增加更多视频、图片等插件。

## 添加市场源

在 New API 管理后台进入 **插件 → 市场源 → 添加源**，名称填写 `New API Plugin Hub`，索引地址填写：

```text
https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/index.json
```

保存并刷新市场，选择 **Leonardo Video 0.1.4** 安装，然后按[使用指南](video/leonardo/README.md)启用插件并配置渠道、Base URL、密钥、模型和计费。

索引、插件和图标由浏览器读取，Docker 容器不需要挂载本仓库或安装 Node.js。用户浏览器必须能访问 `raw.githubusercontent.com`。使用镜像时需保留整个发布目录的相对路径，并允许浏览器跨域读取，不能只镜像索引。

刷新市场不会自动升级已安装插件。索引中的 `minApiVersion: 1` 是插件协议版本，不保证所有 New API 构建都兼容。

**验证状态：** Leonardo 已通过 130 项本地合成测试；目标契约为 New API `v1.0.0-rc.41`，实际 Docker 实例安装、宿主引擎测试和真实 Leonardo 生成仍待验收。

## 插件目录

| 图标 | 分类 | 插件 | 能力 | 使用指南 |
|---|---|---|---|---|
| <img src="plugins/tasks/leonardo-video/icon.png" width="40" height="40" alt="Leonardo"> | [视频](video/README.md) | Leonardo Video · 0.1.4 | Veo 3.1 / Veo 3.1 Fast 文生视频、异步查询、MP4 下载 | [安装与使用](video/leonardo/README.md) · [更新日志](plugins/tasks/leonardo-video/0.1.4/CHANGELOG.zh-CN.md) |

image/ 为图片插件预留目录，当前没有可用实现。各插件支持的宿主版本、模型、配置及验证状态以各自 README 为准。

## 如何使用

1. 在上表选择需要的插件，进入对应目录的 README。
2. 按该插件的要求确认 New API 版本，获取插件入口文件。
3. 完成插件导入、渠道配置与验证，再按文档调用接口。

手动安装可[下载固定版本 plugin.js](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/leonardo-video/0.1.4/plugin.js) 后在网页上传。图片是市场显示资源，不用额外上传到网关。详细配置及完整调用示例见 [Leonardo 使用指南](video/leonardo/README.md)。

## 仓库结构

```text
newapi-plugin-hub/
├── index.json                # 自动生成的市场索引
├── marketplace.json          # 市场名称与源码目录登记
├── assets/                   # 仓库 logo 和品牌图标来源
├── plugins/tasks/leonardo-video/
│   ├── icon.png              # 市场 logo
│   └── 0.1.4/                # 不可覆盖的 plugin.js 和中英文日志
├── tools/                    # 发布、索引生成与校验
├── .github/workflows/        # 自动检查
├── README.md                 # 仓库介绍、插件索引和目录约定
├── CONTRIBUTING.md           # 新增和维护插件的流程
├── image/                    # 图片插件预留目录
└── video/
    ├── README.md             # 视频插件索引
    └── leonardo/
        ├── README.md         # 本插件的安装与使用指南
        ├── plugin.js         # 上传到 New API 的入口
        ├── package.json      # 本地测试命令
        ├── SHA256SUMS.txt     # 文件校验清单
        ├── docs/             # 开发说明、契约审阅依据
        ├── scripts/          # 真实接口联调工具
        └── tests/            # 测试代码、fixture 和验证结果
```

## 新增与维护插件

统一使用 `<能力分类>/<服务商>/`，例如 `video/leonardo/`。每个插件必须提供独立 README，使用户进入该目录即可找到安装、配置和调用方式。测试、脚本与开发资料按需放入对应子目录。

新增插件时同步更新根目录和分类目录的索引；开发与提交要求见[贡献指南](CONTRIBUTING.md)。插件互相独立，测试命令与依赖由各插件自行声明。

维护环境需要 Node.js 22+，无第三方 npm 依赖。在仓库根目录执行：

```sh
npm test
npm run release
npm run check
```

`release` 从登记的源码目录复制插件及中英文日志并生成索引。已有版本内容不一致时拒绝覆盖，需提升源码中的 `meta.version` 和 `package.json` 版本。仅更新市场图标时执行 `npm run index`。

工具执行仓库内可信 JavaScript 来读取导出的元数据，并检查目录、版本、日志和文件哈希；它不替代 New API 自身的编译和准入校验。GitHub Actions 检查本地测试、索引是否过期和历史版本是否被修改。

索引结构依据 [New API 发布规范](https://docs.newapi.pro/zh/docs/plugins/publishing)；图标来源见[说明](assets/README.md)。

API Key 通过宿主配置或环境变量提供。请勿提交真实密钥、.env 文件或真实联调产生的私有数据。
