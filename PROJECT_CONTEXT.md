# PROJECT_CONTEXT.md

最后更新：2026-07-13

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

## v1.2 升级主线

2026-06-14 已将原有高 / 中优先级待办并入 `TODO.md` 的「v1.2 版本升级清单」。

v1.2 的定位不是 AI 商业化版本，而是个人主体阶段的迁移留存版和合规加固版本：

- 收拢 v1.0 上线后稳定性问题
- 发布页面转发能力修复
- 补齐微信小程序官方文档审计和提审前检查清单
- 小步灰度接入到期订阅提醒
- 用本地词库降低手动录入成本
- 将「开饭雷达」前移到首页，直接告诉用户先处理什么
- 给空冰箱用户提供样板食材批量建库入口
- 检查 CloudBase 集合权限、云函数边界和主包体积
- 预研 AI 商业化、深度合成类目和虚拟支付，但不把这些能力做进 v1.2 前台功能

v1.2 仍保持：

- 不开放 AI 菜谱
- 不开放拍照识别
- 不开放条形码 / 小票识别
- 不做会员 / 支付
- 不做登录页
- 不引入独立后端、Docker、Vercel、Supabase、Next.js

### 2026-06-15 v1.2 本地完成项

本轮按「冰箱小雷达-迁移与商业化规划」的 V1 / v1.2 总纲，完成了以下本地改造：

- 新增本地食材词库 `utils/foodLexicon.js`，支持常见食材名称联想、品类、保质期、过期日和推荐分区自动补齐。
- 添加 / 编辑页接入词库提示，用户输入常见食材名后可自动填好关键字段，保存前仍可手动修改。
- 首页接入共享雷达工具 `utils/mealRadar.js`，把「今天先用掉什么」前移到首页。
- 日历页复用同一套本地雷达算法，避免首页和日历各算一套。
- 空冰箱状态新增「30 秒装满样板冰箱」，支持多选常见食材后批量创建。
- `services/reminderService.js` 从占位改为订阅消息灰度逻辑，未配置模板 ID 时不弹授权、不阻断保存。
- `cloudfunctions/sendExpiryReminders` 改为真实提醒骨架：每天 09:00 扫描临期食品、发送订阅消息、写入 `reminders` 防重复。
- 新增 `docs/WECHAT_MINIPROGRAM_AUDIT.md`，覆盖转发、隐私、类目、包体、CloudBase、订阅消息、AI / 支付红线和真机回归。
- `project.config.json` 已将 `docs` 和 `.claude` 加入上传忽略，避免文档截图和本地 worktree 挤占小程序包体。
- 已执行 `npm ci` 安装 `pkg-add` 分包依赖，并通过微信开发者工具 `build-npm` 生成本地 TDesign 构建产物。
- 微信开发者工具模拟器已确认首页、添加页、日历页、菜谱页可加载。
- 已生成微信开发者工具预览二维码。预览包体结果：总包 664.1KB，主包 386.7KB，`pkg-add` 分包 277.4KB。
- 用户已扫码完成真机预览重点项：右上角转发、添加页词库补齐、首页雷达、日历页、菜谱占位页，未反馈阻塞问题。
- 已部署安全版 `sendExpiryReminders` 到 CloudBase，函数状态 `Active`，运行时 `Nodejs16.13`。
- 已创建定时触发器 `dailyExpiryReminder`，cron 为 `0 0 9 * * * *`。
- 已调用云端 `sendExpiryReminders` 验证：当前环境变量为空，返回 `TEMPLATE_NOT_CONFIGURED`，发送数 0，不会误发订阅消息。
- 已检查核心集合权限：`items`、`reminders`、`parseLogs`、`fridgeZoneConfigs` 均为 `PRIVATE`。

注意：

- 这些改动仍是本地待发布状态，尚未上传体验版 / 提审 / 发布。
- 隐私保护指引、服务类目仍需在微信后台人工确认。

### 2026-06-16 v1.2 订阅提醒闭环实测

本轮完成了到期订阅提醒从「安全骨架」到「小程序端真实发送成功」的打通：

- 微信公众平台已添加订阅消息模板「保质期到期提醒」。
- 前端 `services/reminderService.js` 已配置模板 ID，用于 `wx.requestSubscribeMessage` 拉起订阅授权。
- 添加 / 编辑页保存时先请求订阅授权，再保存食材，避免异步保存后不再被微信识别为用户点击触发。
- `cloudfunctions/sendExpiryReminders/config.json` 已声明开放接口权限：
  - `subscribeMessage.send`
- CloudBase 函数环境变量已配置：
  - `EXPIRY_REMINDER_TEMPLATE_ID`
  - `EXPIRY_REMIND_DAYS=3`
- 订阅模板最终字段映射已按真实模板修正为：
  - `thing6`：食物名称
  - `time16`：过期日期
  - `thing3`：备注
