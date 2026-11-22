---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.3.2'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.3.2]

### Changed
- Use resolution as the only H3 pricing table dimension. All request sizes still map to the same five resolution tiers.

### Migration
- Existing `u("resolution")` expressions continue to work. Use `u("resolution")` for new or edited prices. Existing `u("size")` prices can still read the sent size on New API rc.51 when the model has a single plugin provider. Migrate size-based prices before upgrading a shared model.
