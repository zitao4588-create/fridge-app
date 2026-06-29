# TODO.md

最后更新：2026-06-30

## 当前主线

当前主线是微信小程序「冰箱小雷达」v1.0 个人主体稳定版。

v1.0 目标：

- 手动记录冰箱食材
- 按 5 个分区管理库存
- 跟踪临期 / 过期
- 在日历页查看到期食品
- 用纯本地算法展示「开饭雷达」可开饭指数
- 保持个人主体可上线，不触碰 AI、深度合成、支付和拍照识别入口

2026-06-12 已将 Claude Code 的上线分支 `worktree-prelaunch-fixes` 快进合并到根目录 `main`。当前 `main` 是新的开发主线。

## 已完成

- [x] 品牌名统一为「冰箱小雷达」
- [x] 旧 React / Vite H5 从当前主线移除
- [x] 小程序页面收敛为 3 个主页面：
  - `pages/index`
  - `pages/calendar`
  - `pages/recipes`
- [x] 添加 / 编辑页迁移到分包：
  - `pkg-add/item-form`
- [x] 底部 Tab 收敛为：
  - 冰箱
  - 日历
  - 菜谱
- [x] 首页固定 5 个分区：
  - 冷藏区
  - 冷冻区
  - 门上储物格
  - 果蔬抽屉
  - 变温区
- [x] 首页每个分区显示库存、临期、过期统计
- [x] 首页展示横向食材卡片
- [x] 首页支持搜索食材
- [x] 首页支持食品详情、编辑、删除
- [x] 首页支持清空全部食品数据，带二次确认
- [x] 添加 / 编辑页支持名称、品类、日期、保质期、过期日、分区、备注
- [x] 添加 / 编辑页支持字段级校验
- [x] `items` 数据按 `_openid` 隔离
- [x] 日历页展示到期日和当天到期食品
- [x] 日历页支持库存、临期、过期统计清单
- [x] 日历页开饭雷达改为纯本地算法
- [x] 菜谱页改为「菜谱搭配，敬请期待」占位页
- [x] 菜谱页保留隐私与数据说明入口
- [x] 前端收起 AI 菜谱、拍照识别、条码扫描、小票识别入口
- [x] `parseService` 中相机 / 相册入口当前直接拒绝，避免隐私声明不一致
- [x] TDesign 放入 `pkg-add` 分包独立 npm
- [x] 食材图片改为品类 / 食材族群共用写实图
- [x] 删除旧菜谱图片和自动生成占位图
- [x] 主包约 1.70MB
- [x] 完成基础无障碍整改文档
- [x] 完成全页面交付规格文档
- [x] 创建合并前备份分支：
  - `backup/main-before-v1-sync-20260612`
- [x] 创建 Codex 每日 9 点项目监控自动化：
  - 监控 `fridge-app`
  - 监控 `fridge-radar-promo`
  - 检查项目进度、TODO 和未提交 Git 改动

## v1.2 版本升级清单

v1.2 目标：

- 先收拢 v1.0 上线后稳定性问题
- 补齐官方文档审计和提审前检查清单
- 小步评估并接入到期订阅提醒
- 用本地词库、首页雷达和样板冰箱提高首次迁移体验
- 保持个人主体可上线，不混入 AI、深度合成、支付和拍照识别入口

### 2026-06-15 本地已完成

- [x] 修复分区添加入口携带 `smartRecommend=1`
- [x] 新增本地食材词库，支持名称联想和字段自动补齐
- [x] 添加 / 编辑页接入词库提示，保存前可手动修改
- [x] 首页新增「开饭雷达」，直接提示先处理什么
- [x] 首页空状态新增「30 秒装满样板冰箱」
- [x] 样板食材支持多选后批量写入
- [x] 日历页复用共享本地雷达算法
- [x] 订阅消息授权改为灰度逻辑，未配置模板时不阻断保存
- [x] `sendExpiryReminders` 云函数改为定时提醒骨架
- [x] 新增 `sendExpiryReminders` 定时触发器配置
- [x] 新增 `docs/WECHAT_MINIPROGRAM_AUDIT.md`
- [x] 将 `docs` 和 `.claude` 加入 `project.config.json` 上传忽略，避免文档和本地 worktree 挤占包体
- [x] 执行 `npm ci` 安装 `pkg-add` 分包依赖，并用开发者工具 `build-npm` 生成本地 TDesign 构建产物
- [x] 生成微信开发者工具预览二维码，官方包体结果：总包 664.1KB，主包 386.7KB，`pkg-add` 分包 277.4KB
- [x] 用户已扫码完成真机预览重点项：右上角转发、添加页词库补齐、首页雷达、日历页、菜谱占位页
- [x] 部署安全版 `sendExpiryReminders` 到 CloudBase；未配置模板 ID 时云端调用返回 `TEMPLATE_NOT_CONFIGURED`，发送数 0
- [x] 创建 `sendExpiryReminders` 定时触发器 `dailyExpiryReminder`，每天 09:00 触发
- [x] 检查 `items`、`reminders`、`parseLogs`、`fridgeZoneConfigs` 集合权限，均为 `PRIVATE`