- 云函数已用微信开发者工具 CLI 重新上传，定时触发器仍为每天 09:00。
- 真机预览中，用户保存测试食材并授权订阅后，已收到微信「服务通知」：
  - 测试结果：`sent: 1`、`failed: 0`、`skipped: 0`
  - 服务通知字段显示正常：食物名称、过期日期、备注。
- 临时诊断弹窗和保存后立即测试发送逻辑已从前端清理，当前干净预览包体为：
  - 总包 663.9KB
  - 主包 386.6KB
  - `pkg-add` 分包 277.4KB

注意：

- 命令行直接调用 `sendExpiryReminders` 不能作为订阅消息发送验证依据，曾返回 `invalid wx openapi access_token`。
- 该问题已在 2026-06-17 通过服务端 access_token 方案处理，09:00 定时器已自动发送成功。

### 2026-06-17 v1.2 订阅提醒定时器验证完成

本轮完成了到期订阅提醒的非小程序端定时触发验证，临期提醒闭环可视为已打通：

- 2026-06-17 09:00 北京时间，`dailyExpiryReminder` 定时触发器已自动执行。
- 用户真机已收到微信「服务通知」，测试食材「虾」「鱿鱼」等按到期日期推送成功。
- `sendExpiryReminders` 已从单纯 `cloud.openapi.subscribeMessage.send` 改为优先使用微信官方服务端接口发送订阅消息。
- 云函数环境变量已新增：
  - `WX_APPID`
  - `WX_APPSECRET`
- `WX_APPSECRET` 只配置在 CloudBase 云函数环境变量中，没有写入仓库文件。
- 云函数保留回退逻辑：未配置 `WX_APPSECRET` 时仍回退到 `cloud.openapi.subscribeMessage.send`。
- 已修正云函数运行时日期按 UTC 计算的问题，现在 `today/endDate` 按北京时间生成。
- 已重新部署 `sendExpiryReminders`，并用不存在的 `itemId` 验证日期范围，返回：
  - `today: 2026-06-17`
  - `endDate: 2026-06-20`
- 已用单条 `itemId` 验证服务端接口路径，结果 `sent: 1`、`failed: 0`。
- 已清空本地临时配置文件内容，避免 AppSecret 残留在 `/private/tmp`。

注意：

- 当前提醒已在 2026-06-17 后续收口改为「每日早晨临期汇总一条」，避免临期食材较多时形成刷屏感。
- 如后续轮换 AppSecret，需要只在 CloudBase 环境变量中更新，不要写入 `cloudbaserc.json` 或任何前端文件。

### 2026-06-17 v1.2 P0 收口

本轮完成 P0 收口文档同步：

- 用户已确认 v1.2 真机完整验证完成。
- 真机已覆盖首页 5 分区、添加、编辑、删除、搜索、清空流程。
- 真机已确认常见食材缩略图归桶正确。
- 真机已验证订阅提醒同意、拒绝、关闭主开关等结果分支均不阻断保存。
- `docs/WECHAT_MINIPROGRAM_AUDIT.md` 已同步真实订阅模板字段 `thing6/time16/thing3`，并更新真机回归状态。

P0 收口后仍未完成：

- 微信公众平台隐私保护指引、服务内容和服务类目仍需后台人工确认。
- README 已在 2026-07-13 替换为当前 v2.0 开发版本截图，覆盖首页、添加页、日历页和家庭共享页。
- 当前改动仍未上传体验版 / 提审 / 发布。
- 本轮改动已随当前功能分支推送；正式发布前需确认合并到目标发布分支。

### 2026-06-17 v1.2 P0 体验增强收口

本轮按用户补充要求完成本地体验增强：

- `sendExpiryReminders` 从「逐条提醒」改为「每日汇总一条」：
  - 同一用户同一天只发送一条服务通知。
  - `reminders` 按 `expirySummary` 记录汇总发送结果。
  - 汇总记录保留 `itemIds`、`itemNames`、`itemCount`，便于后续排查。
- 本地食材词库扩展到 484 条，覆盖更多蔬菜、水果、肉类、水产、主食、速冻、饮料和调料。
- 食材词库补充拼音首字母匹配，添加页输入 `nn`、`jd`、`bc` 等缩写也能自动命中常见食材。
- 添加页新增「最近常加 / 再加一次」：
  - 使用小程序本地缓存，不改 CloudBase 数据结构。
  - 点击最近项会按今天重新计算生产日和过期日。
- 首页 / 日历「开饭雷达」文案按时段和库存状态变化：
  - 按早上、午饭前、傍晚前、晚饭前、夜间生成不同提示。
  - 按库存稳定、临期、过期状态生成中性提示。
- 后续提交已撤回雷达「已处理」批量删除入口：
  - 首页雷达继续作为查看 / 跳转入口，不直接删除库存。
  - 日历报告继续展示优先项，不直接提供移除按钮。

注意：

- 本轮新增体验增强尚未重新上传体验版，需随下一次上传后做真机回归。
- 当前仍不恢复 AI、拍照识别、扫码、小票识别、登录、支付、会员或 UGC。

