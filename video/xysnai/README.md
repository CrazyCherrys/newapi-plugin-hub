---
locale: en
translations:
  zh-CN: README.zh-CN.md
---
# DreamStudio Video

Use XYSNAI video models through New API's `/v1/videos` interface. The plugin declares 19 models, including MiniMax H3, Wan, Seedance, and video upscaling. Operators choose which models to enable. [简体中文](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/xysnai/README.zh-CN.md)

- **For clients.** Use the gateway address and New API token supplied by your operator to create tasks, check their status, and download videos. [API guide](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/xysnai/docs/API.md)
- **For administrators.** Install or upgrade to 1.3.3. Set up a Task Plugin (61) channel and configure the model prices. The deployment guide includes H3 pricing expressions by resolution. [Deployment and billing](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/xysnai/docs/ADMIN.md)

Plugin key `crazycherrys_xysnai-video` uses the New API Task Plugin API v1 `openai_video` protocol. The H3 pricing editor offers five resolution tiers. Existing channels and resolution-based pricing expressions carry forward on upgrade. [Validation](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/xysnai/docs/VALIDATION.md) · [Changelog](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/plugins/tasks/crazycherrys_xysnai-video/1.3.3/CHANGELOG.md)
