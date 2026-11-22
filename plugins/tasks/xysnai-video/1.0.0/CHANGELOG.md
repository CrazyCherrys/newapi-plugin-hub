---
changelogVersion: 1
plugin: 'xysnai-video'
version: '1.0.0'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.0.0]

### Added
- Add the XYSNAI Video task plugin with 19 namespaced models across Wan, MiniMax H3, Seedance and video upscaling.
- Support JSON and multipart submission, asynchronous polling, and authenticated video content requests.
- Preserve model-specific parameters and usage profiles for duration, resolution, size, audio and reference counts; report upscale billing time only when supplied by the upstream service.

### Migration
- This is a separate plugin with separate model pricing; Leonardo channel settings and prices are not migrated automatically.
- Create a Task Plugin (61) channel bound to xysnai-video, set Base URL to https://xysnai.cn, and supply an XYSNAI API key. Use the declared xysnai/ model names and configure each model's usage pricing before enabling requests.
- Upscaling requires an explicit pricing policy. Do not substitute output duration for upstream instance billing time or treat missing billing_seconds as zero.