### 2026-06-30 GEO 自证案例基建与上线收口

本轮按「冰箱小雷达 GEO 自证案例改造计划」完成第一版基建和线上首发：

- 新增 `site/` 静态品牌站产物，用于后续部署为公开可索引页面：
  - `/`：品牌首页
  - `/privacy/`：公开隐私政策
  - `/features/`：功能说明
  - `/faq/`：常见问题
  - `/geo-case/`：GEO 自证案例页
  - `robots.txt`、`sitemap.xml`、`llms.txt`
- 新增 `site/server-deploy-plan.md`，部署方案从原先 COS 优先调整为：
  - 优先使用 `fridge.playgamelab.cn` + 轻量应用服务器 + Caddy 静态站。
  - COS 仅保留为后续镜像/CDN/备选静态托管方案。
- 新增 `geo/` 复测与证据目录：
  - `brand-brief.yaml`
  - `prompt-universe.csv`
  - `evidence/`
  - `reports/`
- 新增 3 篇内容池草稿到 `docs/content-drafts/`：
  - 5 分区设计
  - 开饭雷达本地算法
  - 个人主体小程序隐私说明
- 小程序新增非 Tab 页面：
  - `pages/about/`
  - `pages/privacy/`
  - `pages/features/`
- 首页不再放 GEO / AI 说明卡，保持原有库存主流程；AI 可理解事实主要放在品牌站、非 Tab 页面和菜谱页说明入口。
- 菜谱页「隐私与数据」卡片升级为明确入口：
  - 小程序内隐私说明
  - 微信隐私保护指引
  - 功能说明
  - 关于冰箱小雷达
- 首页、日历、菜谱分享标题统一为：
  - `冰箱小雷达｜微信里的冰箱食材库存管理小程序`
- `project.config.json` 已将 `site`、`geo`、`diag-output`、`.workbuddy` 加入上传忽略，避免进入小程序上传包。

验证结果：

- 已通过 `node --check`：
  - `app.js`
  - `pages/index/index.js`
  - `pages/calendar/calendar.js`
  - `pages/recipes/recipes.js`
  - `pages/about/about.js`
  - `pages/privacy/privacy.js`
  - `pages/features/features.js`
  - `pkg-add/item-form/item-form.js`
- 已通过 `jq empty`：
  - `app.json`
  - `project.config.json`
  - 新增页面 JSON
- 已用本地静态服务器检查：
  - `/`
  - `/privacy/`
  - `/features/`
  - `/faq/`
  - `/geo-case/`
  - 均返回 HTTP 200。
- 已通过 `xmllint --noout site/sitemap.xml`。

未完成 / 注意事项：

- 微信开发者工具 CLI 已登录并打开项目；撤回首页 GEO / AI 说明区后已重新生成真机预览二维码：
  - 二维码：`/private/tmp/fridge-preview-no-home-geo.png`
  - TOTAL：693.6 KB / 710262 bytes
  - main：412.8 KB / 422693 bytes
  - `/pkg-add/`：280.8 KB / 287569 bytes
- 用户已完成真机扫码回归，确认本轮首页主流程和新增说明入口可用。
- 本轮小程序侧改动暂不单独上传 / 提审；后续随下一阶段新增功能版本一起发布。
- 微信公众平台后台已打开，公开隐私页 URL 已复制到剪贴板；后台保存结果仍待人工确认。
- `site/` 已同步到轻量服务器 `/var/www/fridge-radar-site`。
- 服务器 Caddy 已加入 `fridge.playgamelab.cn` 静态站点块，`caddy validate` 通过，`systemctl reload caddy` 后服务仍为 `active`。
- 已通过腾讯云 DNSPod API 创建 `fridge.playgamelab.cn` A 记录，指向轻量服务器公网 IP。
- Caddy 已完成 Let’s Encrypt 正式证书签发。
- 线上已验证 HTTPS 200：
  - `/`
  - `/privacy/`
  - `/features/`
  - `/faq/`
  - `/geo-case/`
  - `/llms.txt`
  - `/sitemap.xml`
- 旧 GEO 报告仍只能作为方向参考；对外公开优化结果前必须重新采样并保存 `geo/evidence/` 证据。
- `Downloads` 里的 `SecretKey*.csv` 是敏感文件，后续需要用户手动转移到安全位置或删除；本轮未做删除操作。

### 2026-06-30 GEO 复测 01

已启动第一轮复测基线，Run ID：`2026-06-30-geo-retest-01`。

- 已保存线上页面 HTML、HTTP headers 和 SHA256 manifest：
  - `geo/evidence/pages/2026-06-30-geo-retest-01/`
- 已生成页面事实覆盖文件：
  - `geo/evidence/pages/2026-06-30-geo-retest-01/fact-coverage.json`
- 已保存搜索查询基线：
  - `geo/evidence/queries/2026-06-30-geo-retest-01/search-baseline.json`
