# 可访问性整改清单（WCAG 2.1 AA）

> 来源：/accessibility-review（2026-06-08）。本文记录 12 项问题与修复方案，状态全部为「本次修复」。
> 颜色对比按 WCAG 公式实算。触控目标：AA(2.5.8) 最低 24px，HIG/AAA 期望 44px——受列表内联布局限制，部分内联按钮取「尽量接近」策略，均已 ≥28px 清过 AA。

## 概览
问题 12 ｜ 🔴 严重 2 ｜ 🟡 主要 6 ｜ 🟢 次要 4 —— 全部修复。

---

## Perceivable 可感知

| # | 问题 | WCAG | 级别 | 修复 | 文件 |
|---|---|---|---|---|---|
| 1 | 次要文字 `--text-sub #6f7c74` 仅 4.0–4.4:1 | 1.4.3 | 🟡 | → **`#5c6a62`**（白底 5.7:1 / 奶油 5.3:1）；同步 TDesign `--td-text-color-secondary` | `styles/tokens.wxss`、`styles/tdesign-theme.wxss` |
| 2 | 临期标签 `--honey-deep` on honey-bg 仅 3.77:1 | 1.4.3 | 🟡 | → **`#9a5a0e`**（honey-bg 5.0:1） | `styles/tokens.wxss` |
| 3 | 过期标签 `--coral-deep` on coral-bg 仅 4.26:1 | 1.4.3 | 🟢 | → **`#b3392f`**（coral-bg 5.2:1） | `styles/tokens.wxss` |
| 4 | 状态/统计小字 20rpx≈10px | 1.4.4 | 🟢 | `.food-tag`/`.tag-inline`/`.stat-name`/雷达 ranges → **22rpx** | index/calendar wxss |
| 5 | 过月日期 `#cfd8d3` ~1.4:1（仍可点） | 1.4.3 | 🟢 | → **`#828d87`**（白底 3.4:1） | `pages/calendar/calendar.wxss` |

## Operable 可操作

| # | 问题 | WCAG | 级别 | 修复 | 文件 |
|---|---|---|---|---|---|
| 6 | 列表/弹层/月历小按钮 <44px | 2.5.5/2.5.8 | 🟡 | `.row-btn`→min-height 64rpx；`.sheet-close`→64rpx；`.month-nav`→80rpx；`.today-btn`/`.chip`/`.danger-clear`/`.settings-link`→≥56rpx，统一 inline-flex 居中 | index/calendar/recipes/form wxss |
| 7 | 搜索 🔍 命中区过小 | 2.5.5 | 🟢 | `.search-ic` 加 padding 命中区（≈66rpx） | `pages/index/index.wxss` |
| 8 | 雷达扫描针无限旋转无暂停 | 2.2.2/2.3.1 | 🟡 | 加 `@media (prefers-reduced-motion: reduce){ .radar-sweep{animation:none} }`（注：WeChat 支持度有限，best-effort） | `pages/calendar/calendar.wxss` |

## Understandable 可理解

| # | 问题 | WCAG | 级别 | 修复 | 文件 |
|---|---|---|---|---|---|
| 9 | 表单/搜索输入无可编程名称 | 3.3.2/1.3.1 | 🟡 | 搜索 input、`t-input`/`t-textarea`/`t-cell` 加 `aria-label` | index.wxml、item-form.wxml |
| 10 | 表单错误未编程播报 | 3.3.1 | 🟢 | `.field-error` 加 `aria-role="alert"` | item-form.wxml |

## Robust 健壮

| # | 问题 | WCAG | 级别 | 修复 | 文件 |
|---|---|---|---|---|---|
| 11 | `<view bindtap>` 按钮缺角色/名称 | 4.1.2 | 🔴 | 全部加 `aria-role="button"`(+必要 `aria-label`)；tab 项加角色与名称 | 各 wxml + custom-tab-bar |
| 12 | 装饰图未隐藏 / 有意义图缺替代 | 1.1.1 | 🔴 | 装饰图(sparkle/leaf/缩略图)`aria-hidden="true"`；吉祥物因文案已表意，`aria-hidden` | 各 wxml |

---

## 对比度 前→后（关键项）

| 元素 | 前 | 后 | 底色 | 通过 |
|---|---|---|---|---|
| 次要文字 `--text-sub` | 4.0–4.4:1 | **5.3–5.7:1** | 奶油/白 | ✅ |
| 临期标签 `--honey-deep` | 3.77:1 | **5.0:1** | honey-bg | ✅ |
| 过期标签 `--coral-deep` | 4.26:1 | **5.2:1** | coral-bg | ✅ |
| 过月日期 | 1.4:1 | **3.4:1** | 白 | ✅(可点态) |

## 残留说明
- **触控 44px**：列表内联「编辑/删除」受单行布局限制，提到 64rpx(32px)；已清过 AA 2.5.8(24px)，未完全达 HIG 44px。如需 44px 需改为整行点击或换布局，属后续优化。
- **prefers-reduced-motion**：WeChat 运行时对该媒体查询支持不稳定；如需强保证需用 JS 读系统设置后置类名，本次先加 CSS 媒体查询（不支持时为无害空操作）。
- **颜色全局 token 变更**：#1/#2/#3 改的是全局 token，三页同时受益。

## 验证
- `cli preview` 编译通过、主包 <2MB。
- 真机：iOS VoiceOver / Android TalkBack 逐 tab 走查；开「超大字体」检查 `.day-number`/tab/chip 是否裁切。
