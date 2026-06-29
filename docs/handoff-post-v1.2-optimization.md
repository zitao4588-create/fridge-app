# 冰箱小雷达 · v1.2 发布后优化交接（给 codex）

> 最后更新：2026-06-19
> 来源：v1.2 发布后一轮全量代码 + UI 审查（Claude）。
> 目标读者：**codex**（按 `AGENTS.md` 新会话流程先只读同步，再按本文逐项推进）。
> 单位：`rpx`（750rpx = 屏宽）。设计 token 在 `styles/tokens.wxss`（经 `app.wxss` 全局 `@import`）。

**状态标记**：🟡 待实现 ｜ ✅ 已实现 ｜ ⛔ 不在本轮范围

---

## ★ 范围边界（务必先读）

- 本文档**只覆盖**「代码可维护性 / 性能健壮性 / 体验留存 / UI 无障碍 / 收尾」五类优化。
- ⛔ **不在本轮范围、不要动**：
  - `services/parseService.js`（当前大段不可达代码的下沉/拆分）——由用户单独处理。
  - `cloudfunctions/parseFoodImage`、`generateRecipes`、`parseBarcode`（预留 AI/识别云函数的云端下线/核对）——属高风险云端操作，由用户单独处理。
  - 一切 AI、深度合成、拍照识别、条码、支付、会员、登录、UGC、独立后端（见 `AGENTS.md`「当前不做」）。
- 任务分两类：**A 类可直接开工**（低风险）；**B 类需先出方案 + 用户确认再做**（动云端 / 数据结构 / 产品决策）。**C 类**是已在 `TODO.md` 的收尾项。

---

## 0. 开工前约束（摘自 `AGENTS.md`，逐条遵守）

- 始终用中文沟通；改代码前先说明改哪些文件、为什么改。
- 小步迭代，先做最小可运行版本。
- ⛔ 禁止脚本批量删除文件/目录；旧文件清理、云端资源删除按高风险处理，先停下让用户确认。
- ⛔ 不擅自引入数据库重构、登录、支付、Docker、独立后端、第三方依赖。
- 改完保持主包 < 1.9MB（当前预览主包约 386KB，裕量充足，但新增图片/依赖前先估算）。

## 1. 验证命令（每完成一项都要跑）

```bash
node --check app.js
node --check services/itemService.js
node --check services/reminderService.js
node --check utils/mealRadar.js
node --check utils/status.js
node --check utils/date.js
node --check utils/constants.js
node --check utils/visualAssets.js
node --check pages/index/index.js
node --check pages/calendar/calendar.js
node --check pages/recipes/recipes.js
node --check pkg-add/item-form/item-form.js
# 新增 utils / 云函数时一并 node --check
```
- 改 UI 后在微信开发者工具 `preview`，确认主包体积 + 真机走查相关页面。

---

## 2. 任务总览

| 编号 | 任务 | 类别 | 优先级 | 可直接开工 |
|---|---|---|---|---|
| A1 | 首页/日历重复逻辑抽公共 util | 可维护性 | P1 | ✅ |
| A2 | 首页/日历重复 CSS 抽公共层 | 可维护性 | P2 | ✅ |
| A3 | 死字段 / 死 token 清理 | 代码卫生 | P2 | ✅ |
| A4 | WXSS fallback 旧色值同步 | 无障碍一致性 | P2 | ✅ |
| A5 | 装饰 emoji 加 `aria-hidden` | 无障碍 | P2 | ✅ |
| A6 | 加载骨架 + 读取失败重试 | 健壮性/体验 | P1 | ✅ |
| A7 | 搜索清除按钮（+可选即时过滤） | 体验 | P2 | ✅ |
| B1 | `clearItems` 批量删除优化 | 性能/健壮性 | P1 | ⚠️ 先确认 |
| B2 | 「吃掉/用完」正向闭环 + 减少浪费统计 | 体验/留存 | P1 | ⚠️ 先出方案 |
| B3 | 菜谱页：本地规则版「现在能做什么」 | 体验/留存 | P2 | ⚠️ 先出方案 |
| B4 | 轻量提醒设置页 | 体验 | P2 | ⚠️ 先出方案 |
| B5 | 开饭雷达评分语义复核 | 算法/产品 | P2 | ⚠️ 先确认 |
| C | README 截图 / 提醒文案观察 / 分支合并 | 收尾 | — | 流程内 |

---

# A 类 · 可直接开工（低风险）

## A1. 首页 / 日历重复逻辑抽公共 util 🟡 P1