- 已生成复测报告：
  - `geo/reports/2026-06-30-geo-retest-01.md`

当前结论：

- 源站可抓取，公开页面和 `llms.txt` 能直接读到产品定义、5 分区、临期提醒、开饭雷达和隐私优先 5 个目标事实。
- 搜索工具暂未返回 `fridge.playgamelab.cn` 官方页面，说明刚上线后尚未观察到搜索索引吸收。
- 本轮尚未采集真实 AI 平台原始回答，因此不生成新的 AIVO 分数，也不对外宣称优化成效。

### 2026-06-30 静态品牌站 UI 轻量可信化

本轮按用户要求调用 Claude Code 优化 `site/` 静态站 UI，并由 Codex 复核收尾：

- Claude Code 认证过期后已重新登录。
- 用户指定的 `opus4.8` 模型名在 Claude Code 中不可用，最终使用 `--model opus --effort max` 完成。
- 修改范围限定在：
  - `site/index.html`
  - `site/privacy/index.html`
  - `site/features/index.html`
  - `site/faq/index.html`
  - `site/geo-case/index.html`
  - `site/styles.css`
- UI 方向是“可信官方说明站”，不是营销官网：
  - 保留 URL、title、meta description、H1 和核心正文事实。
  - 不引入 JS、框架、外部字体或外部资源。
  - 首页二维码入口更清楚，隐私页改为正式政策文档形态，FAQ 改为可引用问答库。
- Codex 复核时修正了两个问题：
  - 隐私页状态从“上线前公开说明”改为“公开说明页已上线”。
  - 5 个 HTML 页面补充 favicon 链接，避免浏览器请求 `/favicon.ico` 返回 404。

复核结果：

- 本地静态站 5 个页面均返回 HTTP 200。
- 桌面 1280px 和移动 390px 均无横向溢出。
- Playwright console 为 0 error / 0 warning。
- 页面仍能直接读到产品定义、5 分区、临期提醒、开饭雷达和隐私优先 5 个目标事实。
- `git diff --check` 通过，敏感密钥形态扫描无命中。

注意：

- 本轮只更新本地 `site/` 文件，尚未重新同步到轻量服务器线上目录。
- Playwright 生成的 `.playwright-cli/` 已加入 `.gitignore`，作为本地复核缓存不提交。

### 2026-07-04 微信 AI 知识库 v1.2 口径发布

本轮完成微信公众平台「AI 能力」后台与本地知识库口径收口：

- 确认微信公众平台后台已开启「微信 AI」「自动模式」「开发模式」。
- 本地仓库未接入自定义 AI 原子接口、原子组件或接力页，当前仍是后台知识库问答 / 辅助说明路径。
- `docs/wechat-ai-knowledge-base-v1.md` 已从 v1.0 口径更新为 v1.2 口径：
  - 补充本地食材词库、最近常加 / 再加一次、样板冰箱、每日临期汇总提醒。
  - 继续明确当前不支持 AI 菜谱、拍照识别、包装 OCR、条形码扫描、小票识别、支付、会员、登录和 UGC。
- `docs/WECHAT_MINIPROGRAM_AUDIT.md` 已补充「微信 AI 后台与知识库一致性」检查项。
- 已在微信公众平台后台重新上传并发布新版知识库：
  - 文件名：`冰箱小雷达-v1-微信 AI 知识库.md`
  - 上传时间：2026-07-04 23:10
  - 状态：已发布
- 已删除后台旧版知识库：
  - 文件名：`冰箱小雷达-v1-微信AI知识库.md`
  - 上传时间：2026-06-12 22:31
- 删除完成后，后台知识库列表只剩 2026-07-04 23:10 的新版已发布文档。

注意：

- 本轮没有修改小程序功能代码，没有上传体验版 / 提审。
- 微信 AI 调试入口抽查尚未执行，仍需用常见问题测试回答是否遵守 v1.2 边界。
- 如果后续接入开发模式自定义能力，必须重新做主体、类目、AI 生成内容标识和敏感 API 接力页审查。

## 当前 Git 状态说明

2026-06-12 已将 Claude Code 产出的上线分支 `worktree-prelaunch-fixes` 快进合并到根目录 `main`。

- 合并前备份分支：`backup/main-before-v1-sync-20260612`
- 合并后 `main` 当前包含 v1.0 上线版代码
- 2026-06-17 v1.2 收口改动已推送到 `origin/feat/home-radar-merge`
- 2026-06-30 已提交 `e408fc1`：`feat: add fridge GEO self-evidence site`
- 2026-06-30 本轮继续新增 GEO 复测 01 证据和静态品牌站 UI 轻量可信化改动，纳入本次收尾提交。
  - `069c8d2`：移除「已处理」批量删除功能，首页 kicker 还原中性
  - `2a142aa`：Polish v1.2 retention experience
