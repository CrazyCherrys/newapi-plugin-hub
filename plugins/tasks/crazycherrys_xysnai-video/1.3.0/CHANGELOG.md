---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.3.0'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.3.0]

### Added
- Accept six common OpenAI Video and Full HD size presets on H3 and map them to supported XYSNAI dimensions. Default omitted duration to 4 seconds and omitted size to `768x1376`.
- Convert standard `input_reference.image_url` objects and corresponding multipart text fields into one `images` entry on standard H3 and H3 LH. FL2V requires an independently confirmed first/last-frame format.

### Migration
- Existing model price expressions use the same fields. The selected price tier, duration and image count now reflect the normalized upstream request. Review enabled tiers before offering higher-resolution aliases on H3 LH.
- Clients can use the same video endpoints. A legacy size alias may produce slightly different dimensions, so clients that depend on exact pixels should use the provider's native sizes.
