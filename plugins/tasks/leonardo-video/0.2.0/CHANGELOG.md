---
changelogVersion: 1
plugin: 'leonardo-video'
version: '0.2.0'
locale: 'en'
translations:
  zh-CN: CHANGELOG.zh-CN.md
---
# Changelog

## [0.2.0]

### Added
- Support HTTPS image URLs, including signed OSS URLs, for first-frame and start/end-frame video generation on Veo 3.1 and Veo 3.1 Fast.
- Support reference-image generation on regular Veo 3.1, and Leonardo UPLOADED/GENERATED image IDs.
- Add MiniMax H3 (hailuo-03) text/image-to-video at fixed TURBO quality, 5–15 seconds, with 480p, 768p and 2K dimensions and mandatory native audio.

### Security
- Validate image sources and omit signed image URLs from plugin-produced task data, private state and public responses after submission.

### Migration
- Existing Veo usage fields and pricing expressions retain their meaning. The resolution enum adds 480p, 768p and 2k; administrators must configure separate hailuo-03 model pricing for the fixed TURBO tier before enabling it. No automatic pricing migration is performed.
- Upgrade explicitly to 0.2.0 and add hailuo-03 to the channel if needed. Existing Veo text requests continue to work; URL image inputs use the plugin extension input_reference or provider_options.leonardo.
