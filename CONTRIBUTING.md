# 新增与维护插件

[返回仓库首页](README.md)

## 目录约定

插件存放于 `<能力分类>/<服务商>/`，目录名使用小写英文，必要时用连字符分词。同一服务商的不同能力分别放在对应分类下。当前实现为 [video/leonardo/](video/leonardo/README.md)。

每个插件必须包含 README.md 和明确的安装入口。单文件 JavaScript 插件使用 plugin.js；测试放 tests/，辅助工具放 scripts/，开发说明与参考资料放 docs/。没有相应内容时无需创建空目录。依赖和测试命令放在插件自己的目录中，避免无关插件互相依赖。

## 插件 README 要求

使用指南应让用户在该插件目录内完成以下操作：

1. 确认插件版本、目标 New API 版本、协议与支持范围。
2. 获取正确的安装文件，完成导入及启用。
3. 配置渠道类型、插件标识、Base URL、密钥、模型与计费。
4. 运行最小请求，并按能力说明查询结果、下载产物等后续步骤。
5. 了解参数限制、已知问题、验证状态及排查方法。

注明命令执行目录和示例所用的 Shell。使用占位密钥，区分宿主用户 Key 与上游服务商 Key。需要消耗额度的示例明确说明。内部实现与长篇审阅资料放 docs/，从使用指南链接过去。

## 提交流程

1. 在插件目录实现或修改适配逻辑，更新本插件 README 与相关测试。
2. 新增插件时更新根 README 和分类 README 的插件索引；新增分类时创建对应索引。
3. 执行该插件的语法检查和本地测试；涉及真实宿主或上游兼容性时，记录实际验证范围。
4. 文件移动后检查文档链接、测试导入、fixture 路径和脚本命令。
5. 维护校验清单的插件需同步更新校验值，排除清单本身。
6. 提交前检查差异，确保没有真实密钥、环境文件、付费生成的视频或私有响应。

本地合成测试、实际 New API 宿主测试、真实上游 API 联调应分别说明结果，未执行的验证保留为未验证。

## 市场发布

1. 在 `marketplace.json` 登记插件 key 和源码目录，源码目录必须提供 `plugin.js`、带版本的 `package.json`、`CHANGELOG.md` 和 `CHANGELOG.zh-CN.md`。当前工具支持正式 `x.y.z` 版本。
2. 修改时同步提升 `meta.version` 与 `package.json` 的版本。日志使用英文规范标题与 YAML 元数据，中文只翻译正文；说明计费和渠道配置迁移。
3. 在 `plugins/tasks/<key>/icon.png` 或 `icon.svg` 放置服务商图标，在 `assets/README.md` 记录来源。图标不超过 1 MiB，不把远程图片地址或图片数据写进插件 meta。
4. 在根目录执行 `npm test`、`npm run release`、`npm run check`。更新本插件的校验清单及文档；新增插件时把对应测试加入根 `package.json` 的测试命令。
5. 在目标 New API 中执行官方 lint、fixture 和真实联调；无法执行时在使用指南和发布报告中标明未验证。
6. 一起提交源码、固定版本目录、索引、图标和日志。发布目录一经推送不可修改，包括补写日志；修复必须发布新版本。图标位于版本目录外，允许更新，但需重新生成索引。
7. 推送后检查 GitHub Actions，并检查公开索引及其插件、图标链接的内容哈希和跨域访问。不要手工修改 `index.json`。

工具依赖 Node.js 22+ 的 VM 模块（命令已带启用参数），只运行本仓库可信源码；VM 不构成安全隔离。没有 npm 的环境可使用 `node --experimental-vm-modules tools/marketplace.mjs release` / `check`，测试分别运行 `node --experimental-vm-modules --test tools/marketplace.test.mjs` 与各插件的测试入口。

历史保护也可本地执行 `npm run check -- <完整基准提交SHA>`。CI 以推送前提交或 PR 的基准提交进行对比。维护流程依据 https://docs.newapi.pro/zh/docs/plugins/publishing 。
