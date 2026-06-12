# PROJECT_CONTEXT.md

最后更新：2026-06-12

## 当前项目目标

项目名称：冰箱小雷达
英文名：Fridge Radar
项目目录：`fridge-app`  
产品方向：家庭冰箱食品饮料库存管理微信小程序

当前仓库主线已经切换为 v1.0 个人主体稳定版。该版本以“能上线、可维护、低合规风险”为优先级：

- 不含 AI / 深度合成
- 不含拍照识别入口
- 不含条形码扫描入口
- 不含登录
- 不含支付
- 不含 UGC

用户可以手动管理冰箱库存，按 5 个分区查看食品状态，在日历中查看到期日，并通过本地算法查看「开饭雷达」可开饭指数。

## 当前 Git 状态说明

2026-06-12 已将 Claude Code 产出的上线分支 `worktree-prelaunch-fixes` 快进合并到根目录 `main`。

- 合并前备份分支：`backup/main-before-v1-sync-20260612`
- 合并后 `main` 当前包含 v1.0 上线版代码
- `main` 当前领先 `origin/main`，尚需用户确认后再 push
- `.claude/` 是本地 Claude Code worktree 目录，不应提交

## 当前技术栈

- 微信小程序原生开发
- 原生 JavaScript
- WXML
- WXSS
- TDesign 小程序组件库
- TDesign 通过 `pkg-add` 分包独立 npm 接入
- 微信云开发 / Tencent CloudBase

当前不使用：

- React / Vite H5
- Vercel
- Supabase
- Next.js
- 独立后端服务器
- Docker
- 登录体系
- 微信支付

## 小程序结构

当前 `app.json` 注册页面：

- `pages/index/index`：冰箱首页
- `pages/calendar/calendar`：到期日历
- `pages/recipes/recipes`：菜谱占位页

当前分包：

- `pkg-add/item-form/item-form`：添加 / 编辑食品表单

当前底部 Tab：

- 冰箱
- 日历
- 菜谱

## 云开发配置

- 小程序 AppID：`wx328e2b87665508e7`
- CloudBase 环境 ID：`cloud1-d3g4v0ms8ee56bd94`
- `app.js` 初始化该云环境
- `project.config.json` 配置：
  - `miniprogramRoot: "./"`
  - `cloudfunctionRoot: "cloudfunctions/"`
  - `packNpmManually: true`
  - `pkg-add` 分包独立 npm

当前主要集合：

- `items`：v1.0 主业务集合
- `reminders`：提醒能力预留
- `parseLogs`：识别能力历史 / 后续预留
- `fridgeZoneConfigs`：历史分区配置集合，v1.0 首页已改为固定 5 分区

当前云函数目录仍保留：

- `getOpenId`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

说明：

- v1.0 前端不主动调用 AI 菜谱、拍照识别、条码能力。
- 相关云函数保留用于历史兼容和后续企业主体版本。
- API key 不得放入小程序前端。

## 当前已完成功能

### 首页

- 展示 5 个固定冰箱分区：
  - 冷藏区
  - 冷冻区
  - 门上储物格
  - 果蔬抽屉
  - 变温区
- 每个分区展示：
  - 分区名称
  - 温度标签
  - 库存 / 临期 / 过期统计
  - 横向食材卡片
  - `＋ 加食材` 入口
- 支持搜索食材名称
- 支持点击食品卡片查看详情
- 食品详情可查看到期日、状态和备注
- 支持编辑食品
- 支持删除食品，带二次确认
- 支持清空全部食品数据，带二次确认
- 吉祥物文案按库存状态变化
- 食材缩略图按品类 / 食材族群显示写实图
- 用户照片显示接口已预留：`source === "photo"` 且存在 `imageFileId` 时优先显示用户照片

### 添加 / 编辑

- 添加 / 编辑页位于 `pkg-add/item-form`
- 支持录入：
  - 食品名称
  - 品类
  - 生产日期
  - 保质期天数
  - 过期日期
  - 存放分区
  - 备注
- 数量和单位不再作为主要用户字段，保存时默认兼容：
  - `quantity: 1`
  - `unit: "份"`
- 支持生产日期 + 保质期自动计算过期日期
- 支持直接选择过期日期
- 支持字段级校验
- 支持根据名称 / 品类给出存放分区建议

### 日历

- 展示月历
- 有食品到期的日期显示标记
- 点击日期展示当天到期食品
- 顶部显示总库存、临期、过期统计
- 统计卡可展开清单
- 到期清单支持编辑 / 删除
- 「开饭雷达」使用纯本地算法评分
- 评分依据：
  - 可用库存数量
  - 品类多样性
  - 临期食材数量
  - 过期风险
