---
changelogVersion: 1
plugin: 'leonardo-video'
version: '0.1.4'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [0.1.4]

### Added
- First marketplace release, supporting Veo 3.1 and Veo 3.1 Fast text-to-video, asynchronous polling and MP4 downloads through Leonardo.

### Fixed
- Prefer the raw channel API key and normalize the fallback authorization header to avoid duplicate Bearer prefixes.
- Reject invalid API keys containing whitespace or control characters.

### Migration
- No pricing schema changes. Configure the Leonardo channel URL, API key, models and pricing manually after installation; installation does not migrate channel settings.
- Administrators updating from earlier manually uploaded versions must explicitly install this release. Marketplace refresh does not update installed plugins automatically.
