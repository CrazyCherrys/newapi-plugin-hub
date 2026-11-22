---
changelogVersion: 1
plugin: 'crazycherrys_xysnai-video'
version: '1.0.1'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [1.0.1]

### Fixed
- Use the GitHub author namespace crazycherrys_xysnai-video and declare CrazyCherrys as the author with a matching GitHub profile URL, satisfying community marketplace admission.
- Publish the corrected identity in its matching release directory and marketplace entry. The unprefixed 1.0.0 release is no longer listed.

### Migration
- Usage facts and pricing calculations are unchanged for all 19 xysnai/ model names. Administrators with plugin-specific prices under xysnai-video must recreate those overrides under crazycherrys_xysnai-video; no automatic migration is performed.
- Refresh the marketplace and install 1.0.1 under the new key. Existing installations of the old key must rebind their type-61 channels to the new plugin. Keep the XYSNAI Base URL, API key and model names.
