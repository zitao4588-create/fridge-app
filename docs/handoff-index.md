# 冰箱小雷达 · UI 开发交付规格（全页面 · 合并版）

> 本文是全 App 前端 UI 重构的**主交付规格**，合并：①首页（原 handoff，已实现）②日历 ③菜谱 ④添加/编辑表单 ⑤自定义 tab 栏 ⑥跨页一致性。
> 来源：两轮 design-critique。状态：**所有改动项已批准**。
> 单位：`rpx`（750rpx = 屏宽）。设计 token 落在 `styles/tokens.wxss`（经 `app.wxss` 全局 `@import`）。

**实现状态标记**：✅ 已实现 ｜ 🟡 待实现（本规格批准范围）

---

## 0. 涉及文件总览

| 文件 | 作用 | 本规格涉及 |
|---|---|---|
| `styles/tokens.wxss` | 全局设计 token | ✅ 已加 `--text-light/-neutral-*`、门架改色 |
| `pages/index/index.{wxml,wxss}` | 首页 | ✅ 重构；🟡 底部新增"清空数据"危险区 |
| `pages/index/index.js` | 首页逻辑 | 🟡 新增 `handleClearAll`（含二次确认） |
| `pages/calendar/calendar.{wxss}` | 日历 | 🟡 触控/配色对齐首页、删死 CSS、雷达微调 |
| `pages/recipes/recipes.{wxml,wxss}` | 菜谱占位+隐私 | 🟡 移除清空按钮（迁首页）、文案精简 |
| `pages/recipes/recipes.js` | 菜谱逻辑 | 🟡 移除 `handleClearAll`（迁首页） |
| `pkg-add/item-form/item-form.{wxml,wxss}` | 添加表单 | 🟡 推荐条归位、与 TDesign 协调 |
| `styles/tdesign-theme.wxss` | TDesign 主题映射 | 🟡 核对 t-input/t-cell 与自定义控件协调 |
| `custom-tab-bar/*` | 底栏 | 🟡 确认选中态图标切换 |

---

## 1. 全局设计 token（`styles/tokens.wxss`）✅ 已实现

```css
--text-light: #647264;        /* 原 #9aa9a1 对比不达标 → 提升至 ≥4.5:1 */
--neutral-soft: #eef0ec;      /* 新增：中性操作底（编辑等非语义动作） */
--neutral-ink:  #4d5a52;      /* 新增：中性操作字 */
/* 门架改暖棕，避开蜜橙(临期)撞色 */
--zone-door-tint:   #f1ece3;
--zone-door-accent: #bfa074;
--zone-door-ink:    #7d5f38;
```
> 全局生效：日历/菜谱/表单的浅色文字对比度一并受益。

---

## 2. 跨页通用规范（所有页面遵循）

### 2.1 颜色语义纪律
- **橙/红仅表示状态**（临期=honey，过期/删除=coral），不得用作分区身份色。
- **中性操作（编辑等）= `--neutral-soft/-ink`**，不再用冰蓝。
- **冰蓝 `--ice-*` 收敛**：仅保留在「开饭雷达屏」（刻意的科技蓝）；`.today-btn`/`.row-btn`/`.settings-link` 等散用处改为中性或薄荷。链接蓝可保留但需统一。

### 2.2 字号底线
正文类 ≥22rpx；彩色风险标签 ≥20rpx；禁止 <20rpx 的功能性文字。

### 2.3 触控底线
所有可点元素命中区 **≥88rpx（44px）**；并排操作按钮间距 **≥16rpx**。视觉小的元素用透明 `::after { inset: -Xrpx }` 或加 padding 撑命中区。

### 2.4 卡片/圆角阶梯
卡片 32–34rpx ｜ 内元素 18–24rpx ｜ 胶囊 999rpx。背景统一 `--grad-card`，阴影 `--shadow-1 (+ --hi-inset)`，浮层 `--shadow-2`。

### 2.5 按压反馈
可点元素统一：
```css
:active { transform: scale(0.97); transition: transform 0.08s ease; }
```
不可点元素（如拍扁后的统计行）**不得**有卡片阴影/圆角底，避免"假可点"。

