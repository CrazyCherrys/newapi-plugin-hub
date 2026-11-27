<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="New API Plugin Hub"></p>

# New API Plugin Hub

New API 第三方插件市场源。

| 插件 | 模型 | 文档 |
|---|---|---|
| DreamStudio Video 1.4.0 | MiniMax H3、Wan、Seedance、视频超分 | [用户调用](video/xysnai/docs/API.md) · [部署与计费](video/xysnai/docs/ADMIN.md) · [更新日志](plugins/tasks/crazycherrys_xysnai-video/1.4.0/CHANGELOG.zh-CN.md) · [验证记录](video/xysnai/docs/VALIDATION.md) |
| MetaSo H3 Video 1.0.0 | `metaso-minimax-h3`，支持 768P 和 2K | [用户调用](video/metaso/docs/API.md) · [部署与计费](video/metaso/docs/ADMIN.md) |

## 添加市场源

在 New API 管理后台进入 **任务插件 → 插件市场 → 市场源管理**。新增 `New API Plugin Hub`，索引地址填入下方 URL。

```text
https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/index.json
```

保存并刷新市场，选择需要的插件安装或升级。也可以下载固定版本的插件后手动上传。首次安装后按对应的管理员指南启用插件并设置类型 61 渠道和模型价格。 [DreamStudio Video 下载](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_xysnai-video/1.4.0/plugin.js) · [MetaSo H3 Video 下载](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_metaso-h3/1.0.0/plugin.js)

## 开发与发布

开发需要 Node.js 22 或更新版本。在仓库根目录运行以下命令。

```bash
npm test
npm run release
npm run check
```

插件源码在 `video/`，固定发布文件在 `plugins/tasks/`。发布工具生成市场索引。仅更新市场 README 后，可用 `npm run index` 刷新文档哈希。 [贡献指南](CONTRIBUTING.md)
