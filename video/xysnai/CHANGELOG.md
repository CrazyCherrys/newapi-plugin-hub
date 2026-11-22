---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.3.4'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.3.4]

### Fixed
- Use a generic public video failure message and keep raw provider error text out of the plugin's standard response.
- Remove provider links from the client API guide and document gateway filtering for legacy task queries, HTTP errors, and download headers.

### Migration
- Upgrade the existing plugin to carry forward its channel settings and pricing expressions. Apply the Nginx configuration on the public gateway to cover host-managed responses.
