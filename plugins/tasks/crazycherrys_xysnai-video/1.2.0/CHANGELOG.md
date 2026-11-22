---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.2.0'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.2.0]

### Added
- Report the H3 resolution pricing tier derived from the documented size, alongside the original size and requested duration.

### Fixed
- Stop passing usage quantities as New API legacy billing multipliers so fixed per-call prices charge once per task.
- Validate H3 aspect ratios, mode and optional reference array limits against the upstream schema. Count only the documented images field as H3 image usage and keep untyped references separate.

### Migration
- Fixed per-call prices now apply once per request. Existing task usage expressions using seconds and size remain valid. Expressions using H3 input_images now count the documented images field and can optionally price by resolution.
- Configure prices in New API in USD for each enabled model and tier. Output duration and explicit image counts can be priced from request usage. Reconcile reference-video costs with XYSNAI before enabling duration-based reference pricing.
