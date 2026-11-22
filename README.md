<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="New API Plugin Hub"></p>

# New API Plugin Hub

New API 第三方插件市场源。当前提供 DreamStudio Video 1.3.2，通过 XYSNAI 接入 MiniMax H3、Wan、Seedance 和视频超分模型。

- [用户调用文档](video/xysnai/docs/API.md)适合发给调用者，包含用 New API 令牌创建视频、查询任务和下载文件的示例。
- [管理员部署与计费](video/xysnai/docs/ADMIN.md)包含插件安装、渠道配置和可直接粘贴的 H3 五档计费表达式。

## 添加市场源

在 New API 管理后台进入 **任务插件 → 插件市场 → 市场源管理**。新增 `New API Plugin Hub`，索引地址填入下方 URL。

```text
https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/index.json
```

保存并刷新市场，选择 **DreamStudio Video 1.3.2** 安装或升级。也可以[下载固定版本 plugin.js](https://raw.githubusercontent.com/CrazyCherrys/newapi-plugin-hub/main/plugins/tasks/crazycherrys_xysnai-video/1.3.2/plugin.js)后手动上传。首次安装后按管理员指南启用插件并设置类型 61 渠道和模型价格。[更新日志](plugins/tasks/crazycherrys_xysnai-video/1.3.2/CHANGELOG.zh-CN.md)

## 开发与发布

开发需要 Node.js 22 或更新版本。在仓库根目录运行以下命令。

```bash
npm test
npm run release
npm run check
```

插件源码在 `video/xysnai/`，固定发布文件在 `plugins/tasks/`。发布工具生成市场索引。仅更新市场 README 后，可用 `npm run index` 刷新文档哈希。[贡献指南](CONTRIBUTING.md) · [验证记录](video/xysnai/docs/VALIDATION.md)
