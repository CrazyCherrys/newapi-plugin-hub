---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.1.0'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.1.0]

### Changed
- Remove the xysnai/ provider prefix from all 19 public model names and model-specific usage profiles. Clients now use names such as minimax-h3, wan3.0-video and Video-upscale2.6 directly.
- Use the selected upstream model name without automatic prefix stripping; update examples and request/response fixtures to the same names.

### Migration
- Usage fields and pricing calculations are unchanged, but model pricing keys change. Reconfigure each renamed model's prices and any plugin-specific overrides; no automatic price migration is performed.
- Complete pending tasks before upgrading. Install 1.1.0, replace prefixed names in channel models, client requests and token model restrictions, and remove mappings that target the old prefixed names.
- Keep the plugin key crazycherrys_xysnai-video, XYSNAI Base URL and API key. The author's GitHub prefix in the plugin key remains required for community installation.
