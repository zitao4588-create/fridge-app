# Changelog

## [2.0.0] - 2026-07-13

- 新增可选数量和纯数字展示，历史默认数量按未记录处理。
- 新增常温储物分区和餐盘式库存消耗、撤销。
- 新增邀请制私有家庭共享、成员管理和服务端权限校验。
- 新增 CloudBase v2 安全配置、领域测试和发布候选报告。
- 正式家庭集合已设为 `ADMINONLY`，`familyInventory` 已切换到无前缀正式集合，`items` 保持 `PRIVATE`。
- 健康余额、AI、识别、支付、会员和公开 UGC 不进入本版本。

All notable changes to this project should be documented in this file.

This project uses simple release notes rather than a strict versioning process while the mini program is still in MVP development.

## Unreleased

- Improved open-source README for external developers and reviewers.
- Added MIT license.
- Added contribution guidelines.
- Added security reporting policy.
- Added Codex for Open Source application notes.
- Added CloudBase setup guide for fork users.

## v0.1.0 Draft

Planned first public release.

Expected release scope:

- WeChat Mini Program MVP.
- CloudBase-backed food inventory records.
- Fridge-zone home screen.
- Food add, edit, delete, search, and expiry status flows.
- Expiry calendar page.
- AI recipe experience page.
- Photo, package, and receipt confirmation flows.
- Cloud functions for OpenID, parsing, recipe generation, barcode compatibility, and expiry reminders.
- Local product visual assets.

Before publishing this release:

- add screenshots or a demo video to README
- confirm CloudBase setup instructions from a clean fork
- verify no provider keys or private `.env` files are committed
- create a GitHub release from the final checked commit
