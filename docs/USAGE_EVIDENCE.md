# Usage Evidence

This document tracks real, verifiable evidence for Fridge Radar's open-source readiness and future Codex for Open Source application.

Do not inflate metrics. If a number is unknown or currently zero, keep it honest.

Last updated: 2026-05-31

## Repository

- Repository: <https://github.com/zitao4588-create/fridge-app>
- Visibility: public
- Created on GitHub: 2026-05-27
- Latest pushed update checked: 2026-05-31
- Description: Open-source WeChat Mini Program for fridge inventory, expiry tracking, CloudBase storage, and AI-assisted recipe suggestions.

## Current GitHub Metrics

Checked on 2026-05-31:

- Stars: 0
- Forks: 0
- Watchers: 0
- Releases: 1
- Open issues: 3
- Closed issues: 2

Topics:

- `wechat-miniprogram`
- `cloudbase`
- `fridge-management`
- `food-waste`
- `inventory-management`
- `ai-recipes`
- `javascript`
- `wxml`
- `wxss`

## Release Evidence

Current public release:

- `v0.1.0 - MVP open-source baseline`
- Release URL: <https://github.com/zitao4588-create/fridge-app/releases/tag/v0.1.0>
- Created on: 2026-05-31

Release scope:

- WeChat Mini Program MVP.
- CloudBase-backed food inventory records.
- Fridge-zone home screen.
- Food add, edit, delete, search, and expiry status flows.
- Expiry calendar page.
- AI recipe experience page.
- Photo, package, and receipt confirmation flows.
- Cloud functions for OpenID, parsing, recipe generation, barcode compatibility, and expiry reminders.
- Local product visual assets.

## Open-Source Readiness Evidence

Completed:

- README rewritten for external developers and reviewers.
- MIT license added.
- Contribution guide added.
- Security policy added.
- CloudBase setup guide added.
- Changelog added.
- Codex for Open Source application notes added.
- GitHub repository description added.
- GitHub topics added.
- GitHub issue templates added.
- Product screenshots added to README.
- First public release created.

Closed roadmap issues:

- #1 Add screenshots and demo video to README
- #3 Add GitHub issue templates

Open roadmap issues:

- #2 Verify CloudBase setup from a clean fork
- #4 Document AI, OCR, and weather provider configuration
- #5 Collect real usage evidence for open-source application

## Product Evidence

Current product screenshots are stored in:

- `docs/screenshots/home-fridge.png`
- `docs/screenshots/calendar-overview.png`
- `docs/screenshots/cookability-report.png`
- `docs/screenshots/ai-recipes.png`

They show:

- fridge inventory home screen
- expiry calendar
- cookability report
- AI recipe suggestions

## Maintainer Evidence

Current known maintainer:

- GitHub user: `zitao4588-create`
- Role: primary maintainer / repository owner

Evidence:

- Repository ownership.
- Maintainer-authored commits.
- Release and issue management activity.
- Project documentation and roadmap maintenance.

## User Evidence

Current known external adoption evidence:

- Stars: 0
- Forks: 0
- Watchers: 0
- Public user issues: none yet
- External pull requests: none yet
- Public download metric: not applicable yet, because this is a WeChat Mini Program repository rather than an npm package.

Current known testing evidence:

- Screenshots show the mini program running with sample inventory and recipe flows.
- No public tester count has been recorded in this repository yet.
- No public user feedback has been recorded in this repository yet.

## Evidence To Collect Next

High priority:

- Record how many people have actually tested the mini program.
- Collect short feedback from testers.
- Add a demo video or GIF if possible.
- Verify the CloudBase setup guide from a clean fork or clean clone.
- Record whether another developer can run the project with their own AppID and CloudBase environment.

Medium priority:

- Ask early users to star the repository if they find it useful.
- Track any forks or community issues.
- Link real issue discussions when users report bugs or request improvements.
- Add dated notes when product flows are tested on a real device.

## Safe Evidence Rules

Allowed in public docs:

- GitHub repository metrics.
- Release links.
- Public issue links.
- Sanitized screenshots.
- Aggregated tester counts.
- Short user feedback with permission.

Do not publish:

- OpenID values.
- CloudBase secrets.
- API keys.
- provider request payloads containing private data.
- real user food inventory unless the user explicitly agrees.
- private chat screenshots without permission.

## Application Notes

Current honest application positioning:

Fridge Radar is an early-stage open-source project with a functional MVP and active maintainer work. It does not yet have strong public adoption metrics. Its strongest current evidence is product completeness, public documentation, release readiness, and a clear open-source roadmap.

For a Codex for Open Source application, avoid claiming broad adoption. Instead, frame the repository as:

- early-stage
- actively maintained
- public and reusable
- focused on a real household food-waste problem
- useful as a WeChat Mini Program + CloudBase + AI workflow reference

Possible wording:

> Fridge Radar is currently an early-stage open-source WeChat Mini Program. Public adoption is still small, but the repository has a functional MVP, a public release, screenshots, CloudBase setup documentation, contribution and security policies, and an active roadmap. Codex and API credits would help improve cloud function safety, AI parsing quality, recipe reliability, and developer documentation before broader community adoption.
