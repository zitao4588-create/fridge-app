# Fridge Radar / 冰箱雷达

Fridge Radar is an open-source WeChat Mini Program for household fridge inventory management. It helps users record food, track expiry dates, organize fridge zones, and generate recipe ideas based on existing ingredients, weather, and seasonal context.

The current product is built around a practical daily workflow:

1. Add food manually or through photo-based confirmation flows.
2. Place food into real fridge zones such as chilled, frozen, door shelf, produce drawer, and flexible temperature zone.
3. Track what is expiring soon.
4. Turn soon-to-expire ingredients into recipe suggestions.

This repository is currently an MVP in active development. It is useful as both a working mini program and a reference implementation for WeChat Mini Program + CloudBase + AI-assisted food workflows.

## Why This Project Exists

Food waste often happens because people forget what is already in the fridge or miss expiry dates. Fridge Radar focuses on a small but common household problem:

- What do I have?
- Where is it stored?
- What will expire soon?
- What can I cook with it today?

The project is intentionally small enough to run as a mini program, but complete enough to show real product flows: inventory, calendar, AI recipe generation, image/OCR parsing, CloudBase storage, and user-owned data separation through `_openid`.

## Current Features

- WeChat Mini Program native pages built with JavaScript, WXML, and WXSS.
- CloudBase initialization and cloud database integration.
- Food inventory create, read, update, and delete flows.
- Food search and expiry status calculation.
- Fridge-zone based home screen with configurable zones.
- Standard zones:
  - chilled
  - frozen
  - door shelf
  - produce drawer
  - flexible temperature zone
- Expiry calendar view.
- Soon-to-expire food handling suggestions.
- AI recipe experience page.
- Recipe modes:
  - seasonal recipe blind box
  - user-selected ingredients
- Recipe favorites.
- Photo, package, and receipt confirmation flows before saving parsed food.
- Cloud functions for OpenID, food parsing, barcode compatibility, recipe generation, and expiry reminders.
- Local visual assets for food categories, recipes, mascot states, tab bar icons, and fridge templates.

## Tech Stack

- WeChat Mini Program native development
- JavaScript
- WXML
- WXSS
- WeChat Cloud Development / Tencent CloudBase
- CloudBase cloud database
- CloudBase cloud functions

Main cloud database collections:

- `items`
- `reminders`
- `parseLogs`
- `fridgeZoneConfigs`
- `recipeRecords`

Main cloud functions:

- `getOpenId`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

## Repository Structure

```text
.
├── app.js                         # Mini program startup and CloudBase init
├── app.json                       # Mini program page and tab configuration
├── app.wxss                       # Global WXSS
├── cloudfunctions/                # CloudBase cloud functions
├── custom-tab-bar/                # Custom mini program tab bar
├── images/                        # Local product visual assets
├── pages/                         # Mini program pages
├── services/                      # Business logic and CloudBase access
├── styles/                        # Shared visual styles
├── utils/                         # Constants, date helpers, status helpers
├── project.config.json            # WeChat Developer Tools project config
└── package.json                   # Legacy H5/Vite compatibility scripts
```

Note: the earlier React/Vite H5 files are kept for compatibility and history, but the active product direction is the WeChat Mini Program.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/zitao4588-create/fridge-app.git
cd fridge-app
```

### 2. Open with WeChat Developer Tools

1. Open WeChat Developer Tools.
2. Import this repository folder.
3. Use the project config in `project.config.json`.
4. Confirm:
   - `miniprogramRoot: "./"`
   - `cloudfunctionRoot: "cloudfunctions/"`

### 3. Configure your own CloudBase environment

If you fork this project, use your own WeChat Mini Program AppID and CloudBase environment.

The maintainer's local AppID and CloudBase environment may appear in project configuration files because this repository is also used as an active development project. They are not reusable credentials for your own mini program.

For your own fork, update:

- `project.config.json`
- `app.js`
- any cloud function environment configuration that points to a specific CloudBase environment

Do not commit API keys, service tokens, or private `.env` files.

For a step-by-step setup guide, read [docs/CLOUDBASE_SETUP.md](docs/CLOUDBASE_SETUP.md).

### 4. Create required CloudBase collections

Create these collections in the CloudBase console:

- `items`
- `reminders`
- `parseLogs`
- `fridgeZoneConfigs`
- `recipeRecords`

Recommended permission model for user data collections:

- only the creator can read and write their own records

### 5. Deploy cloud functions

Deploy these folders from `cloudfunctions/` through WeChat Developer Tools or your CloudBase deployment workflow:

- `getOpenId`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

## Verification

These checks are useful for basic syntax and legacy H5 compatibility:

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

`npm run build` belongs to the earlier Vite setup and should be treated as a compatibility check, not as the main mini program build path.

## Current Boundaries

The project currently does not include:

- independent backend server
- Vercel deployment
- Supabase
- Next.js
- Docker
- payment flow
- phone number login
- real public barcode product database
- frontend-side API key storage
- real subscription-message push

AI, OCR, weather, and recipe-related capabilities should stay behind cloud functions. The mini program frontend should not store provider API keys.

## Open Source Roadmap

The next open-source readiness tasks are:

- add more screenshots or a short demo video
- add issue templates
- publish the first GitHub release
- collect real usage evidence from testers or early users
- document which AI/OCR providers can be swapped in cloud functions

## Contributing

Contributions are welcome. Please start by reading [CONTRIBUTING.md](CONTRIBUTING.md).

Good first contribution areas:

- documentation improvements
- setup guide corrections
- UI copy improvements
- CloudBase deployment notes
- small bug fixes with clear reproduction steps

## Security

Please read [SECURITY.md](SECURITY.md) before reporting sensitive issues.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
