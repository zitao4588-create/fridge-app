# CloudBase Setup Guide

This guide is for developers who fork Fridge Radar and want to run it with their own WeChat Mini Program and CloudBase environment.

Do not reuse the maintainer's AppID or CloudBase environment. They are local development identifiers, not shared credentials.

## 1. Prepare Accounts And Tools

You need:

- a WeChat Mini Program account
- WeChat Developer Tools
- a CloudBase / WeChat Cloud Development environment
- permission to create cloud database collections
- permission to upload cloud functions

## 2. Import The Mini Program

1. Open WeChat Developer Tools.
2. Import the repository folder.
3. Choose Mini Program.
4. Use your own AppID.
5. Confirm these project settings:
   - `miniprogramRoot: "./"`
   - `cloudfunctionRoot: "cloudfunctions/"`

## 3. Replace Project AppID

Open `project.config.json` and replace:

```json
"appid": "your-own-appid"
```

The repository may contain the maintainer's local AppID. That value should not be used in your fork.

## 4. Replace CloudBase Environment ID

Open `app.js` and replace:

```js
cloudEnvId: 'your-own-cloudbase-env-id'
```

This value is used by:

```js
wx.cloud.init({
  env: this.globalData.cloudEnvId,
  traceUser: true,
})
```

## 5. Create Database Collections

Create these collections in your CloudBase console:

- `items`
- `reminders`
- `parseLogs`
- `fridgeZoneConfigs`
- `recipeRecords`

Recommended permission model:

- user-owned data should be readable and writable only by the creator

At minimum, check permissions for:

- `items`
- `reminders`
- `parseLogs`
- `fridgeZoneConfigs`
- `recipeRecords`

## 6. Deploy Cloud Functions

Deploy each folder under `cloudfunctions/`:

- `getOpenId`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

You can deploy them with WeChat Developer Tools.

After deployment, check that each function exists in the CloudBase console.

## 7. Configure Provider Secrets

Some AI, OCR, or weather capabilities may require provider keys in cloud functions.

Keep secrets on the cloud function side. Do not put provider keys in:

- mini program page files
- `app.js`
- frontend service files
- committed `.env` files
- screenshots
- public issue comments

If a provider key is not configured, the related cloud function should fail safely or use the project's existing fallback behavior.

## 8. Run The App

In WeChat Developer Tools:

1. Compile the mini program.
2. Open the home page.
3. Add a test food item manually.
4. Confirm the item appears in the correct fridge zone.
5. Open the calendar page.
6. Open the recipe page.

## 9. Basic Local Checks

Run these from the repository root if Node.js dependencies are installed:

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

Note: `npm run build` checks the legacy Vite setup. The WeChat Mini Program itself should be compiled in WeChat Developer Tools.

## 10. Troubleshooting

If cloud development is unavailable:

- check that the project uses your own AppID
- check that CloudBase is enabled for that AppID
- check that `app.js` points to your environment ID
- restart WeChat Developer Tools

If data does not appear:

- check collection names
- check collection permissions
- check that `getOpenId` is deployed
- check CloudBase function logs

If AI, OCR, or weather features fail:

- check cloud function logs
- check provider keys
- check provider quotas
- confirm that no API key is expected in the frontend
