# Codex for Open Source Application Notes

This document prepares the repository for an OpenAI Codex for Open Source application. It should stay honest: do not claim usage, downloads, or adoption that the project does not have yet.

## Current Fit

Current public fit: early-stage candidate, not yet a strong application.

Strengths:

- public GitHub repository
- active development history
- complete WeChat Mini Program MVP direction
- real product workflows, not just a toy demo
- CloudBase database and cloud function architecture
- AI-assisted recipe and food parsing flows
- clear maintainer ownership

Weaknesses:

- low visible public adoption
- no GitHub releases yet
- no issue/PR history from external users yet
- README and setup docs are still being improved
- no public demo video or screenshots documented in README yet
- no monthly download metric because this is a mini program, not an npm package

## Evidence To Collect Before Submission

Collect real evidence only:

- GitHub stars
- forks
- watchers
- issues opened by users
- pull requests
- release tags
- WeChat Mini Program test users
- real user feedback
- screenshots or demo video
- CloudBase setup notes from another developer trying to run the project
- examples of how Codex helped review code, write tests, improve docs, or check security-sensitive cloud functions

## Recommended Work Before Applying

High priority:

1. Publish `v0.1.0` as the first GitHub release.
2. Add screenshots or a short demo video to README.
3. Create at least 3 to 5 focused GitHub issues for known roadmap items.
4. Use pull requests for upcoming changes, even if they are maintainer-authored.
5. Add a clean fork setup guide for CloudBase.
6. Verify that no provider API keys or secrets are committed.

Medium priority:

1. Add issue templates.
2. Add a short architecture diagram.
3. Add a cloud function provider swap guide.
4. Document known limitations for OCR, AI recipes, and CloudBase permissions.

## Suggested Repository Description

Open-source WeChat Mini Program for fridge inventory, expiry tracking, CloudBase storage, and AI-assisted recipe suggestions.

Suggested topics:

- wechat-miniprogram
- cloudbase
- fridge-management
- food-waste
- inventory-management
- ai-recipes
- javascript
- wxml
- wxss

## Draft Answer: Why Does This Repository Qualify?

Fridge Radar is an open-source WeChat Mini Program that helps households manage fridge inventory, track expiry dates, and turn soon-to-expire ingredients into recipe ideas. It combines a practical consumer workflow with a complete WeChat Mini Program architecture: native JavaScript/WXML/WXSS pages, CloudBase database collections, cloud functions, `_openid`-based user data separation, image/OCR confirmation flows, and AI-assisted recipe generation.

The project is not a generic demo. It implements an end-to-end workflow around a real everyday problem: reducing household food waste by making fridge contents visible and actionable. It can also serve as a reference project for developers building CloudBase-backed WeChat Mini Programs with AI features that stay behind cloud functions instead of exposing provider keys in the frontend.

The repository is currently an early-stage open-source project. Public adoption signals are still developing, but the codebase is actively maintained and already contains a functional MVP, product documentation, and a clear roadmap toward a reusable mini program starter for fridge inventory and AI food workflows.

## Draft Answer: How Would API Credits Be Used?

API credits would be used to improve and maintain AI-assisted features in the project, especially food image understanding, package or receipt parsing, recipe generation, and security-aware code review for cloud functions.

The main use cases would be:

- test and improve structured food parsing from images, packages, and receipts
- generate safer and more useful recipe suggestions from selected ingredients
- compare outputs across prompts and models for reliability
- create better fallback behavior when OCR or AI parsing fails
- review cloud function code for input validation, data exposure, and secret-handling risks
- generate and maintain developer documentation for CloudBase setup and fork usage
- create regression test cases for common food inventory and expiry scenarios

Credits would not be used for unrelated product marketing or artificial repository activity. The goal is to make the open-source mini program easier to run, safer to fork, and more useful as a practical AI-enabled WeChat Mini Program reference.

## Short Honest Version For The Form

Fridge Radar is an early-stage open-source WeChat Mini Program for fridge inventory, expiry tracking, CloudBase storage, and AI-assisted recipe suggestions. It has an active MVP and clear maintainer ownership, but public adoption is still small. I am applying because Codex and API credits would directly help improve cloud function safety, AI parsing quality, recipe-generation reliability, and developer documentation so that other mini program developers can reuse the project more easily.
