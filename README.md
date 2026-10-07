# newapi-plugin-hub

New API 插件集合，按图片、视频等能力分类维护。

## 插件目录

| 分类 | 插件 | 功能 | 文档 |
| --- | --- | --- | --- |
| 视频 | Leonardo Video | 通过 Leonardo 调用 Veo 3.1 / Veo 3.1 Fast，支持文生视频、异步查询和 MP4 下载 | [安装与使用](video/leonardo/README.md) |
| 图片 | 待添加 | 预留 `image/` 目录 | — |

Leonardo 插件当前版本为 `0.1.0`，目标宿主为 New API `v1.0.0-rc.41` 的 Task Plugin API v1。安装时只需上传 [plugin.js](video/leonardo/plugin.js)。

## 本地验证

需要 Node.js 18 或更高版本，无需安装 npm 依赖：

```bash
cd video/leonardo
node --check plugin.js
npm test
```

现有 114 项测试使用合成数据，不会调用付费 API。本地测试不代表已通过实际 New API / Goja 宿主或 Leonardo API 验收；实际部署前请按照插件文档完成宿主检查与联调。

测试会更新 `test-results.json`；修改交付文件后，需要同步更新插件目录下的 `SHA256SUMS.txt`。

API Key 通过宿主配置或环境变量提供，请勿提交真实密钥、`.env` 文件或付费联调产生的私有数据。
