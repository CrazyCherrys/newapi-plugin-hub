---
locale: en
translations:
  zh-CN: README.zh-CN.md
---
# MetaSo H3 Video

Version 1.0.0 adds `metaso-minimax-h3` to New API's `/v1/videos` interface. Generate 4–15 seconds of 768P or 2K video from a prompt with optional reference images and audio.

- **Clients.** Create a task, query its status, and download the video with a New API token. [Client API guide](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/metaso/docs/API.md)
- **Administrators.** Bind `crazycherrys_metaso-h3` to a Task Plugin (61) channel, enter the provider key and the default upstream Base URL `https://metaso.cn/api`, then configure prices for output seconds and images beyond the first five. [Deployment and billing](https://github.com/CrazyCherrys/newapi-plugin-hub/blob/main/video/metaso/docs/ADMIN.md)

This version rejects video references because New API does not provide trusted input video durations before charging. Verify generation and billing on your deployment before opening the model to users.