- 不调用云端 AI

### 菜谱

- 当前是占位页
- 文案为「菜谱搭配，敬请期待」
- 展示后续家常菜谱方向
- 提供隐私与数据说明
- 支持打开微信隐私保护指引
- 当前不提供 AI 菜谱生成
- 当前不提供菜谱收藏

### 工程与资源

- 旧 React / Vite H5 已从主线删除
- 旧 `pages/quick-add`、`pages/parse-confirm`、`pages/batch-parse-confirm`、`pages/profile` 已从 v1.0 主线删除
- `recipeService`、`recipeRecordService`、`zoneConfigService` 已从 v1.0 主线删除
- `images/recipe` 菜谱图片已删除
- 食材图收敛为 16 张写实桶图
- `utils/visualAssets.js` 负责食材图片归桶
- 主包约 1.70MB
- TDesign 分包约 276KB
- 新增无障碍与交付文档：
  - `docs/a11y-checklist.md`
  - `docs/handoff-index.md`

## 当前数据结构

核心集合：`items`

```ts
type FridgeItem = {
  _id: string;
  _openid: string;
  name: string;
  category:
    | "蔬菜"
    | "水果"
    | "肉类"
    | "水产"
    | "蛋"
    | "乳制品"
    | "豆制品"
    | "主食"
    | "饮料"
    | "速冻"
    | "调料"
    | "其他";
  quantity: number;
  unit: string;
  productionDate?: string;
  shelfLifeDays?: number;
  expireDate: string;
  storageLocation: "冷藏" | "冷冻" | "门架" | "果蔬抽屉" | "变温";
  note?: string;
  source: "manual" | "photo" | "package" | "receipt";
  imageFileId?: string;
  parseConfidence?: number;
  parseRawText?: string;
  parseStatus?: string;
  createdAt: number;
  updatedAt: number;
};
```

兼容说明：

- 历史 `肉蛋` 品类在图片归桶中兼容。
- 历史 `保鲜` 存放位置归一为 `果蔬抽屉`。
- `barcode` 字段仍被 `itemService` 兼容清洗，但 v1.0 不再产生新条码数据。

## 当前主要文件职责

- `app.js`：CloudBase 初始化
- `app.json`：页面、分包、TabBar 配置
- `app.wxss`：全局样式
- `custom-tab-bar/*`：自定义底部 TabBar
- `pages/index/*`：首页库存、分区、搜索、详情、删除、清空
- `pages/calendar/*`：到期日历、本地开饭雷达、统计清单
- `pages/recipes/*`：菜谱占位页、隐私指引入口
- `pkg-add/item-form/*`：添加 / 编辑食品
- `services/itemService.js`：食品增删改查、分页读取、轻缓存
- `services/reminderService.js`：日历事件和提醒能力预留
- `services/parseService.js`：识别能力历史 / 后续预留，当前不开放拍照入口
- `utils/constants.js`：品类、分区、来源标签
- `utils/visualAssets.js`：食材图片归桶
- `styles/tokens.wxss`：视觉 token
- `styles/tdesign-theme.wxss`：TDesign 主题

## 当前验证状态

Claude Code 上线分支记录过以下验证：

- `node --check` 关键 JS 通过
- 微信开发者工具 `preview` 通过
- 主包约 1.70MB
- TDesign 分包约 276KB
- 前端无 AI / 拍照识别用户入口
- `services/parseService.js` 中相机 / 相册入口当前直接拒绝，避免隐私声明不一致

本次 2026-06-12 合并后仍需在根目录复跑：

- `node --check app.js`
- `node --check services/itemService.js`
- `node --check services/parseService.js`
- `node --check services/reminderService.js`
- `node --check utils/visualAssets.js`
- `node --check utils/constants.js`
- `node --check pages/index/index.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check pkg-add/item-form/item-form.js`

## 重要限制

v1.0 个人主体阶段不要恢复：

- AI 菜谱
- 深度合成能力
- 拍照识别入口
- 条形码扫描入口
- 支付 / 会员
- 登录页
- UGC
- 独立后端
- Docker
- Vercel / Supabase / Next.js

如后续要做 AI、OCR、拍照识别或支付，必须先明确主体资质和审核类目，原则上进入企业主体版本后再做。

## 下一步建议

优先做上线后稳定性：

- 真机检查首页 5 分区、添加 / 编辑、删除、搜索、清空
- 真机确认常见食材缩略图归桶正确
- 更新 README 截图，替换早期 UI 截图
- 检查微信后台隐私协议、服务类目、服务内容是否和 v1.0 功能一致
- 评估到期提醒订阅消息方案，但不要直接开启真实推送
- 确认后将当前 `main` push 到 `origin/main`