### 2.6 状态色对照（全局复用）
| 状态 | bucket | 文字色 | 底色 |
|---|---|---|---|
| 正常 | `normal` | `--brand-mint-deep` | `--brand-mint-soft` |
| 临期(≤3天) | `expiring` | `--honey-deep` | `--honey-bg` |
| 已过期 | `overdue` | `--coral-deep` | `--coral-bg` |
> `bucket` 一律由各页 JS 的 `bucketOf()` 计算（`<0`=overdue，`≤3`=expiring，否则 normal），WXSS 仅按 class 上色。

---

## 3. 首页 index

### 3.1 结构草图
```
.index-page (padding 28rpx, 底部留 tab 安全区)
 ├─ .hero            吉祥物气泡（标题/心情）
 ├─ .search-bar      🔍 内置进输入框
 ├─ .zone-list       5 张 .zone-card（各带身份色）
 │    ├ .zone-head   [icon] 名 温度 ····· [＋ 加食材]
 │    ├ .zone-summary  内联：8 库存·2 临期·1 过期（itemCount>0 才显示）
 │    └ .food-scroll / .zone-empty
 ├─ .danger-zone     🟡 新增：底部"清空全部食品数据"（降权 + 二次确认）
 └─ .notice          toast（z-index 110，在 tab 栏之上）
```

### 3.2 已实现项（✅，详见代码）
| 项 | 区域 | 结论 |
|---|---|---|
| 搜索 🔍 内置、保留可点 | `.search-bar`/`.search-ic` | ✅ |
| ＋ 升级「加食材」胶囊 + 扩命中区 | `.zone-add`/`::after` | ✅ |
| 统计拍扁为内联行、空区隐藏 | `.zone-summary` + `wx:if="{{zone.itemCount>0}}"` | ✅ |
| 温度去药丸、门架暖棕 | `.zone-temp` | ✅ |
| 食材标签 20rpx、名称两行 | `.food-tag`/`.food-name` | ✅ |
| toast 抬到 tab 之上 | `.notice` | ✅ |
| 编辑按钮中性、间距加大 | `.row-btn`/`.detail-btn`/`.row-actions` | ✅ |
| 气泡尾巴居中、按压反馈 | `.hero-copy::after`/`:active` | ✅ |

### 3.3 🟡 新增：底部"清空全部食品数据"危险区
**设计意图**：从菜谱页迁来。它是**不可逆**操作，必须**降权 + 远离主流程 + 二次确认**——放在首页**最底部**、描边而非实心、配警示小字 + 分隔线。

**WXML**（置于 `.zone-list` 之后、`.notice` 之前）
```xml
<view class="danger-zone">
  <text class="danger-tip">清空后所有食品记录将无法恢复</text>
  <view class="danger-clear" bindtap="handleClearAll">清空全部食品数据</view>
</view>
```

**WXSS**（`index.wxss`）
```css
.danger-zone {
  margin-top: 48rpx;
  padding-top: 28rpx;
  border-top: 2rpx solid var(--cream-line);
  display: flex; flex-direction: column; align-items: center; gap: 12rpx;
}
.danger-tip { font-size: 22rpx; color: var(--text-light); }
.danger-clear {
  padding: 14rpx 36rpx; border-radius: 999rpx;
  font-size: 26rpx; font-weight: 700;
  color: var(--coral-deep); background: transparent;
  border: 2rpx solid var(--coral-bg);
}
.danger-clear:active { transform: scale(0.97); transition: transform 0.08s ease; }
```
> 与原菜谱页的"珊瑚实心大按钮"相比：改**描边、缩小、灰字提示、分隔线、置底**，显著降权。