### 2026-06-16 订阅提醒实测完成

- [x] 微信公众平台添加「保质期到期提醒」订阅消息模板
- [x] 前端接入真实模板 ID，保存食材时能拉起订阅授权弹窗
- [x] 云函数配置 `EXPIRY_REMINDER_TEMPLATE_ID` 和 `EXPIRY_REMIND_DAYS=3`
- [x] 云函数 `config.json` 增加 `subscribeMessage.send` 开放接口权限
- [x] 模板字段按真实字段修正为 `thing6/time16/thing3`
- [x] 修复失败提醒记录阻止重试的问题，仅 `status: "sent"` 才视为已提醒
- [x] 真机预览验证小程序端触发发送成功，已收到微信服务通知
- [x] 清理前端临时诊断弹窗和保存后立即测试发送逻辑
- [x] 重新生成干净预览包，包体结果：总包 663.9KB，主包 386.6KB，`pkg-add` 分包 277.4KB

### 2026-06-17 订阅提醒定时器验证完成

- [x] 发现 09:00 定时触发器在非小程序端触发时仍会遇到 `invalid wx openapi access_token`
- [x] 将 `sendExpiryReminders` 调整为优先走微信官方服务端接口发送订阅消息
- [x] 在 CloudBase 云函数环境变量中配置 `WX_APPID` 和 `WX_APPSECRET`
- [x] 确认 `WX_APPSECRET` 未写入仓库文件
- [x] 修正云函数运行时按 UTC 取日期的问题，改为按北京时间计算 `today/endDate`
- [x] 重新部署 `sendExpiryReminders`
- [x] 用单条 `itemId` 验证服务端发送路径，结果 `sent: 1`、`failed: 0`
- [x] 2026-06-17 09:00 真机收到自动定时服务通知
- [x] 清空本地临时配置文件内容，避免 AppSecret 残留

### 2026-06-17 P0 收口完成

- [x] 用户确认 v1.2 真机完整验证完成。
- [x] 真机检查首页 5 分区、添加、编辑、删除、搜索、清空流程。
- [x] 真机确认常见食材缩略图归桶正确。
- [x] 真机验证订阅提醒同意、拒绝、关闭主开关等结果分支均不阻断保存。
- [x] `docs/WECHAT_MINIPROGRAM_AUDIT.md` 已同步当前真实模板字段 `thing6/time16/thing3`。

### 2026-06-17 P0 体验增强完成

- [x] `sendExpiryReminders` 从逐条提醒改为每日汇总一条。
- [x] `reminders` 汇总记录改为 `expirySummary`，保留 `itemIds`、`itemNames`、`itemCount`。
- [x] 本地食材词库扩展到 484 条。
- [x] 食材词库支持拼音首字母缩写匹配。
- [x] 添加页支持输入 `nn`、`jd`、`bc` 等缩写后自动补齐食材名和关键字段。
- [x] 添加页新增「最近常加 / 再加一次」。
- [x] 首页和日历「开饭雷达」文案按时段和状态变化。
- [x] 撤回首页和日历「开饭雷达」已处理批量删除入口，避免误删库存。
- [x] 首页雷达保留跳转日历报告能力，日历报告保留优先项提示。

### 2026-06-30 GEO 自证案例本地基建完成

- [x] 新增 `site/` 静态品牌站产物。
- [x] 新增品牌首页 `/`。
- [x] 新增公开隐私政策页 `/privacy/`。
- [x] 新增功能说明页 `/features/`。
- [x] 新增常见问题页 `/faq/`。
- [x] 新增 GEO 自证案例页 `/geo-case/`。
- [x] 新增 `robots.txt`、`sitemap.xml`、`llms.txt`。
- [x] 新增 `site/cos-upload-manifest.csv`，保留 COS 备选上传清单。
- [x] 新增 `site/server-deploy-plan.md`，明确优先使用 `fridge.playgamelab.cn` + 轻量服务器 + Caddy 静态站。
- [x] 新增 `geo/brand-brief.yaml`。
- [x] 新增 `geo/prompt-universe.csv`。
- [x] 新增 `geo/evidence/` 和 `geo/reports/` 目录说明。
- [x] 新增 3 篇内容草稿到 `docs/content-drafts/`。
- [x] 新增小程序非 Tab 页面：`about`、`privacy`、`features`。
- [x] 撤回首页 GEO / AI 说明区，首页保持库存主流程；GEO 信息保留在品牌站、非 Tab 页面和菜谱页入口。
- [x] 菜谱页隐私卡片新增小程序隐私说明、微信隐私指引、功能说明、关于页入口。
- [x] 首页、日历、菜谱分享标题统一为“冰箱小雷达｜微信里的冰箱食材库存管理小程序”。
- [x] `project.config.json` 忽略 `site`、`geo`、`diag-output`、`.workbuddy`，避免进入小程序上传包。
- [x] 通过关键 `node --check`。
- [x] 通过 JSON 配置检查。
- [x] 本地静态站 5 个页面均返回 HTTP 200。
- [x] `site/sitemap.xml` 通过 XML 检查。