- 正式发布前需要确认功能分支已合并到目标发布分支，再上传体验版 / 提审
- `.claude/` 是本地 Claude Code worktree 目录，不应提交

## 项目监控自动化

2026-06-12 已在 Codex 中创建每日项目监控自动化：

- 自动化名称：`冰箱项目每日进度监控`
- 检查时间：每天早上 9:00
- 监控项目：
  - `/Users/qzt/Developer/projects/fridge-app`
  - `/Users/qzt/Developer/projects/fridge-radar-promo`
- 检查重点：
  - 项目进度文档
  - TODO 待办
  - 当前 Git 分支
  - 未提交改动
  - 未推送或落后远端的提交
  - 是否出现 AI、支付、登录、Docker、独立后端等高风险方向迹象

该自动化只做只读检查和中文日报输出，不自动修改文件、不提交代码、不删除文件。

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
- 首页「开饭雷达」按时段和状态变化提示优先处理项
- 首页「开饭雷达」点击后跳转日历报告，不直接删除库存
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
- 本地食材词库已扩展到 484 条
- 支持拼音首字母缩写命中常见食材
- 新增「最近常加 / 再加一次」，使用本地缓存快速复用近期添加的食材

### 日历

- 展示月历
- 有食品到期的日期显示标记
- 点击日期展示当天到期食品
- 顶部显示总库存、临期、过期统计
- 统计卡可展开清单
- 到期清单支持编辑 / 删除
- 「开饭雷达」使用纯本地算法评分
- 「开饭雷达」文案按时段和库存状态变化
- 「开饭雷达」展示优先项，不直接提供批量删除入口
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
- `services/reminderService.js`：日历事件和订阅消息灰度授权
- `services/parseService.js`：识别能力历史 / 后续预留，当前不开放拍照入口
- `utils/constants.js`：品类、分区、来源标签
- `utils/foodLexicon.js`：本地食材词库、自动补齐、拼音首字母匹配和样板食材
- `utils/mealRadar.js`：首页 / 日历共用的本地开饭雷达算法和时段 / 状态文案
- `utils/visualAssets.js`：食材图片归桶
- `styles/tokens.wxss`：视觉 token
- `styles/tdesign-theme.wxss`：TDesign 主题
- `docs/WECHAT_MINIPROGRAM_AUDIT.md`：v1.2 提审前检查清单

## 当前验证状态

2026-06-17 本轮本地检查：

- `node --check` 已覆盖核心 JS、页面 JS、表单 JS、词库、雷达和 `sendExpiryReminders`，均通过。
- 词库运行快检确认当前 `FOOD_LEXICON.length` 为 484。
- 拼音首字母运行快检确认 `nn`、`jd`、`bc` 可分别命中常见食材。
- 雷达运行快检确认按时段和临期状态输出 `statusText`、`timeText` 和优先项。
- `git diff --check` 通过。
- 对本轮变更文件做敏感形态扫描，未发现 `sk-`、`mkt_` 或 AppSecret 赋值形态。

Claude Code 上线分支记录过以下验证：

- `node --check` 关键 JS 通过
- 微信开发者工具 `preview` 通过
- 主包约 1.70MB
- TDesign 分包约 276KB
- 前端无 AI / 拍照识别用户入口
- `services/parseService.js` 中相机 / 相册入口当前直接拒绝，避免隐私声明不一致

## 待随下一版本发布的本地改动

### 2026-06-12 页面转发能力修复

用户真机反馈右上角菜单中「当前页面不可转发 / 当前页面不可分享」为灰色。

原因：

- 当前页面 JS 没有声明微信小程序分享生命周期函数。
- 微信小程序页面只有实现 `onShareAppMessage` 后，菜单里的转发才会可用。
- 朋友圈分享还需要主包页面实现 `onShareTimeline`。

已在本地修改：

- `pages/index/index.js`：新增转发给朋友和分享到朋友圈
- `pages/calendar/calendar.js`：新增转发给朋友和分享到朋友圈
- `pages/recipes/recipes.js`：新增转发给朋友和分享到朋友圈
- `pkg-add/item-form/item-form.js`：新增转发给朋友

发布策略：

- 不为这个小修单独上传线上版本。
- 作为下一次新版本的一部分，和后续改动一起上传 / 提审 / 发布。
- 分享路径统一回到首页，不携带用户库存数据，避免把个人冰箱信息转发出去。

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

### 2026-06-15 v1.2 迁移留存版本地改动

本地已完成：

- 本地词库联想录入。
- 本地词库已扩展到 484 条，并支持拼音首字母缩写。
- 添加页新增「最近常加 / 再加一次」。
- 首页「开饭雷达」决策提示。
- 首页 / 日历「开饭雷达」新增按时段 / 状态变化的文案。
- 首页 / 日历「已处理」批量删除入口已撤回，避免误删库存。
- 空冰箱样板食材批量建库。
- 订阅消息授权灰度入口。
- `sendExpiryReminders` 定时提醒云函数已改为每日汇总一条。
- 微信小程序提审检查清单。

