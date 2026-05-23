# 冰箱管家微信小程序

这是一个微信小程序项目，用来管理冰箱食品和饮料库存。

当前主线已经从早期 React/Vite H5 切换为微信小程序原生开发。旧 H5 文件仍保留在目录中，但不是当前开发主线。

## 当前功能

- 首页展示真实冰箱模板图。
- 点击冰箱分区查看该分区食品清单。
- 支持添加、编辑、删除食品。
- 支持全局统计：总食品数、临期食品、已过期食品。
- 支持搜索食品。
- 日历页展示到期食品。
- 菜谱页根据临期食品做本地规则推荐。
- 拍照录入和扫码录入当前是 mock 解析，保存前必须经过确认页。

## 技术栈

- 微信小程序原生开发
- JavaScript
- WXML
- WXSS
- 微信云开发 / CloudBase

云开发资源：

- AppID: `wx328e2b87665508e7`
- CloudBase 环境 ID: `cloud1-d3g4v0ms8ee56bd94`
- 云数据库集合：`items`、`reminders`、`parseLogs`
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
node --check pages/index/index.js
node --check pages/item-form/item-form.js
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
- 不接真实 AI API。
- 不做订阅消息真实推送。

## 重要说明

- `src/`、`dist/`、`public/`、`package.json` 等旧 H5 相关内容仍存在，但 `project.config.json` 已将它们从小程序打包中忽略。
- 后续如果确认旧 H5 不再需要，应按用户确认逐个清理，不要批量删除。
- 真实 OCR、真实扫码商品库、真实 AI 菜谱推荐属于后续阶段。