**JS**（`index.js` 新增；`itemService.clearItems()` 已存在）
```js
handleClearAll() {
  wx.showModal({
    title: '清空全部数据',
    content: '将删除所有食品记录，且无法恢复。确定继续？',
    confirmText: '清空', confirmColor: '#c94238',
    success: (res) => {
      if (!res.confirm) return
      wx.showLoading({ title: '清空中' })
      itemService.clearItems()
        .then(() => { wx.hideLoading(); this.showNotice('已清空全部数据'); this.loadItems() })
        .catch(() => { wx.hideLoading(); wx.showToast({ title: '清空失败', icon: 'none' }) })
    },
  })
}
```

### 3.4 交互状态
- **空冰箱**：每区仅头部 + `.zone-empty`「这一格还空着，点右上角「＋ 加食材」」；不显示统计行；底部危险区仍在（清空空库存即无操作，可保留）。
- **正常/临期/过期**：见 §2.6。

---

## 4. 日历 calendar 🟡

> 目标：**对齐首页新规范** + 清理死代码 + 雷达微调。月历玻璃雷达屏是亮点，保留。

### P0
1. **列表操作按钮触控放大**（`.row-btn` / `.row-actions`，选中日列表 + 统计弹层）
```css
.row-actions { gap: 16rpx; }            /* 10 → 16 */
.row-btn { padding: 14rpx 20rpx; }      /* 8rpx 纵向 → 14rpx */
```

### P1
2. **编辑按钮冰蓝 → 中性**（`.row-btn`，对齐首页）
```css
.row-btn { color: var(--neutral-ink); background: var(--neutral-soft); }
.row-btn.danger { color: var(--coral-deep); background: var(--coral-bg); }
```
3. **弹层关闭按钮命中区放大**（`.sheet-close`，日历 + 首页同改）
```css
.sheet-close { padding: 14rpx 26rpx; }
```
4. **删除死 CSS**：`.meal-radar-explain-main`（calendar.wxss，已无 WXML 引用）。

### P2
5. **雷达"教学说明"弱化非当前档**（`.meal-radar-ranges`）：只高亮命中档（high/medium/low），另两档降透明度/字重，给核心分数让位。
6. **"回到今天"增强可点态**（`.today-btn`）：加描边或胶囊底、放大命中区。
7. **雷达扫描针动画**（`.radar-sweep`）：保留观感；可选加 `@media (prefers-reduced-motion)` 暂停或降速，纯优化。

---

## 5. 菜谱 recipes 🟡

> 目标：移除高危按钮（迁首页）、消除文案重复。占位 + 隐私卡保留。

### P0
1. **移除 `.clear-btn`**（清空数据按钮迁至首页 §3.3）
   - `recipes.wxml`：删除 `<view class="clear-btn" ...>` 整行。
   - `recipes.wxss`：删除 `.clear-btn` 样式。
   - `recipes.js`：移除 `handleClearAll`（逻辑迁至 `index.js`）。

### P1
2. **信息架构债（记录，暂不动）**：当前"菜谱"tab 实为「占位 + 隐私 + （原）清数据」。清空按钮迁出后割裂减轻；后续 AI 菜谱上线时，把"隐私与数据"迁到独立"我的/设置"。

### P2
3. **精简重复文案**（`.coming-desc` + `.coming-list`）：desc 与 list 前两条语义重述，二选一。
4. **`.settings-link`** 纳入冰蓝收敛（保留链接蓝或改薄荷，全局统一）。

---

## 6. 添加/编辑表单 item-form 🟡

### P1
1. **"采纳推荐"条归位**（`.recommend`，item-form.wxml:27–30）
   现状：顺序为 `品类 →（条件出现的推荐条）→ 存放分区`，推荐出现在分区选择器**之前**，且 `showLocationRecommend` 切换时整页跳动。
   → 将 `.recommend` 移到「存放分区」字段**内部/正下方**，紧贴其影响的控件；切换时只在该字段区域内增减。
2. **核对 TDesign 协调**（`styles/tdesign-theme.wxss`）：确认 `t-input`/`t-textarea`/`t-cell` 的圆角、边框、字号与自定义 `.chip`/`.seg`/卡片一致（主色应已映射为薄荷）。

### P2
3. **chip 触控增高**（`.chip`，现 `padding:12rpx 28rpx` ≈25px）：纵向 padding 增至 ~16rpx，命中更友好。