发布前仍需：

- 微信开发者工具真机完整验证已完成，包括删除、搜索、清空、缩略图归桶、样板冰箱和订阅授权分支。
- 本地若重新拉仓库或清理依赖，需要先在 `pkg-add` 执行 `npm ci`，再用微信开发者工具执行 `build-npm`，否则添加页会找不到 TDesign 组件。
- 微信公众平台订阅消息模板申请和字段确认已完成，当前字段为 `thing6/time16/thing3`。
- CloudBase 环境变量已配置：
  - `EXPIRY_REMINDER_TEMPLATE_ID`
  - `EXPIRY_REMIND_DAYS`
  - `WX_APPID`
  - `WX_APPSECRET`
- `sendExpiryReminders` 云函数和定时触发器已部署；2026-06-17 09:00 已确认自动定时提醒送达。
- CloudBase 数据库核心集合权限已确认均为 `PRIVATE`。
- 检查隐私保护指引和服务类目。
- 确认主包体积仍小于 1.9MB。本轮预览主包为 386.7KB。
- 当前已把 `docs` 和 `.claude` 加入上传忽略，但最终包体仍需用微信开发者工具上传前确认。

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

优先按 v1.2 发布和 GEO 基建两条线小步推进：

- 微信开发者工具 CLI 预览已重新生成，首页 GEO 说明区已撤回；最新预览包 TOTAL 693.6 KB，真机验证已完成，本轮小程序侧改动随下一阶段新增功能版本一起发布。
- 真机完整验证已确认：页面转发、词库补齐、首页雷达、日历页、菜谱页、删除、搜索、清空、缩略图归桶、样板食材批量建库和订阅授权分支。
- 按 `docs/WECHAT_MINIPROGRAM_AUDIT.md` 检查微信后台隐私协议、服务类目、包体和提审材料。
- 微信 AI 知识库已更新并发布为 v1.2 口径，下一步需要用微信 AI 调试入口抽查常见问题回答。
- 订阅提醒已改为每日汇总一条，下一步重点观察汇总文案是否足够清楚。
- README 当前截图已更新为 v2.0 首页、添加页、日历页和家庭共享页；后续仅在正式版 UI 发生明显变化时重新生成。
- 当前功能分支已推送；发布前需要合并到目标发布分支。
- `fridge.playgamelab.cn` 品牌站和公开隐私页已上线；公开隐私页 URL 已复制到剪贴板并打开微信公众平台，后台保存结果待人工确认。
- GEO 复测 01 已完成页面 / 搜索基线；等搜索索引吸收后再复跑搜索基线，并用真实 AI 平台逐条采集 `geo/prompt-universe.csv` 原始回答。
- 静态站 UI 已完成本地可信化复核；如要让线上同步新版 UI，需要再次将 `site/` 同步到轻量服务器 `/var/www/fridge-radar-site`。

## 2026-07-12 v2.0 家庭库存闭环版 M4 发布候选

本轮将原 1.2-1.5 候选能力合并为一个公开版本，内部按 M0-M4 推进。M4 指发布候选，不是健康余额；健康余额继续后置。

本地已完成：

- 新增 `quantityTracked`，用户可选择是否记录数量；只显示 `×N`，不显示单位。
- 历史默认 `quantity: 1 / unit: 份` 按“未记录数量”兼容。
- 新增常温储物分区，首页从 5 分区扩为 6 分区。
- 首页食材支持长按拖到餐盘“用掉”：有数量减 1，无数量或减到 0 时移出，5 秒内可撤销。
- 新增家庭库存页、微信带参邀请、邀请过期/撤回、创建者/可编辑成员、移除/退出/解散边界。
- 新增 `familyInventory` 云函数和 `familyService`；家庭身份、权限、库存操作与撤销均由服务端 OPENID 校验。
- 新增 `families`、`familyMembers`、`familyInvites`、`inventoryEvents` 集合设计及家庭创建者 `_openid` 安全边界。
- 新增数量/消耗与家庭规则领域测试，共 23 项断言通过。
- 微信开发者工具普通编译通过，首页、家庭入口和第六个常温分区已实际渲染，问题面板为 0。

正式发布尚未执行：

- 已创建无前缀正式家庭集合并设为 `ADMINONLY`，`familyInventory` 已移除测试前缀并部署安全修正版；正式 `items` 继续保持 `PRIVATE`。
- 未操作生产数据迁移；双微信账号邀请、加入、共享写入和成员消耗已通过，移除成员后的越权失败仍待验证。
- v2.0 代码包已上传为 `2.0.0`；提交审核和审核通过后的正式发布尚未执行。

上线必须严格按 `docs/CLOUDBASE_V2_SECURITY.md` 的顺序执行：先测试环境集合与云函数，再安全规则，再双账号验收，最后才允许上传包含家庭入口的体验版。

