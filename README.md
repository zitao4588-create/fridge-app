# 冰箱管家微信小程序

这是一个微信小程序项目，用来管理冰箱食品和饮料库存。

当前主线已经从早期 React/Vite H5 切换为微信小程序原生开发。旧 H5 文件仍保留在目录中，但不是当前开发主线。

## 当前功能

- 首页展示可 DIY 的分区货架，支持冷藏、冷冻、门上储物格、果蔬抽屉、变温区启用和排序。
- 首页分区本身作为添加入口，分区食品通过横向卡片查看。
- 首页用“确定放哪 / 不确定放哪”两个指示牌表达录入路径。
- 点击首页分区进入添加方式面板，点击分区统计查看对应食品清单，点击食品图片查看、编辑、删除。
- 支持添加、编辑、删除食品。
- 支持全局统计：总食品数、临期食品、已过期食品。
- 支持搜索食品。
- 日历页展示到期食品。
- 日历页提供临期去化模块，展示今日到期、3 天内、7 天内和已过期食品，并直接生成 3 道去化推荐菜谱卡片。
- 菜谱页当前是 AI 菜谱体验版，使用 mock AI / mock 天气结构，根据冰箱库存标记已有食材、缺少食材和临期优先食材。
- AI 菜谱页进入后默认等待用户选择入口，不自动展示临期去化内容。
- AI 菜谱页支持“我来选食材”、菜品盲盒、每日微醺时刻、每日健康饮品。
- 首页提供“智能录入”入口。
- 智能录入支持手动输入名称后推荐分区。
- 分区弹窗内支持手动添加、拍食品、拍包装 / 条码。
- 拍食品、拍包装 / 条码、拍购物小票当前是 mock 解析，保存前必须经过确认页。

## 技术栈

- 微信小程序原生开发
- JavaScript
- WXML
- WXSS
- 微信云开发 / CloudBase

云开发资源：

- AppID: `wx328e2b87665508e7`
- CloudBase 环境 ID: `cloud1-d3g4v0ms8ee56bd94`
- 云数据库集合：`items`、`reminders`、`parseLogs`、`fridgeZoneConfigs`
- 云函数：`getOpenId`、`parseFoodImage`、`parseBarcode`、`generateRecipes`、`sendExpiryReminders`

## 本地运行

1. 打开微信开发者工具。
2. 导入本目录：`/Users/qzt/Desktop/projects/fridge-app`
3. 使用项目内 `project.config.json`。
4. 确认开发者工具识别到：
   - `miniprogramRoot: "./"`
   - `cloudfunctionRoot: "cloudfunctions/"`
5. 编译运行小程序。

## 验证命令

这些命令只做基础语法和旧 H5 构建检查：

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

说明：`npm run build` 仍来自早期 Vite 配置，只能作为兼容检查，不代表当前主线是 H5。

## 当前不做

- 不做 Vercel 部署。
- 不接 Supabase。
- 不把 React H5 作为主线。
- 不做 Next.js。
- 不做独立后端服务器。
- 不做登录页。
- 不接真实 OCR。
- 不接真实条形码商品库。
- 不接真实 AI API、真实天气 API 或真实联网搜索。
- 不做订阅消息真实推送。

## 重要说明

- `src/`、`dist/`、`public/`、`package.json` 等旧 H5 相关内容仍存在，但 `project.config.json` 已将它们从小程序打包中忽略。
- 后续如果确认旧 H5 不再需要，应按用户确认逐个清理，不要批量删除。
- 真实 OCR、真实扫码商品库、真实 AI / 天气 / 联网搜索菜谱推荐属于后续阶段。
