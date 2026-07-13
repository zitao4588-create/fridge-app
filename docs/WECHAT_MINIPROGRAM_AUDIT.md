# 冰箱小雷达 v2.0 微信小程序提审检查清单

最后更新：2026-07-13

2026-06-17 P0 收口记录：

- 用户已确认 v1.2 基线和 v2.0 餐盘手势真机验证完成。
- 订阅消息模板字段已按真实模板同步为 `thing6/time16/thing3`。
- 当前剩余人工项集中在微信公众平台后台、README 截图、体验版上传和提审材料。

2026-07-04 微信 AI 后台核查补充：

- 微信公众平台后台已开启「微信 AI」「自动模式」「开发模式」。
- 微信 AI 后台当前发布的是 v1.2 口径知识库；本地源文件已更新为 v2.0，需在提审同步阶段替换后台版本。
- 旧版 2026-06-12 22:31 知识库已从后台删除，避免新旧口径同时被检索。
- 当前小程序代码未接入自定义 AI 原子接口、原子组件或接力页。
- 微信 AI 知识库必须与当前 v2.0 已开放能力一致，不得承诺 AI 菜谱、拍照识别、扫码、支付、会员、登录或公开 UGC。

## 版本定位

v2.0 是个人主体阶段的「家庭库存闭环版」：

- 让手动录入更省力。
- 让首页直接告诉用户先处理什么。
- 让空冰箱用户能快速建立样板库存。
- 灰度验证基础临期订阅提醒。
- 补齐提审前的微信小程序规则检查。

v2.0 不开放：

- AI 菜谱生成
- AI 拍照识别
- 条形码 / 小票识别
- 会员 / 支付
- 登录页
- 头像、昵称、手机号获取
- UGC 社区
- 独立后端、Vercel、Supabase、Next.js、Docker

## 提审前必查

### 1. 页面转发

- [x] 首页 `pages/index/index` 已声明 `onShareAppMessage`。
- [x] 日历页 `pages/calendar/calendar` 已声明 `onShareAppMessage`。
- [x] 菜谱页 `pages/recipes/recipes` 已声明 `onShareAppMessage`。
- [x] 添加 / 编辑页 `pkg-add/item-form/item-form` 已声明 `onShareAppMessage`。
- [x] 需要朋友圈入口的主页面已声明 `onShareTimeline`。
- [x] 分享路径回到首页，不携带用户库存、食材详情、云文件 ID 等隐私数据。
- [x] 真机确认右上角菜单「转发」不置灰。

官方参考：

- [小程序转发能力](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/share.html)

### 2. 隐私保护指引

- [ ] 微信公众平台隐私保护指引与当前实际调用接口一致。
- [x] 当前前端不调用相机、相册、扫码、手机号、头像昵称等接口。
- [x] `pages/recipes/recipes` 的隐私入口可正常打开 `wx.openPrivacyContract`。
- [ ] 若启用订阅提醒灰度，隐私保护指引中需覆盖订阅消息使用场景。
- [ ] 不把后续 AI、拍照、支付能力写进当前 v2.0 的服务描述，避免审核员看到未开放能力。

官方参考：

- [用户隐私保护指引](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/)

### 3. 服务类目与服务内容

- [ ] 服务内容描述聚焦「家庭食品库存管理、到期提醒、日历查看」。
- [x] 首页两次点击内能到达核心功能：查看库存、添加食品、查看到期状态。
- [ ] 类目不要选择 AI、深度合成、内容社区、交易支付等与 v2.0 不匹配的方向。
- [ ] 提审截图和功能说明只展示 v2.0 已开放能力。

官方参考：