### 2026-07-13 v2.0 C3 隔离测试进度

账号只有一个承载 v1.x 的个人版 CloudBase 环境。官方创建环境接口会自动下单，未确认价格前没有创建第二个环境，改用同环境隔离测试：

- `familyInventory` 支持 `FAMILY_COLLECTION_PREFIX`；默认无前缀行为不变，测试部署配置为 `v2test_`。
- 已创建 `v2test_items`、`v2test_families`、`v2test_familyMembers`、`v2test_familyInvites`、`v2test_inventoryEvents`。
- 5 个测试集合权限均为 `ADMINONLY`，小程序端直读实测返回 `DATABASE_PERMISSION_DENIED`。
- `familyInventory` 已部署并处于 Active，运行时 `Nodejs18.15`，仅访问 `v2test_*`。
- 单账号实测通过：创建家庭、创建有数量/无数量食材、数量减 1、撤销、无数量移出、邀请创建和撤回。
- 双账号核心链路实测通过：邀请码被第二账号使用，云端形成 `owner/editor` 两名有效成员；两个账号的数据进入同一家庭库存，第二账号实际产生删除事件。
- 餐盘真机手势通过：长按食材向餐盘拖动时，页面与分区横向列表保持静止；松手后恢复正常滚动，点击详情不受影响。
- 正式 `items` 当前为 215 条，小程序端个人库存读取正常，未修改其权限或数据；215 条历史记录均缺少 `accessMode`。
- 修复 CloudBase `doc.get()` 在文档不存在时抛异常导致错误码退化的问题；现在返回稳定业务错误。

C3 剩余门槛：

- 用户明确决定跳过“创建者移除成员后原成员越权失败”验证；该项不再阻断下一阶段，但仍记录为未验证权限风险，不视为通过。
- 正式家庭集合和无测试前缀云函数部署已完成；体验版上传、提审和发布尚未执行。

## 2026-07-13 上线运行只读审计

本轮以 CloudBase 线上真实状态为准，完成环境、套餐、数据库、云函数、监控指标、提醒记录、AI 调用和 v2 测试资源的只读检查。没有修改云端配置或生产数据。

已确认：

- CloudBase 环境、数据库和存储均正常；峰值 QPS 14 / 500，无函数超时、限流或慢查询，当前资源用量很低，基础设施和套餐不是近期瓶颈。
- 正式 `items` 共 214 条，至少 31 个不同 `_openid` 完成过库存录入；人均 6.9 条，中位数 5 条。
- 当前库存中 33 条已过期、45 条未来 3 天临期，临期管理需求真实存在。
- `reminders` 共 356 条：40 条发送成功、316 条失败，业务送达率约 11.2%。其中 306 条为微信 `43101 user refuse to accept the msg`。
- 2026-07-13 当天提醒 64 次，仅 3 次成功、61 次失败；15 个提醒涉及用户中，8 个从未成功收到提醒。
- 线上 `sendExpiryReminders` 仍是 2026-06-17 的逐食材发送版本；仓库里的每日用户汇总版本尚未部署，线上与本地存在明确代码漂移。
- 前端保存食材时会请求订阅授权，但此前没有记录用户接受、拒绝或请求失败的结果，云函数无法判断是否仍有可用的一次性授权。
- `generateRecipes`、`parseFoodImage`、`parseBarcode` 线上仍为 Active，真实 AI / 识别开关仍开启；当前调用规则允许已认证非匿名用户调用。7 月 4 日后未发现持续 AI 消耗或滥用证据，但后台能力暴露仍是扩量前风险。
- v2 的 `familyInventory` 只访问 `v2test_*`，当天调用属于单账号测试，不代表线上用户使用；v2 前端仍未上传、提审或发布。

当前决策：

- 暂不把 v2 推进到正式发布；保持 C3 隔离测试，先修复提醒授权、业务送达监控和 AI 后台闸门。
- 后续提醒验收以微信实际送达和业务状态为准，不能只看云函数调用成功率。
- 先完成本地最小修复和自动化验证；部署云函数、修改环境变量、上传体验版或发布仍需单独确认 L4 权限。
- 微信公众平台累计访问、官方留存、页面访问和性能质量数据尚未读取，需后续通过后台截图补齐，不能用 CloudBase 写入用户数替代官方留存。

### 2026-07-13 提醒链路本地整改完成

本轮进入 L2，仅修改本地文件，未部署云函数或修改生产配置：