### GEO / 品牌站上线待办

- [x] 确认品牌站目标子域名：`fridge.playgamelab.cn`。
- [ ] 上线前在腾讯云 / 备案后台复核 `playgamelab.cn` 的备案和接入状态。
- [x] 将 `site/sitemap.xml` 和 `site/robots.txt` 替换为 `https://fridge.playgamelab.cn`。
- [x] 将 `pages/privacy/privacy.js` 的 `PUBLIC_PRIVACY_URL` 填为 `https://fridge.playgamelab.cn/privacy/`。
- [x] 将 `site/` 上传到轻量服务器静态目录 `/var/www/fridge-radar-site`。
- [x] 配置 Caddy 站点块，root 指向轻量服务器静态目录。
- [x] 运行 `caddy validate` 并 reload Caddy，确认服务为 `active`。
- [x] 服务器内确认 `Host: fridge.playgamelab.cn` 已由 Caddy 接管并返回 HTTP 到 HTTPS 跳转。
- [x] 在腾讯云 DNS 中新增 `fridge.playgamelab.cn` A 记录，指向轻量服务器公网 IP。
- [x] DNS 生效后通过 Caddy 自动签发并验证 HTTPS 证书。
- [x] 确认线上 80/443 可访问，HTTP 自动跳转 HTTPS。
- [x] 上线后打开 `/`、`/privacy/`、`/features/`、`/faq/`、`/geo-case/`、`/llms.txt`、`/sitemap.xml`，均返回 HTTPS 200。
- [ ] 将公开隐私政策 URL 同步到小程序后台/简介或后续发布文案中。当前已打开微信公众平台并把 `https://fridge.playgamelab.cn/privacy/` 复制到剪贴板，待人工保存确认。
- [x] 使用微信开发者工具 CLI 登录、打开项目并生成预览二维码。
- [x] 首页 GEO / AI 说明区撤回后重新生成预览包：TOTAL 693.6 KB，main 412.8 KB，`/pkg-add/` 280.8 KB。
- [x] 用预览二维码真机回归：首页主流程、隐私页、功能说明页、关于页、菜谱页说明入口、添加 / 日历 / 菜谱主流程。
- [x] 明确发布策略：本轮小程序侧改动不单独上传 / 提审，和下一阶段新增功能版本一起发布。
- [ ] 用 `geo/prompt-universe.csv` 重新采样，并把原始回答保存到 `geo/evidence/`。
- [ ] 根据真实证据重新生成可审计 GEO 报告，不复用旧报告的虚拟/模拟来源当成结果。

### A. 已有待办并入 v1.2

- [ ] 下一次上传新版本时，包含「页面转发能力修复」
- [x] 新版本上传前真机确认右上角菜单中「转发」不再置灰
- [x] 在根目录复跑关键 `node --check`
- [x] 用微信开发者工具打开根目录 `main`，确认首页、添加页、日历页、菜谱页加载正常
- [x] 真机检查首页 5 分区、添加、编辑、删除、搜索、清空流程
- [x] 真机确认常见食材缩略图归桶正确
- [ ] 检查微信后台隐私协议、服务内容、类目是否与当前 v1.0 功能一致
- [ ] 更新 README 截图，替换旧 UI 截图
- [ ] 查看第一次自动化日报输出是否符合预期，如太长或重点不准，再调整监控提示词
- [x] 整理 CloudBase 云函数说明，区分当前使用和后续预留
- [ ] 如后续不再需要历史云函数，先列清单给用户确认，不直接删除
- [x] 继续观察主包体积，新增图片前先估算体积
- [x] 当前功能分支 `feat/home-radar-merge` 已推送到 `origin/feat/home-radar-merge`
- [ ] 发布前将功能分支合并到目标发布分支

### B. 官方文档审计