**现状**：`pages/index/index.js` 与 `pages/calendar/calendar.js` 有几乎逐字相同的实现：
- `bucketOf()`：`index.js:19-21` / `calendar.js:18-20`
- `decorateItem()` vs `decorate()`：`index.js:23-38` / `calendar.js:22-34`（仅 index 多 `thumbImage/thumbType`）
- `buildStats()`：`index.js:40-46` / `calendar.js:36-42`（完全相同）
- 删除确认 `wx.showModal`（连 `confirmColor:'#c94238'` 都一样）：`index.js:397-422` / `calendar.js:245-269`
- `setTabBar()`：`index.js:202-207` / `calendar.js:100-105`（完全相同）

**目标**：单一数据源，改一处状态/雷达规则不必同步两份。

**做法**：
1. 新增 `utils/itemView.js`，导出 `decorateItem(item, { withThumb })`、`buildStats(items)`、`bucketOf(expireDate)`；两页改为 `require` 它。
   - `decorateItem` 用 `withThumb` 开关决定是否调用 `getIngredientVisual`（首页要、日历不要）。
2. 删除确认逻辑：抽 `utils/confirmDelete.js`（或一个共享方法），入参 `{ id, name, onDone }`，内部封 `wx.showModal` + `itemService.deleteItem` + loading/toast。
3. `setTabBar` 可保留在各页（很短），或抽成 page behavior，**优先级低于上面两条**。

**验收**：首页/日历状态标签、统计数字、删除流程行为与现在完全一致；`node --check` 通过；搜索/弹层/雷达不受影响。

**风险**：注意 `decorateItem` 的 `bucket` 字段被首页 `buildHomeZones`/`filterByContext`、日历 `buildListPanel` 依赖，**字段名不能变**（见红线）。

---

## A2. 首页 / 日历重复 CSS 抽公共层 🟡 P2

**现状**：`index.wxss` 与 `calendar.wxss` 有约 100 行完全相同的样式：
- `.mask`（index.wxss:465 / calendar.wxss:288 起）
- `.sheet` / `.sheet::before` / `.sheet-head` / `.sheet-title` / `.sheet-sub` / `.sheet-close` / `.sheet-body`
- `.list-row` / `.list-main` / `.list-name` / `.list-meta`
- `.tag-inline`(+ `.normal/.expiring/.overdue`) / `.row-actions` / `.row-btn`(+ `.danger`)

**做法**：把这些抽到 `styles/` 下一个公共 wxss（如 `styles/sheet.wxss` 或并入 `app.wxss` 全局），两页删除重复段。注意 `app.wxss` 已全局 `@import tokens`，全局样式对所有页生效——确认抽出后**不影响 recipes / item-form**（它们若用到同名 class 需核对）。

**验收**：首页、日历弹层与列表行视觉零变化；`preview` 确认体积未涨。

**风险**：WXSS 全局/局部作用域；抽到全局后类名若与其他页冲突会串样式，抽前先全局搜索类名占用。

---

## A3. 死字段 / 死 token 清理 🟡 P2

逐项核对后删除（删前用编辑器全局搜索确认确无引用）：
1. **`amountText`**：`index.js:29`、`calendar.js:27` 仍计算 `${quantity}${unit}`，但 WXML 已不渲染（数量/单位字段 v1.0 已废）。确认 WXML 无 `amountText` 后删除该行计算。
2. **`data.loading`**：`index.js:173/234/...`、`calendar.js:128` 设了 true/false，但两页 WXML **未使用**。要么删字段，要么配合 A6 真正用起来（**与 A6 二选一，建议并入 A6**）。
3. **`--ai-lilac*` / `--ai-*` token**：`styles/tokens.wxss:58-65`（注释 "AI and saved recipes"）当前无任何页面使用，是 AI 版残留。删除（若 `tdesign-theme.wxss` 有引用先核对）。

**验收**：`node --check` 通过；UI 无变化；`preview` 体积略降或持平。

---

## A4. WXSS fallback 旧色值同步 🟡 P2

**现状**：a11y 整改改了 `tokens.wxss` 的变量定义，但 WXSS 里硬编码的 fallback 仍是**整改前不达标的旧色**。CSS 变量正常加载时不触发，但属修复不彻底、易误导。典型：
- `index.wxss`：`var(--text-sub, #6f7c74)`（多处，新值应为 `#5c6a62`）、`.hero.medium .hero-kicker` 的 `#b96a12`(:62)、`.hero.low .hero-kicker` 的 `#c94238`(:66)、`.sum-item.warning/.danger` 的 `#b96a12/#c94238`(:359/363) 等。
- token 新值对照：`--text-sub` → `#5c6a62`；`--honey-deep` → `#9a5a0e`；`--coral-deep` → `#b3392f`。