- [小程序服务类目所需材料](https://developers.weixin.qq.com/miniprogram/product/material/)
- [小程序常见拒绝情形](https://developers.weixin.qq.com/miniprogram/product/reject)

### 4. 包体与资源

- [x] 本轮预览已在微信开发者工具确认主包体积。
- [x] 项目内部目标：主包小于 1.9MB。
- [x] 微信限制：主包 / 单个分包不得超过 2MB。
- [x] 新增页面优先放分包。
- [x] 新增图片前先估算体积，避免把 PNG/JPG 直接塞进主包。
- [x] 本轮 v2.0 不新增新的大体积图片资源。
- [x] 正式上传体验版前再次确认包体。

v2.0 最终预览包体：总包 720.4 KB，主包 437.5 KB，`pkg-add` 分包 282.9 KB；分包依赖重建 warnings 为空。

官方参考：

- [小程序分包加载](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)

### 5. CloudBase 与数据库权限

- [x] `items` 集合设置为仅创建者可读写。
- [x] `reminders` 集合设置为仅创建者可读写，或用云函数写入并限制前端直接访问。
- [x] `parseLogs` 集合虽然当前前端不开放识别能力，也要限制为仅创建者可读写。
- [x] `fridgeZoneConfigs` 若继续保留，确认当前前端不会写入危险数据。
- [x] 云函数中不要信任前端传入的 openid。
- [x] API key、支付参数、AI key、AppSecret 不得写入小程序前端。
- [x] 订阅消息模板 ID 可出现在前端 `tmplIds` 中，它不是服务商 API key；字段变更时必须同步前端和云函数。
- [x] 仓库中不要提交真实密钥。

当前云函数说明：

| 云函数 | v2.0 状态 | 说明 |
|---|---|---|
| `getOpenId` | 可用 | 基础 openid 获取 |
| `sendExpiryReminders` | 本地整改待部署 | 线上仍是逐食材旧版；本地已改为每日汇总、授权事件和业务结果统计，需双账号验证后再部署 |
| `parseFoodImage` | 本地闸门待部署 | v2.0 前端不开放；本地默认拒绝图片下载和识别 |
| `parseBarcode` | 本地闸门待部署 | v2.0 前端不开放；本地默认拒绝搜索和识别 |
| `generateRecipes` | 本地闸门待部署 | v2.0 前端不开放；本地默认拒绝 AI 生成 |

### 6. 订阅消息提醒

v2.0 继续保留基础临期提醒，不做复杂提醒设置。目标策略为每日早晨汇总一条，避免多件临期食材逐条刷屏；2026-07-13 审计确认线上仍是逐食材旧版，以下本地整改项必须部署并真机复核后才能重新标记为闭环。

- [x] 微信公众平台先申请合适的到期 / 临期提醒订阅消息模板。
- [x] 前端使用当前模板 ID 调用 `wx.requestSubscribeMessage`。
- [x] 云函数模板 ID 从环境变量 `EXPIRY_REMINDER_TEMPLATE_ID` 读取。
- [x] 云函数提醒窗口从环境变量 `EXPIRY_REMIND_DAYS` 读取，默认 3 天，最大 7 天。
- [x] `sendExpiryReminders` 未配置模板 ID 时安全返回，不发送消息。
- [x] 定时触发器配置为每天 09:00。
- [ ] 部署后确认 `reminders` 使用 `expirySummary` 记录同一用户同一天的汇总发送状态，避免重复提醒。
- [x] 本地汇总记录保留 `itemIds`、`itemNames`、`itemCount`，便于后续排查。
- [x] 本地保存订阅授权事件，区分 `accepted`、`rejected`、`unsupported`、`failed`。
- [x] 本地按“接受次数 - 成功发送次数”计算授权余额，仅在余额大于 0 时调用微信发送接口。
- [x] 本地把 `43101` 记为不可重试，等待下一次明确授权；其他临时错误下一天再试。
- [x] 本地输出无个人信息的结构化业务统计，区分成功、无授权跳过、拒绝和临时失败。
- [x] 模板字段必须和云函数字段一致：当前代码使用 `thing6`、`time16`、`thing3`。
- [x] 真机分别验证用户同意、拒绝、关闭主开关三种情况。
- [x] 保存食品成功后，订阅授权失败不能影响食品保存。
- [ ] 用两个真实微信账号验证授权消耗、重新授权、同日去重和每日汇总。
- [ ] 部署后下载线上函数包，比对确认不再运行逐食材旧版。

官方参考：

- [订阅消息能力](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/subscribe-message.html)
- [wx.requestSubscribeMessage](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)

### 7. AI、深度合成与支付红线

v2.0 不进入这些能力，但提审前必须确认没有前端入口。

- [x] 不展示 AI 菜谱生成按钮。
- [x] 不展示拍照识别按钮。
- [x] 不展示条形码 / 小票识别入口。
- [x] 不展示会员订阅、付费解锁、价格、充值等文案。
- [x] 不跳转客服、公众号、H5 或外部链接完成支付。
- [x] 不在前端包含任何 AI 服务商 API key。
- [x] 三个预留云函数本地增加默认关闭总闸门，发生在付费 / 高权限调用之前。
- [ ] 部署后确认三个新总闸门均未开启，并重新核对函数调用权限和 AI Token。
- [ ] 后续若开放 AI，需要主体、类目、资质和 AI 生成内容标识重新核查。
- [ ] 后续若开放会员，需要接入小程序虚拟支付，不走普通微信支付或外部收款。

### 8. 微信 AI 后台与知识库一致性

当前微信 AI 后台能力已开启，但 v2.0 提审口径仍不得把它宣传为 AI 菜谱、拍照识别或支付入口。

- [x] 微信 AI 后台已开启，需纳入提审前检查。
- [x] 本地知识库源文件 `docs/wechat-ai-knowledge-base-v1.md` 已更新为 v2.0 口径；文件名为历史兼容名称。
- [x] 知识库明确说明当前不支持 AI 菜谱、拍照识别、包装 OCR、条形码扫描、小票识别、支付、会员、登录和 UGC。
- [x] 知识库已补充本地词库、样板冰箱、可选数量、餐盘消耗、私有家庭共享和每日临期汇总提醒等 v2.0 已开放能力。
- [x] 在微信公众平台后台重新上传新版知识库，并确认状态为「已发布」。
- [x] 后台知识库文件名、发布时间和本地源文件版本保持可追溯。
- [x] 删除后台旧版知识库，避免 v1.0 口径与 v1.2 口径同时生效。
- [ ] 用微信 AI 调试入口抽查常见问题回答，确认不会说当前支持未开放能力。
- [ ] 如后续接入开发模式自定义能力，必须先新增专门设计审查，不直接在原子接口中调用支付、拍照、扫码、隐私协议、分享等敏感 API。

官方参考：

- [小程序虚拟支付](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html)
- [小程序 AI 能力更新日志](https://developers.weixin.qq.com/miniprogram/dev/ai/changelog.html)

## 真机回归清单

- [x] 首次打开小程序，首页加载正常。
- [x] 空冰箱状态显示「30 秒装满样板冰箱」。
- [x] 样板食材可多选。
- [x] 样板食材可批量保存。
- [x] 输入常见食材名称后，品类、保质期、过期日、分区能自动补齐。
- [ ] 输入拼音首字母缩写后，食材名和关键字段能自动补齐。
- [ ] 添加页「最近常加 / 再加一次」可按今天重新生成到期日。
- [x] 保存前仍可手动修改自动补齐内容。
- [x] 首页「开饭雷达」能展示先处理的食材。
- [ ] 首页「开饭雷达」按时段 / 状态变化展示文案。
- [ ] 首页「开饭雷达」点击后能跳转日历报告，且不直接删除库存。
- [x] 日历页「开饭雷达」仍正常。
- [ ] 日历页「开饭雷达」优先项展示正常，且不直接提供批量删除入口。
- [x] 搜索食品正常。
- [x] 编辑食品正常。
- [x] 删除食品正常。
- [x] 清空全部食品仍有二次确认。
- [x] 常见食材缩略图归桶正确。
- [x] 菜谱页仍是占位页，不出现 AI 生成入口。
- [x] 右上角转发不置灰。
- [x] 隐私保护指引入口可打开。
- [x] 订阅提醒未配置模板时不影响添加 / 编辑。
- [x] 订阅提醒配置模板后，同意和拒绝分支都不阻断保存。

## 上传前命令检查

在项目根目录执行：

```bash
node --check app.js
node --check services/itemService.js
node --check services/parseService.js
node --check services/reminderService.js
node --check utils/visualAssets.js
node --check utils/constants.js
node --check utils/foodLexicon.js
node --check utils/mealRadar.js
node --check pages/index/index.js
node --check pages/calendar/calendar.js
node --check pages/recipes/recipes.js
node --check pkg-add/item-form/item-form.js
node --check cloudfunctions/sendExpiryReminders/domain.js
node --check cloudfunctions/sendExpiryReminders/index.js
node tests/reminder-domain.test.js
```

再确认：

```bash
git diff --check
```

## 仍需人工确认

- [ ] 微信公众平台服务类目。
- [ ] 微信公众平台隐私保护指引。
- [x] CloudBase 数据库集合权限。
- [x] 订阅消息模板 ID 和模板字段。
- [x] `sendExpiryReminders` 云函数部署和定时触发器是否生效。
- [x] 本轮微信开发者工具预览包体积。
- [x] 真机预览完整流程。
- [ ] 上传体验版。
- [ ] 提审截图和功能说明。

## 说明

本文档用于 v2.0 提审前自查。微信规则、后台入口和能力开通条件会变化；最终以微信公众平台后台和官方文档最新显示为准。

## v2.0 家庭库存闭环补充检查

### 本地已验证

- [x] `quantityTracked` 明确区分历史默认数量和用户真实数量。
- [x] 页面不展示“个、盒、瓶、袋、包、份”等数量单位。
- [x] 常温储物分区已进入添加页和首页 6 分区。
- [x] 餐盘消耗与详情删除语义分离，消耗支持短时撤销。
- [x] 家庭页不获取头像、昵称、手机号，不提供公开 UGC 或聊天。
- [x] 云函数不接受前端 openid、familyId 或 role 作为权限依据。
- [x] 微信开发者工具普通编译通过，问题面板 0；库存与家庭领域测试共 23 项断言通过，提醒领域 19 项断言通过。

### 云端与真机发布门槛

- [x] 创建四个无前缀家庭集合并设置为 `ADMINONLY`，正式集合当前为空。
- [x] 部署 `familyInventory` 安全修正版，移除测试前缀并确认 `Active / Available`。
- [x] `items` 保持 `PRIVATE`；家庭食材统一归家庭创建者 `_openid`，避免破坏旧版客户端和 215 条历史数据。
- [x] 双账号验证邀请码一次性、撤回、旧码失效、加入和共享库存主链路。
- [x] 双账号验证共同写入和成员消耗；成员移除后的越权失败按用户决定跳过，保留为未验证风险。
- [x] 真机验证拖拽期间页面和横向列表不移动，松手后滚动与点击详情恢复正常。
- [ ] 隐私保护指引增加“家庭成员共同查看和修改私有库存”。
- [ ] 提审说明明确“不提供公开发布、评论、聊天、陌生人发现或社区功能”。

v2.0 正式后端已经部署，前端尚未上传、提审或发布。上传体验版并完成正式包真机回归后可进入 C4 候选；审核通过不等于已正式发布。
