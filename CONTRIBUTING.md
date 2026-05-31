# Contributing

Thanks for considering a contribution to Fridge Radar.

This project is currently a WeChat Mini Program MVP. The main goal is to keep the app small, practical, and easy to run in WeChat Developer Tools.

## Project Direction

Please keep contributions aligned with the current direction:

- WeChat Mini Program native development
- JavaScript, WXML, and WXSS
- CloudBase cloud database and cloud functions
- small, testable changes
- no independent backend server unless it is discussed first
- no Docker, payment, login system, or large framework migration without prior discussion

## Good First Issues

Good first contribution areas include:

- README and setup guide improvements
- CloudBase deployment notes
- bug reproduction notes
- UI copy cleanup
- small style fixes
- basic validation and error-state improvements

## Before You Change Code

1. Open the project in WeChat Developer Tools.
2. Confirm the mini program can compile.
3. Check whether the change belongs in a page, service, utility, or cloud function.
4. Keep the pull request focused on one problem.

For business logic, prefer the existing `services/` layer instead of putting complex database logic directly into page files.

## Pull Request Checklist

Before opening a pull request, please check:

- The change has a clear user-facing or maintainer-facing purpose.
- No API keys, tokens, private `.env` files, or personal secrets are committed.
- CloudBase environment-specific values are documented if they are required.
- Existing mini program pages still compile.
- The README or setup docs are updated if the change affects local setup.

Recommended local checks:

```bash
node --check app.js
node --check services/itemService.js
node --check services/parseService.js
node --check services/recipeService.js
node --check pages/index/index.js
node --check pages/item-form/item-form.js
node --check pages/quick-add/quick-add.js
node --check pages/parse-confirm/parse-confirm.js
node --check pages/batch-parse-confirm/batch-parse-confirm.js
node --check pages/calendar/calendar.js
node --check pages/recipes/recipes.js
node --check cloudfunctions/generateRecipes/index.js
npm run lint
npm run build
```

## Issue Reports

Useful issue reports include:

- device or simulator information
- WeChat Developer Tools version
- page where the issue happened
- exact steps to reproduce
- expected behavior
- actual behavior
- screenshots or short screen recordings when relevant

## Security Issues

Please do not open public issues for secrets, data exposure, authorization bypasses, or other sensitive vulnerabilities. Follow [SECURITY.md](SECURITY.md).