**做法**：全局把 fallback 旧色替换为 token 新值（或直接去掉 fallback 只留 `var(--x)`，全项目统一其一）。**纯文本替换，注意只改 fallback、不改 token 定义本身**。

**验收**：观感无变化（正常下本就走变量）；`prefers-reduced-motion` / 对比度不回退。

---

## A5. 装饰性 emoji 加 `aria-hidden` 🟡 P2

**现状**：读屏会朗读出装饰 emoji。需补 `aria-hidden`：
- `pages/index/index.wxml`：`.zone-icon`（`{{zone.icon}}` 🧊❄️🥬…，:63）。
- `pages/calendar/calendar.wxml`：`.stat-ic`（🧺⏰⚠️，:34/41/48 附近）。
- `pages/recipes/recipes.wxml`：`.coming-ic`（🥗🍳⭐，:13/17/21）。
（`<image>` 类已普遍 `aria-hidden`，本项只补 `<text>` emoji。）

**验收**：开启 VoiceOver/TalkBack 走查，分区/统计卡读出的是名称与数字，不再念 emoji。

---

## A6. 加载骨架 + 读取失败重试 🟡 P1

**现状**：`loadItems()` 设了 `loading` 但 WXML 无加载态——首屏在云函数返回前白屏；`.catch` 只 `wx.showToast('读取失败')`(`index.js:255-258` / `calendar.js:151-154`)，失败后页面空白且无重试。

**做法**：
1. WXML 用上 `loading`：首屏加骨架占位（几条灰条/灰卡）或至少居中转圈。
2. `.catch` 里 setData 一个 `loadError: true`，WXML 渲染「读取失败，点此重试」按钮 → 调 `loadItems()`。
3. 与 A3#2 合并：让 `loading` 真正被使用。

**验收**：弱网/断网下首屏有骨架；模拟读取失败显示重试按钮且点击可恢复。

**风险**：`onPullDownRefresh` 已存在，别和新 loading 态打架。

---

## A7. 搜索清除按钮（+ 可选即时过滤）🟡 P2

**现状**：首页搜索须点🔍/回车才触发(`handleSearchConfirm`)，结果走弹层；输入时无反馈、无清除按钮（`index.wxml:46-57`）。日历页无搜索（本项不强求给日历加）。

**做法（最小版）**：输入框非空时显示「×」清除按钮，清空 `searchKeyword`。
**可选增强**：输入 `bindinput` 时防抖（~300ms）即时刷新结果，减少"必须回车"的割裂感。即时过滤复用现有 `filterByContext`(kind:'search')，不新增查询。

**验收**：能一键清空关键词；若做即时过滤，输入即见结果且无明显卡顿。

---

# B 类 · 先出方案 / 用户确认后再做

> B 类**不要直接写实现**。先在对应任务下补一段「方案」并停下来等用户拍板，尤其涉及 `cloudfunctions/`、`items` 数据结构、或新功能的。

## B1. `clearItems` 批量删除优化 🟡 P1 ⚠️

**现状**：`services/itemService.js:199-210` 串行逐条删除（`reduce` 链式 `.then(deleteItem)`），N 条 = N 次串行网络往返，每次还重复失效缓存。数据多时清空很慢。

**两个候选方案（请用户二选一）**：
- **方案甲（推荐，但动云端）**：新增云函数 `clearMyItems`，云端 `db.collection('items').where({}).remove()`（云函数内 `where` 默认按调用者 `_openid` 受限，需在函数内显式用 `cloud.getWXContext().OPENID` 过滤）。前端 `clearItems` 改为 `callFunction`。**注意**：动 `cloudfunctions/` 属较高风险，需用户确认并由用户/确认后部署。
- **方案乙（纯前端保底）**：前端改并行删除——分批 `Promise.all`（每批 ≤10，避免并发过高），全部完成后只失效一次缓存。不动云端。

**验收**：清空 50+ 条耗时明显下降；清空后首页/日历回到空态；失败有 toast。

---

## B2. 「吃掉 / 用完」正向闭环 + 减少浪费统计 🟡 P1 ⚠️ 需产品确认

