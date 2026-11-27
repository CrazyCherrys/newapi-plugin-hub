---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.4.0'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.4.0]

### Added
- Enable MiniMax-H3-15S, MiniMax-H3-30S and MiniMax-H3-2K-武庚纪 on the existing video creation, status and content routes. The new models accept reference images, videos and audio. The 2K model also accepts first and last frames and generation modes.

### Migration
- Upgrade the existing channel and enable the new model names as needed. Set a per-video price for 15S and 30S and an output-second price for 2K. Existing model prices carry forward.
