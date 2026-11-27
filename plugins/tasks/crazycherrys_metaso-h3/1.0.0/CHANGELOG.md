---
changelogVersion: 1
plugin: 'crazycherrys_metaso-h3'
version: '1.0.0'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---

# Changelog

## [1.0.0]

### Added

- Generate 768P or 2K MiniMax H3 videos through the standard New API video endpoints, with text, images, first and last frames, and audio references.
- Charge for output duration and resolution, plus input images above the first five. Reject video references before submission because the target host cannot measure their billable duration.
- Proxy completed videos through New API without forwarding channel credentials to the download host.

### Migration

- Set a task usage price for the new model `metaso-minimax-h3`. Create a type-61 channel with a MetaSo API key and select this plugin. Existing DreamStudio Video channels and pricing stay in place.