---

## 7. 自定义 tab 栏 custom-tab-bar 🟡

### P2
1. 确认**选中态有图标切换**（不只是 `.tab-item.on .tab-txt` 文字变色）；若仅文字变色，补选中态图标，增强反馈。
   （图标 54rpx / 文字 24rpx / 选中色 `#087a49` 维持，已为可读性放大。）

---

## 8. 红线：不能动

**数据 / 逻辑层**
- `index.js`/`calendar.js` 的算法与字段：`decorateItem`/`buildHomeZones`/`buildMood`/`filterByContext`/`buildRadar`/`bucketOf` 等签名与行为不变（本规格仅**新增** `index.js` 的 `handleClearAll`、从 `recipes.js` **移除**同名方法）。
- 字段契约：`zone.{key,theme,location,name,temperature,icon,itemCount,expiring,overdue,items}`、`food.{_id,name,bucket,statusLabel,statusHint,expireDateText,thumbImage,note}` 不增删改名。
- `services/`（含 `itemService.clearItems`）/ `utils/` / `cloudfunctions/` / CloudBase schema 不碰。

**结构 / 集成层**
- 5 分区固定全展示，不恢复"分区管理"。
- `custom-tab-bar` + `setTabBar({hidden})` 弹层隐藏底栏机制不动。
- 分包 + 分包独立 npm 架构、`app.json`、主包 2MB 预算不动。
- 弹层 `.mask/.sheet/.detail` 开合逻辑与 `catchtap="noop"` 不动。

**产品范围**
- 不接真实 AI、不加会员/支付/分级权限。
- 不恢复"数量(amountText)"。
- 不在首页恢复全局库存统计（保留在日历页）。
- 不新增除「按压态/搜索图标/危险区描边按钮」以外的动画或第三方依赖。

---

## 9. 验收清单（全页面）

**首页**（✅ 已上线项 + 🟡 新增）
| # | 状态 | 看什么 |
|---|---|---|
| 1 | 空冰箱 | 5 区无「0/0/0」，只剩「＋ 加食材」 |
| 2 | 统计行 | 一行内联文字、无阴影、点了无反应 |
| 3 | 临期/过期/门架 | 标签可读；门架暖棕不撞橙 |
| 4 | 搜索/toast/详情 | 🔍 内置可点；删除提示在 tab 之上；详情仅到期+状态(+备注) |
| 5 | 🟡 清空按钮 | 在**首页最底部**、描边小按钮、点击有**二次确认**弹窗 |

**日历**
| # | 看什么 |
|---|---|
| 6 | 编辑/删除按钮=中性灰、间距够、不易误触（与首页一致） |
| 7 | 弹层关闭按钮好按 |
| 8 | 雷达屏正常、无多余空白行（死 CSS 已清） |

**菜谱**
| # | 看什么 |
|---|---|
| 9 | 已**无**清空按钮；占位 + 隐私卡正常；文案不重复 |

**表单**
| # | 看什么 |
|---|---|
| 10 | "采纳推荐"紧贴分区字段、切换不跳动 |
| 11 | TDesign 输入控件与 chip/seg 视觉协调 |

> 改完用 `cli preview` 确认主包仍 <2MB（当前 1.8MB，裕量 ~219KB），再真机走查 #1/#3/#5/#6。

---

## 10. 实施顺序与状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| 一 | 全局 token + 首页重构 | ✅ 已实现（未提交） |
| 二 | 首页底部清空危险区 + 迁移 `handleClearAll` | 🟡 待实现 |
| 三 | 菜谱移除清空按钮 + 文案精简 | 🟡 待实现 |
| 四 | 日历触控/配色对齐 + 删死 CSS | 🟡 待实现 |
| 五 | 表单推荐条归位 + TDesign 核对 | 🟡 待实现 |
| 六 | tab 选中态 / 雷达微调 / 冰蓝收敛 / fallback 清理（P2 收尾） | 🟡 待实现 |

> 二、三两阶段相关联（清空按钮整体迁移），建议同批实现。