- `services/reminderService.js` 新增订阅授权事件记录，区分接受、拒绝、不支持和请求失败；记录失败不阻断食材保存。
- 添加 / 编辑页改为调用“请求并记录订阅结果”的完整链路，不再直接丢弃授权结果。
- `cloudfunctions/sendExpiryReminders` 新增纯领域模块，按授权次数和成功发送次数计算剩余机会；`43101` 会重置此前推测的授权余额。
- 云函数同一用户同一天已有任何汇总终态时不再重复调用微信接口；无记录授权时安全跳过。
- `43101` 单独记为 `refused / NO_ACTIVE_GRANT / retryable: false`，其他发送错误保留下一天重试能力。
- 云函数输出不含 `_openid`、食材名等个人信息的 `expiry_reminder_summary` 结构化统计。
- `generateRecipes`、`parseFoodImage`、`parseBarcode` 新增默认关闭的服务端功能总闸门；旧的真实模型开关即使仍为 `true`，缺少新总闸门时也不会调用模型、下载图片或写识别日志。
- 新增 `tests/reminder-domain.test.js`，19 项断言通过；库存 8 项和家庭 15 项领域断言继续通过；相关 Node 语法检查和 `git diff --check` 通过。

新增发布边界：

- 当前修复只覆盖 v1 个人库存提醒。v2 家庭食材仍按创建者 `_openid` 分组，不会天然通知所有家庭成员。
- 如果 v2 要提供家庭级提醒，必须让每位成员分别授权，并由服务端按有效成员发送；该能力未实现，不能随家庭共享入口默认承诺。
- 当前工作目录同时含有未提交的 v2 发布候选改动，不能直接作为 v1 提醒热修上传源；部署前必须从线上 v1 基线建立干净热修分支 / worktree，只带本轮提醒与后台闸门改动。

## 2026-07-13 v2.0 正式后端切换与提审授权

用户明确授权全面收尾、提交、推送、同步，并上传 v2.0 提交微信审核。该授权不包含审核通过后的正式发布。

已完成的正式后端配置：

- 创建 `families`、`familyMembers`、`familyInvites`、`inventoryEvents` 四个无前缀正式集合，当前均为空。
- 四个家庭集合权限均为 `ADMINONLY`；正式 `items` 仍为 `PRIVATE`，215 条原有库存未被修改。
- `familyInventory` 已部署本地安全修正版，运行时 `Nodejs18.15`，状态 `Active / Available`。
- `FAMILY_COLLECTION_PREFIX` 已从线上函数环境变量中彻底移除，正式函数改为访问无前缀集合。
- 管理端无微信身份健康调用正常返回 `NOT_AUTHENTICATED`，证明函数可执行且不会信任外部传入身份。

当前发布边界：

- v2.0 前端代码包已上传为 `2.0.0`，尚未在微信公众平台提交审核或发布；正式家庭集合尚无用户数据，也没有触发个人库存迁移。
- “成员被移除后的越权失败”按用户决定跳过，继续作为已接受但未验证风险保留。
- 提审前仍需完成全量语法、领域测试、包体、敏感信息和开发者工具编译检查。
- 本次将此前 v1.2 留存改动、v2.0 家庭库存闭环、提醒安全整改和未开放 AI / 识别总闸门一起收拢为同一个 v2.0 提审提交，不再拆 v1 热修分支。

正式上传前预览证据：

- 微信开发者工具重新执行分包 `build-npm`，耗时 1640ms，warnings 为空。
- v2.0 最终预览编译成功：总包 720.4 KB，主包 437.5 KB，`pkg-add` 分包 282.9 KB。
- 三个包体值均低于微信单包 2 MB 限制；预览二维码和包体 JSON 输出到 `/private/tmp`，未写入 Git。

### 2026-07-13 v2.0 上传与公开资料同步

已完成：

- 提审提交 `2a6f6e4` 已推送到 `origin/main`；本地 `.workbuddy/`、`diag-output/`、`docs/vibecoding-promotion/` 仍为未跟踪内容，未纳入提交。
- `sendExpiryReminders`、`generateRecipes`、`parseFoodImage`、`parseBarcode` 已部署到 CloudBase，状态均为 `Active / Available`。
- `sendExpiryReminders` 保留每天 09:00 的定时触发器；线上包已包含授权余额、每日汇总和结构化业务统计逻辑。
- 三个 AI / 识别云函数的新总闸门均未开启；安全调用分别返回“能力未开放”或 `FEATURE_DISABLED`，未触发模型、图片下载或识别。
- 官网已无删除同步到 `https://fridge.playgamelab.cn/`；首页、隐私页、功能页和 `llms.txt` 均返回 200，并显示 v2.0 的 6 分区、餐盘消耗和家庭共享口径。
- 微信开发者工具已成功上传版本 `2.0.0`：总包 720.4 KB，主包 437.5 KB，`pkg-add` 分包 282.9 KB。

仍需在微信公众平台人工完成：

- 更新隐私保护指引和服务内容，补充“受邀家庭成员共同查看和修改私有库存”。
- 上传并发布 v2.0 微信 AI 知识库；后台当前仍是 v1.2 口径，不删除旧知识库，直到新版发布并单独确认清理风险。
- 在版本管理中对已上传的 `2.0.0` 点击“提交审核”，填写家庭共享非公开 UGC 的审核说明。
- 当前完成等级为 C3：代码包已上传但尚未进入审核，不能称为已发布或用户可用。
