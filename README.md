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
- 菜谱页当前是 AI 菜谱体验版，已接入云函数 AI 路径，服务不可用或额度受限时回退 mock，根据冰箱库存标记已有食材、缺少食材和临期优先食材。
- AI 菜谱页进入后默认等待用户选择入口，不自动展示临期去化内容。
- AI 菜谱页支持“菜谱盲盒”和“我来选食材”。
- 首页提供“智能录入”入口。
- 智能录入支持手动输入名称后推荐分区。
- 分区弹窗内支持手动添加、拍食品、拍包装。
- 拍食品、拍包装、拍购物小票都会经过识别确认页，确认后才保存。
- 添加和识别确认流程不再要求填写数量、单位；保存时使用兼容默认值。
- 存放分区只保留冷藏、冷冻、门架、果蔬抽屉、变温 5 个标准分区。
- 日历页库存弹窗支持直接删除食品。

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
- 不接真实条形码商品库。
- 不接真实天气 API 或真实联网搜索。
- 不做订阅消息真实推送。

## 重要说明

- `src/`、`dist/`、`public/`、`package.json` 等旧 H5 相关内容仍存在，但 `project.config.json` 已将它们从小程序打包中忽略。
- 后续如果确认旧 H5 不再需要，应按用户确认逐个清理，不要批量删除。
- 条形码扫描模块已从用户入口移除；后续如恢复，需要重新确认低成本商品库方案。