**洞察**：现在列表项只有「编辑/删除」，把"正常吃掉"与"误录删除"混为一谈；开饭雷达天天提示"今天先用掉 X"，但用户用掉后只能删除，缺正反馈。这是**纯本地、强留存、零合规风险**的方向（不碰 AI/支付）。

**待用户确认的产品点**：
- 交互：列表行/详情加「✓ 吃掉了」按钮？还是滑动操作？
- 数据：是否新增 `consumptionLogs` 集合（记录吃掉的 name/category/date），还是仅本地缓存统计？（**改 schema 属红线，须先确认**）
- 展示：在哪露出「本月帮你减少浪费 N 样」——首页 hero？日历报告？

**做法**：先产出方案（交互草图 + 数据方案 + 落点），评审通过再实现。

---

## B3. 菜谱页：本地规则版「现在能做什么」🟡 P2 ⚠️ 需产品确认

**现状**：`pages/recipes` 长期是占位页（`recipes.wxml`），对留存不利。

**方向**：做**纯本地、规则驱动**的菜谱匹配——内置静态菜谱库（`utils/recipeLexicon.js`，菜名→所需食材标签），按当前库存匹配「现在能做 / 还差 1-2 样」。**完全不调云端/AI/深度合成**，个人主体合规。

**待确认**：菜谱库规模与维护方式（手维护 JSON）、匹配粒度（按食材名还是品类桶）、主包体积影响（纯文本，可控）。先出方案再做。

---

## B4. 轻量提醒设置页 🟡 P2 ⚠️ 需产品确认

**现状**：提醒规则写死——提前 3 天（云函数 `EXPIRY_REMIND_DAYS`）、每日 09:00 汇总一条。用户无可调项。

**方向**：给一个轻设置（放菜谱页「隐私与数据」旁，或新「设置」入口）：提醒总开关 + 提前天数（1/3/7）。注意提前天数当前由**云函数环境变量**控制，前端可调需要把该偏好写入用户数据并让云函数读取——**涉及前后端约定，先出方案**。

---

## B5. 开饭雷达评分语义复核 🟡 P2 ⚠️ 需确认

**现状**：`utils/mealRadar.js:114`
```js
const expiryValueScore = expiringCount > 0 ? Math.min(expiringCount * 5, 15) : 8
```
即「临期食材越多，可开饭指数越高（最高 +15）」。把"临期"当成**可开饭的资源**加分，但它在文案里又被当作**待紧急处理的风险**，二者有语义张力。

**做法**：与用户确认评分模型到底想表达「有东西可做饭(临期=资源)」还是「临期是负担(应降分或中性)」，再决定是否调整该项权重。**改前先确认，避免动了用户精心调过的体感分。**

---

# C 类 · 收尾项（已在 `TODO.md`，按流程完成）

- 更新 README 截图为 v1.2 UI（`TODO.md` §A 未勾选项）。
- 观察每日汇总提醒文案是否清楚（`TODO.md` §C 末项）。
- 发布前将功能分支合并到目标发布分支（`TODO.md` §A 末项）。

---

## 红线：本轮不能动

- ⛔ `services/parseService.js`、`cloudfunctions/parseFoodImage|generateRecipes|parseBarcode`（见范围边界）。
- ⛔ AI / 深度合成 / 拍照识别 / 条码 / 支付 / 会员 / 登录 / UGC / 独立后端 / Docker / Vercel / Supabase / Next.js。
- ⛔ `items` 数据结构（`FridgeItem` 字段）——B2/B4 若需改，先确认。
- ⛔ 脚本批量删文件 / 删云端资源 / 删历史云函数。
- ⛔ 不恢复「数量(amountText)」为用户字段；不在首页恢复全局库存统计（保留在日历）。
- 保持：5 分区固定、分包独立 npm 架构、`custom-tab-bar` + `setTabBar({hidden})` 弹层隐藏底栏机制、主包 < 1.9MB。
- A1 抽取时，下列字段契约不得改名：`zone.{key,theme,location,name,temperature,icon,itemCount,expiring,overdue,items}`、`food/item.{_id,name,bucket,statusLabel,statusHint,expireDateText,thumbImage,category,storageLocation,note}`。

## 交付与回报格式

每完成一项：说明改了哪些文件 + 为什么、贴 `node --check` 结果、`preview` 体积、需真机走查的点。A 类可连续做；**B 类务必先停下出方案等确认**。按 `AGENTS.md` 收尾流程在 `PROJECT_CONTEXT.md`/`TODO.md`（必要时 `DECISIONS.md`/`BUG_NOTES.md`）登记本轮进展。