- [x] 新增或更新微信小程序官方文档审计清单，覆盖转发、隐私、类目、备案、包体、云函数安全、订阅消息、虚拟支付和 AI 深度合成边界
- [x] 把「页面必须声明 `onShareAppMessage` 才显示右上角转发」写入发布前检查项
- [x] 把「需要朋友圈分享的页面必须声明 `onShareTimeline`」写入发布前检查项
- [x] 把「隐私保护指引必须与实际调用接口一致」写入发布前检查项
- [x] 把「服务类目必须和首页可达功能一致」写入发布前检查项
- [x] 把「主包 / 单个分包不得超过 2MB，项目内目标主包 < 1.9MB」写入发布前检查项
- [x] 把「API key、会员、配额、支付、AI 调用不得放前端」写入安全检查项

### C. 到期订阅提醒

- [x] 确认微信公众平台是否有合适的到期 / 临期提醒订阅消息模板
- [x] 明确订阅消息触发点：添加或编辑食品保存成功后提示用户订阅
- [x] 设计订阅提醒文案，避免强制、诱导或阻断主流程
- [x] 设计 `sendExpiryReminders` 云函数真实逻辑：每天 09:00 扫描临期食品
- [x] 设计 `reminders` 防重复发送记录，避免同一食品同一天重复提醒
- [x] 先固定提醒规则，例如提前 1 天或 3 天，不在 v1.2 做复杂自定义
- [x] 真机验证用户同意订阅后能收到提醒
- [x] 真机验证用户拒绝、关闭主开关等订阅结果分支
- [x] 真机验证测试食品到期前能收到提醒
- [x] 微信公众平台确认模板字段并按实际模板调整云函数为 `thing6/time16/thing3`
- [x] 在 CloudBase 配置 `EXPIRY_REMINDER_TEMPLATE_ID` 和 `EXPIRY_REMIND_DAYS`
- [x] 部署 `sendExpiryReminders` 云函数和定时触发器
- [x] 等待下一次每天 09:00 定时器自动触发，确认非小程序端触发也能发送成功
- [x] 如 09:00 定时触发仍报 `INVALID_WX_ACCESS_TOKEN`，改为服务端 access_token 方案
- [x] 将逐条提醒改为每日汇总提醒
- [ ] 观察真实用户反馈，评估每日汇总提醒文案是否足够清楚

### D. CloudBase 与安全治理

- [x] 检查 `items` 集合权限是否为仅创建者可读写
- [x] 检查 `parseLogs`、`reminders`、`fridgeZoneConfigs` 等集合权限是否符合当前功能
- [x] 检查当前前端是否仍无拍照、扫码、AI、支付用户入口
- [x] 检查云函数是否存在会被前端误触发的高风险路径
- [x] 检查清空全部食品数据流程是否仍有二次确认
- [x] 输出 CloudBase 云函数说明，明确当前使用、占位预留、后续企业主体版本预留

### E. 商业化预研，不进 v1.2 功能

- [x] 整理 AI 商业化路线文档，区分 v1.x、v2 AI、v3 会员支付
- [x] 核实非个人主体、深度合成类目、算法备案 / 在用证明、AI 生成内容标识要求
- [x] 核实虚拟支付开通条件、iOS / Android / 鸿蒙 / Windows 接入差异和后台配置要求
- [x] 明确个人主体阶段不开放 AI、拍照识别、AI 菜谱和支付会员

暂不做：

- [x] 不恢复 AI 菜谱
- [x] 不恢复拍照识别
- [x] 不恢复条形码扫描
- [x] 不做支付 / 会员
- [x] 不做登录页
- [x] 不做 UGC
- [x] 不引入独立后端、Docker、Vercel、Supabase、Next.js

## 后续版本建议

> 📋 **v1.2 发布后优化交接（给 codex）**：详见 [`docs/handoff-post-v1.2-optimization.md`](docs/handoff-post-v1.2-optimization.md)。
> 覆盖「可维护性 / 性能健壮性 / 体验留存 / UI 无障碍 / 收尾」五类，含 A 类（可直接开工）与 B 类（先出方案再做）。
> 不含 AI / 支付；`parseService.js` 死代码下沉与预留云函数云端下线属另一大项，**不在该交接范围**。

v1.2 完成后再考虑：

- 根据 v1.2 真机结果修正小 UI / 文案问题
- 根据每日汇总提醒反馈评估是否增加提醒设置页
- 根据官方文档审计结果补齐发布前检查文档
- 不改变核心数据结构

v2 之后再考虑：

- 企业主体后恢复拍照识别
- 企业主体后恢复 AI 菜谱
- 更系统的云存储图片治理
- 菜谱搭配功能正式上线
