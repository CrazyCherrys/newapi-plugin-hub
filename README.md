# New API Plugin Hub

面向 New API 插件系统的适配插件仓库，按能力分类、按服务商独立维护。当前提供 Leonardo 视频适配插件，后续可在同一目录约定下增加更多视频、图片等插件。

## 插件目录

| 分类 | 插件 | 能力 | 使用指南 |
|---|---|---|---|
| [视频](video/README.md) | Leonardo Video | Veo 3.1 / Veo 3.1 Fast 文生视频、异步查询、MP4 下载 | [安装与使用](video/leonardo/README.md) |

image/ 为图片插件预留目录，当前没有可用实现。各插件支持的宿主版本、模型、配置及验证状态以各自 README 为准。

## 如何使用

1. 在上表选择需要的插件，进入对应目录的 README。
2. 按该插件的要求确认 New API 版本，获取插件入口文件。
3. 完成插件导入、渠道配置与验证，再按文档调用接口。

当前 Leonardo 插件只需上传 [video/leonardo/plugin.js](video/leonardo/plugin.js)。详细配置及完整调用示例见 [Leonardo 使用指南](video/leonardo/README.md)。

## 仓库结构

```text
newapi-plugin-hub/
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

API Key 通过宿主配置或环境变量提供。请勿提交真实密钥、.env 文件或真实联调产生的私有数据。
