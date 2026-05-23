# PROJECT_CONTEXT.md

最后更新：2026-05-23

## 当前项目目标

本项目当前主线已经从原来的 React/Vite H5，切换为微信小程序项目。

项目名称暂定：冰箱管家  
项目目录：`fridge-app`  
产品方向：冰箱食品饮料库存管理

当前阶段目标是完成第一阶段 MVP：

- 用户可以手动添加冰箱食品饮料
- 首页可以通过真实冰箱模板查看分区库存、过期状态、统计和搜索
- 支持编辑、删除食品
- 数据保存到微信云开发 CloudBase 云数据库
- 每条食品数据绑定当前用户 `_openid`
- 日历页显示到期食品
- 菜谱页基于临期食品返回本地规则推荐
- 拍照录入和扫码录入先走 mock 解析，并必须经过确认页后保存

## 当前技术栈

- 微信小程序原生开发
- 原生 JavaScript
- WXML
- WXSS
- 微信云开发 / CloudBase
- 云数据库集合：`items`、`reminders`、`parseLogs`
- 云函数：`getOpenId`、`parseFoodImage`、`parseBarcode`、`generateRecipes`、`sendExpiryReminders`

当前不使用：

- Vercel
- Supabase
- React H5 作为主线
- Next.js
- 独立后端服务器
- 登录页
- 真实 OCR
- 真实条形码商品库
- 真实 AI API
- 订阅消息真实推送

## 云开发配置

- 小程序 AppID：`wx328e2b87665508e7`
- CloudBase 环境 ID：`cloud1-d3g4v0ms8ee56bd94`
- `app.js` 已初始化该云环境
- `project.config.json` 已配置：
  - `appid`
  - `cloudfunctionRoot: "cloudfunctions/"`
  - `miniprogramRoot: "./"`
- 数据库集合已创建：
  - `items`
  - `reminders`
  - `parseLogs`
- 集合权限已设置为：仅创建者可读写

## 当前已完成功能

### 页面

- `pages/index`：首页冰箱分区视图、统计、搜索和弹窗清单
- `pages/item-form`：添加 / 编辑食品
- `pages/quick-add`：快速录入入口
- `pages/parse-confirm`：解析结果确认页
- `pages/calendar`：小程序内日历页
- `pages/recipes`：今日菜谱推荐页
- `pages/profile`：我的页

### 首页

- 第一栏展示用户已选冰箱模板图，当前默认是“三门冰箱”
- 已接入 7 张冰箱结构模板图：
  - 法式多门
  - 十字门
  - 对开门
  - 三门冰箱
  - 双门上冷藏下冷冻
  - 双门上冷冻下冷藏
  - 单门冰箱
- 冰箱模板图已去掉图片自带的顶部大标题、绿色抽屉里的“果蔬抽屉”文字，以及分区内部的“冷藏区 / 变温区 / 冷冻区 / 门上储物格”等文字
- 冰箱模板图上覆盖分区热区，点击分区打开底部分区清单
- 每个分区有独立数量统计点，显示在冰箱图片对应分区里，位置由模板配置控制
- 分区数量统计点展示三项：
  - `总`：该分区全部食品数量，包含临期和已过期
  - `临`：距离过期日期 0 到 3 天内的食品数量，不包含已过期
  - `过`：已过期食品数量，不论是否为 0 都用红色展示
- 分区清单按品类展示当前分区食品
- 分区清单内可直接编辑食品
- 分区清单内可直接删除食品，删除前二次确认
- 分区清单内可添加食品到当前分区
- 首页不显示冰箱类型切换按钮，后续由首次设置或注册后选择冰箱类型
- 底部全局统计：
  - 总食品数
  - 临期数量
  - 已过期数量
- 全局统计点击后弹出对应食品列表
- 首页不再常驻底部食品列表，列表收口到分区弹窗、全局统计弹窗和搜索结果弹窗
- 搜索简化为一个搜索框加一个“确定”按钮，点击后弹出相关食品列表
- 搜索“确定”按钮已改为可点击 `view`，避开小程序原生 `button` 默认最小宽度，实际渲染宽度已缩短
- 首页“我的冰箱”下方说明文字已移除，冰箱图内部上移裁切以减少顶部空白
- 添加入口收口到点击冰箱图片分区后的分区清单内
- 支持在弹窗列表中编辑食品
- 支持在全局统计和搜索结果弹窗中删除食品，删除前二次确认
- 弹窗列表已简化为标题、食品名、到期日期、编辑和删除，不再重复显示数量、位置和状态徽标
- 删除成功后在页面内展示包含食品名的提示

### 添加 / 编辑

- 支持字段：
  - 食品名称
  - 品类
  - 数量
  - 单位
  - 生产日期
  - 保质期天数
  - 过期日期
  - 存放位置
  - 备注
- 生产日期 + 保质期天数可自动计算过期日期
- 过期日期仍可手动修改
- 品类、单位、存放位置支持直接点选，不再必须打开系统 picker
- 已选品类、单位、存放位置会高亮显示
- 表单会对食品名称、数量、保质期天数、过期日期做字段级校验
- 校验失败时会在对应字段下方展示错误文案，并标红输入区域

### 过期状态

- 已过期：`overdue`
- 1 天内过期：`critical`
- 3 天内过期：`warning`
- 7 天内过期：`soon`
- 正常：`normal`

### 日历页

- 展示本月日历
- 有食品到期的日期有标记
- 点击日期展示当天到期食品
- 第一阶段不接系统日历

### 菜谱页

- 根据库存和临期食品返回 3 个规则推荐
- 优先使用 3 天内过期食品
- 没有临期食品时基于现有库存推荐
- 第一阶段不调用真实 AI API

### 拍照 / 扫码 mock 流程

- 拍照录入入口可返回 mock 解析结果
- 扫码录入入口可返回 mock 解析结果
- 解析结果进入 `pages/parse-confirm`
- 用户确认后才保存到 `items`
- `parseLogs` 会记录解析日志

## 当前数据结构

### items

```ts
type FridgeItem = {
  _id: string;
  _openid: string;
  name: string;
  category: "蔬菜" | "水果" | "肉蛋" | "乳制品" | "饮料" | "速冻" | "调料" | "主食" | "其他";
  quantity: number;
  unit: string;
  productionDate?: string;
  shelfLifeDays?: number;
  expireDate: string;
  storageLocation: "冷藏" | "变温" | "冷冻" | "门架" | "其他";
  note?: string;
  source: "manual" | "photo" | "barcode";
  barcode?: string;
  imageFileId?: string;
  parseConfidence?: number;
  parseRawText?: string;
  parseStatus?: "mock" | "pending" | "success" | "failed" | "manual_confirmed";
  createdAt: number;
  updatedAt: number;
};
```

### reminders

第一阶段只保留结构，不做真实推送。

### parseLogs

用于记录拍照 / 扫码 mock 解析日志。

## service 层

- `services/itemService.js`
  - `createItem`
  - `updateItem`
  - `deleteItem`
  - `getItems`
  - `getExpiringItems`
  - `searchItems`
  - `clearItems`
- `services/parseService.js`
  - `parseByPhoto`
  - `parseByBarcode`
  - `normalizeParseResult`
  - `calculateExpireDate`
- `services/reminderService.js`
  - `createReminder`
  - `cancelReminder`
  - `getCalendarEvents`
  - `requestSubscribeMessage`
- `services/recipeService.js`
  - `getRecipeRecommendations`
  - `ruleBasedRecipes`
  - `mockAIRecipes`

页面不要直接堆复杂数据库逻辑，新增业务逻辑优先放到 service 层。

## 云函数状态

已部署成功：

- `getOpenId`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

说明：

- `parseFoodImage` 第一阶段返回 mock 图片解析结果
- `parseBarcode` 第一阶段返回 mock 条形码解析结果
- `generateRecipes` 第一阶段保留规则推荐结构
- `sendExpiryReminders` 第一阶段只保留结构，不实际发送订阅消息

## 本轮完成内容

### 2026-05-21 首页入口与一屏布局补充

- 按用户要求移除首页顶部“冰箱库存”标题区域和右侧通用添加按钮
- 从底部 Tab 移除“添加”入口，添加食品收口到点击冰箱图片分区后的分区清单
- 首页不再常驻展示底部食品列表
- 首页保留底部全局三项统计：
  - 总食品数：绿色
  - 临期：黄色
  - 已过期：红色
- 点击全局统计会弹出对应食品列表
- 搜索简化为“搜索框 + 确定按钮”，点击确定后弹出搜索结果列表
- 首页布局改为固定一屏：
  - 冰箱图占主要空间
  - 图片内显示各分区独立 `总 / 临 / 过` 统计
  - 图片下方显示全局统计和搜索框
  - 首页本身不做上下或左右滚动
- 分区独立统计最终放回冰箱图片对应分区内，使用 `markerPoint` 控制位置
- 按截图反馈继续优化首页视觉：
  - 去掉“我的冰箱”下方说明文字
  - 冰箱图内容上移裁切，减少图片顶部空档
  - 清理 7 张冰箱模板图里自带的分区文字
  - 搜索“确定”按钮缩小并居中
  - 底部三项全局统计字体加粗加大

### 2026-05-22 首页弹窗、搜索按钮和分区卡片补充

- 分区弹窗和首页三色统计弹窗统一保留标题，去掉标题下方细小说明文字
- 首页三色统计弹窗去掉顶部关闭按钮，仍可点击遮罩关闭
- 分区弹窗右上角保留“添加食品”主按钮
- 分区弹窗食品列表新增删除按钮，和统计 / 搜索弹窗共用现有二次确认删除逻辑
- 弹窗列表不再重复展示数量、品类、位置和状态徽标，只保留食品名、到期日期、编辑和删除
- 首页搜索“确定”控件从原生 `button` 改为可点击 `view`，解决原生按钮默认最小宽度导致“太长”的问题
- 冰箱图片内分区统计卡片整体放大
- 冷藏区、冷冻区、变温区等非门架功能区统计卡片按各自热区中心定位
- 门上储物格统计卡片继续显示，但保留原有 `markerPoint` 位置，不跟随非门架规则居中
- 最新图片原图备份：
  - `/private/tmp/fridge-image-text-backup-1779367504`
- 本轮修改文件：
  - `app.json`
  - `images/fridges/*.jpg`
  - `pages/index/index.wxml`
  - `pages/index/index.wxss`
  - `pages/index/index.js`
- 本轮验证通过：
  - `node --check pages/index/index.js`
  - `node --check pages/item-form/item-form.js`
  - `node --check pages/parse-confirm/parse-confirm.js`
  - `npm run lint`
  - `npm run build`

### 2026-05-21

- 按用户反馈重做首页第一栏冰箱模型方案：
  - 放弃 CSS 色块式冰箱模型
  - 放弃在冰箱图上直接塞“查看 / 添加”小按钮
  - 改用真实冰箱模板图片 + 透明热区
- 新增 7 张用户提供的冰箱模板图到 `images/fridges/`
- 在 `utils/constants.js` 中配置冰箱类型、模板图片、分区热区和默认冰箱类型
- 默认冰箱类型为 `three-door`，对应“三门冰箱”
- 首页读取 `selectedFridgeLayoutKey`，用于后续首次设置或注册后选择冰箱类型
- 首页不展示冰箱类型切换按钮；除非后续支持两个及以上冰箱，否则主页面不出现类型切换
- 每个冰箱分区支持：
  - 点击分区打开底部清单面板
  - 查看当前分区所有食品
  - 按品类分组展示
  - 从清单内编辑食品
  - 从清单内添加食品到当前分区
- 新增 `变温` 存放位置，适配模板图中的变温区
- 保留首页统计、搜索、编辑、删除能力；后续首页常驻列表已调整为弹窗清单
- 验证通过：
  - `node --check pages/index/index.js`
  - `node --check utils/constants.js`
  - `npm run lint`
  - `npm run build`
- 按用户反馈取消“果蔬抽屉”独立分区：
  - 新录入数据不再保存 `保鲜`
  - 历史 `保鲜` 数据在页面和 service 层归一到 `冷藏`
  - 冷藏区继续兼容历史 `保鲜` 数据
- 清理 7 张冰箱模板图：
  - 去掉顶部大标题文字
  - 去掉绿色抽屉里的“果蔬抽屉”文字
  - 原图备份在 `/private/tmp/fridge-template-backup-1779327288247`
- 优化冰箱分区数量统计标记：
  - 从热区角落内的深色徽标，改为独立的浅色居中统计点
  - 统计点展示 `总 / 临 / 过` 三项
  - `总` 包含临期和已过期；`临` 标准为 0 到 3 天内到期；`过` 固定红色展示
  - 每个分区通过 `markerPoint` 单独控制统计点位置
- 本轮修改文件：
  - `images/fridges/*.jpg`
  - `pages/index/index.wxml`
  - `pages/index/index.wxss`
  - `pages/index/index.js`
  - `utils/constants.js`
  - `services/itemService.js`
  - `pages/item-form/item-form.js`
  - `pages/parse-confirm/parse-confirm.js`
  - `pages/profile/profile.wxml`
  - `pages/profile/profile.wxss`
  - `pages/profile/profile.js`
- 本轮最新验证通过：
  - `node --check pages/index/index.js`
  - `node --check utils/constants.js`
  - `npm run lint`
  - `npm run build`
  - 微信开发者工具自动化测试通过，截图：`/private/tmp/fridge-automator/fridge-layout-test.png`
  - 最新三项统计截图已生成：`/private/tmp/fridge-automator/fridge-layout-test.png`

### 2026-05-20

- 因微信小程序备案暂时无法提交，继续推进不依赖备案的功能完善。
- 检查 `items` 组合索引自动创建方式：
  - 微信开发者工具 CLI 未提供数据库索引管理命令
  - 本机没有现成 `tcb` / `cloudbase` CLI
  - 暂不为索引安装新工具，后续建议在云开发控制台手动补
- 优化添加 / 编辑表单选择体验：
  - 品类改为直接点选按钮
  - 单位改为完整宽度直接点选按钮区
  - 存放位置改为直接点选按钮
  - 当前选中项高亮显示
- 优化首页空状态：
  - 无库存时显示“冰箱还是空的”
  - 搜索或筛选无结果时显示“清空筛选”
- 优化删除后的提示：
  - 删除成功后页面内提示 `已删除「食品名」`
- 优化添加 / 编辑表单校验：
  - 食品名称必填
  - 食品名称不超过 30 个字
  - 数量必须大于 0
  - 保质期天数如果填写，必须是正整数
  - 过期日期必填
- 使用微信开发者工具自动化流程完成本轮验收，测试数据已删除。
- 同步更新项目上下文文档。

### 2026-05-19

- 使用现有目录直接改造为微信小程序项目
- 保留旧 React/Vite 文件，没有批量删除
- 创建微信小程序项目结构
- 创建 `PROJECT.md`
- 创建 `app.js`、`app.json`、`app.wxss`
- 创建 7 个小程序页面
- 创建 CloudBase 初始化逻辑
- 创建并部署云函数
- 创建 CloudBase 数据库集合
- 完成手动添加、列表展示、编辑、删除、搜索、筛选
- 完成过期状态计算
- 完成日历页本地展示
- 完成菜谱页本地规则推荐
- 完成拍照 / 扫码 mock 解析确认流程
- 使用微信开发者工具自动化端口完成主要验收
- 测试数据已清理，当前首页回到 0 条

## 修改文件范围

本轮主要涉及：

- `pages/index/index.js`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/item-form/item-form.js`
- `utils/constants.js`
- `images/fridges/french-multi-door.jpg`
- `images/fridges/cross-door.jpg`
- `images/fridges/side-by-side.jpg`
- `images/fridges/three-door.jpg`
- `images/fridges/double-cold-freeze.jpg`
- `images/fridges/double-freeze-cold.jpg`
- `images/fridges/single-door.jpg`

本轮文档收尾涉及：

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

此前小程序改造主要涉及：

- `PROJECT.md`
- `project.config.json`
- `sitemap.json`
- `app.js`
- `app.json`
- `app.wxss`
- `utils/*`
- `services/*`
- `pages/*`
- `cloudfunctions/*`

旧 H5 相关目录仍存在：

- `src/`
- `dist/`
- `public/`
- `node_modules/`
- `package.json`
- `package-lock.json`

这些目前不是小程序主线代码。`project.config.json` 已忽略 `src`、`dist`、`node_modules` 等目录，避免影响小程序运行。

## 验证情况

已通过：

- 微信开发者工具可以导入并运行
- `items` 数据可以写入 CloudBase
- `_openid` 自动绑定成功
- 首页可以读取食品并通过冰箱分区、统计弹窗和搜索弹窗展示清单
- 首页统计正常
- 过期状态正常
- 搜索正常；旧的常驻筛选区已移除
- 编辑食品正常
- 删除食品正常，二次确认逻辑正常
- 日历页显示到期食品正常
- 菜谱页规则推荐正常
- 拍照 mock 解析进入确认页正常
- 拍照 mock 确认保存正常
- 扫码 mock 解析进入确认页正常
- 扫码 mock 确认保存正常
- 云函数列表确认 5 个函数均存在
- `npm run lint` 通过
- `npm run build` 通过
- `node --check app.js` 通过
- `node --check services/itemService.js` 通过
- `node --check pages/index/index.js` 通过
- `node --check pages/item-form/item-form.js` 通过
- 微信开发者工具自动化测试通过 15 项断言：
  - 首页空状态
  - 字段级表单校验
  - 新增食品
  - 搜索无结果
  - 清空筛选
  - 删除食品
  - 删除成功提示
- 微信开发者工具自动化测试通过新增选择体验 15 项断言：
  - 品类快捷按钮数量正确
  - 单位快捷按钮数量正确
  - 位置快捷按钮数量正确
  - 点击“水果 / 瓶 / 冷冻”后表单数据正确更新
  - 对应索引同步更新
  - 已选按钮高亮样式正确
- 复跑核心流程自动化测试通过：
  - 空状态
  - 表单校验
  - 新增食品
  - 搜索无结果
  - 清空筛选
  - 删除食品
- 首页冰箱模板图资源已加入项目
- 首页分区热区、底部分区清单、分区内编辑入口已通过语法和构建检查：
  - `node --check pages/index/index.js`
  - `node --check utils/constants.js`
  - `npm run lint`
  - `npm run build`
- 2026-05-22 首页弹窗、搜索按钮和分区卡片补充已通过：
  - `node --check pages/index/index.js`
  - `npm run lint`
  - `npm run build`
  - 微信开发者工具自动化尺寸断言：搜索按钮实际宽度从 `184px` 缩短到 `39px`
  - 微信开发者工具自动化断言：门架卡片继续显示且保留原位置，非门架卡片按分区中心计算

## 当前还没解决的问题

- 首页冰箱模板热区坐标是按当前图片百分比估算的，需要在微信开发者工具和真机上继续微调
- 首页分区统计卡片已放大；非门架卡片自动居中，门架卡片保留 `markerPoint`，仍需要真机确认是否遮挡关键冰箱结构
- “注册后选择冰箱类型”还没有做正式注册 / 首次设置流程，当前先通过本地 `selectedFridgeLayoutKey` 预留
- 多冰箱管理还没做；后续如果一个用户有两个及以上冰箱，才建议在首页出现冰箱切换入口
- 真实 OCR 未接入
- 真实条形码商品库未接入
- 真实 AI 菜谱推荐未接入
- 真实订阅消息提醒未接入
- 旧 React/Vite 文件还保留在目录里，后续如果确认不再需要，可以手动逐个清理
- 开发者工具服务端口为了本轮测试已开启，后续不用自动化时可以在微信开发者工具的安全设置里关闭
- `miniprogram-automator` 本轮仅临时安装在 `/private/tmp/fridge-automator`，没有写入项目依赖

## 下一步建议

优先建议：

- 在微信开发者工具和真机上检查首页冰箱模板热区，逐个微调分区点击范围
- 用真机重点复查放大后的分区统计卡片：非门架是否居中、门架是否仍在合适位置、是否遮挡冰箱结构
- 做首次设置页或我的页设置项，让用户选择冰箱类型，并写入 `selectedFridgeLayoutKey`
- 如果用户只有一个冰箱，首页继续不显示类型切换；只有多个冰箱时再做切换入口
- 检查新增 `变温` 位置在首页分区、添加页、编辑页、日历页、菜谱页的实际展示是否顺畅
- 用真机预览检查首页、添加页、分区统计点、底部 Tab 的实际触控体验
- 给拍照 / 扫码 mock 流程增加更明显的“第一阶段 mock”提示
- 优化我的页统计，让用户能快速看到库存规模和临期情况
- 根据真机截图继续微调首页一屏布局、分区统计点大小和触控面积

后续第二阶段：

- 接入真实图片上传到云存储
- 接入 `parseFoodImage` 真实 OCR / AI 识别
- 接入 `parseBarcode` 真实商品库或第三方接口
- 接入订阅消息授权与定时提醒
- 抽象真实 AI recipe service

## 2026-05-22 添加页表单简化与日期弹窗收尾

本轮完成：

- 重新检查当前代码库后，基于最新小程序代码调整添加 / 编辑食品页。
- 添加 / 编辑食品页移除可见的“数量、单位、存放位置”填写项。
- 系统内部仍保留兼容默认值：
  - `quantity: 1`
  - `unit: "份"`
  - `storageLocation` 继续由冰箱分区入口带入；编辑旧食品时保留原值。
- 去掉“添加食品”大标题下方的小字说明。
- 日期录入改为两种方式：
  - 生产日期 + 保质期天数，自动生成过期日期。
  - 直接选择过期日期。
- 日期不再直接铺在页面里，改为点击日期行后弹出底部日历窗口。
- 日历弹窗不显示“关闭”按钮；点选日期后自动关闭，也可以点灰色遮罩关闭。
- 日历弹窗的年月标题保持单行显示。
- “上月 / 下月”按钮缩小，并加了 `flex` 限制，避免小程序原生按钮默认样式撑开。
- 品类按钮固定三列并限制在卡片内部，避免真机横向溢出。

本轮修改文件：

- `pages/item-form/item-form.wxml`
- `pages/item-form/item-form.js`
- `pages/item-form/item-form.wxss`

本轮验证：

- `node --check pages/item-form/item-form.js` 通过
- `npm run lint` 通过
- `npm run build` 通过
- 新增临时自动化脚本：`/private/tmp/fridge-automator/test-item-form-date-popup.js`
- 微信开发者工具自动化复验通过 16 项断言：
  - 品类按钮数量正确
  - 添加页不再显示单位按钮
  - 添加页不再显示存放位置按钮
  - 品类按钮宽度收在三列卡片内
  - 初始状态不显示日期弹窗
  - 点击生产日期后弹出日历窗口
  - 日历弹窗没有关闭按钮
  - 日历弹窗保留上月和下月按钮
  - 上月下月按钮已缩小
  - 年月标题保持单行高度
  - 选择生产日期后日历弹窗自动关闭
  - 选择生产日期后表单生产日期更新
  - 可以找到直接选过期日切换按钮
  - 点击过期日期后弹出日历窗口
  - 选择过期日期后日历弹窗自动关闭
  - 选择过期日期后表单过期日期更新

本轮已尝试但失败 / 修正的方案：

- 第一版把日历直接内嵌到添加页，真机截图显示页面过长且视觉混乱，已改为底部弹窗日历。
- 第一版品类按钮在真机上横向溢出，已改为固定三列并限制宽度。
- 第一轮自动化验证发现“上月 / 下月”按钮真实宽度仍偏大，已继续缩小按钮并加 `flex` 限制后复验通过。
- 首次运行自动化脚本因沙盒限制无法监听本地端口，改用授权后的开发者工具自动化端口运行。
- 自动化复验时端口 `9451` 被上一轮开发者工具进程占用，临时脚本改用 `9452` 复验。

当前还没解决的问题：

- 还没有做真机手动复查，仍建议在真实手机上看添加页品类按钮、日期弹窗和保存流程。
- 日期弹窗目前只支持上月 / 下月逐月切换，暂未做年份快速选择。
- 添加页移除了数量、单位和存放位置入口后，旧食品编辑时这些字段会保留，但页面不再直接修改它们。

下一步建议：

- 真机预览添加食品页，重点点选“生产日期”和“过期日期”，确认底部日历弹窗高度、按钮大小和日期格子触控是否舒服。
- 从首页冰箱分区进入添加页，新增食品后回首页确认食品仍归入正确分区。
- 编辑一条旧食品，确认名称、品类、日期、备注能改，原有数量 / 单位 / 存放位置不会被意外清空。
- 如果真机反馈逐月切换日期太慢，再考虑补一个更轻的年月选择入口。
- `items` 组合索引已在云开发控制台确认存在，不需要重复创建。

## 2026-05-22 items 组合索引确认

本轮完成：

- 登录腾讯云 CloudBase 新版控制台。
- 进入环境 `cloud1-d3g4v0ms8ee56bd94`。
- 进入文档型数据库实例 `tnt-oibn6527o`。
- 进入集合 `items` 的“索引管理”页。
- 确认目标组合索引已经存在，无需重复创建。

已确认索引：

- 索引名称：`openid_expire_created`
- 索引属性：非唯一
- 索引字段：
  - `_openid` 升序
  - `expireDate` 升序
  - `createdAt` 降序

本轮注意：

- 微信开发者工具 CLI 仍未提供数据库索引管理命令。
- 微信开发者工具内嵌云开发控制台曾卡在加载页，最终通过 Chrome 打开新版 CloudBase 控制台完成确认。

## 2026-05-23 README 主线说明对齐

本轮完成：

- 将 `README.md` 从 React/Vite 模板说明改为“冰箱管家微信小程序”项目说明。
- README 现在明确当前主线是微信小程序原生开发，不是旧 React/Vite H5。
- README 补充了当前功能、技术栈、CloudBase 资源、本地运行方式、验证命令和当前不做事项。
- README 明确旧 H5 文件仍保留，但不是当前开发主线，后续如需清理必须逐个确认。

本轮修改文件：

- `README.md`

当前还没解决的问题：

- 旧 React/Vite 文件仍保留，后续是否清理仍待确认。

已尝试但失败的方案：

- 本轮没有失败尝试。

下一步建议：

- 在真机或微信开发者工具中继续复查首页冰箱模板热区和添加页日期弹窗。

## 2026-05-23 Git 初始化和版本管理边界

本轮完成：

- 在 `/Users/qzt/Desktop/projects/fridge-app` 初始化独立 Git 仓库。
- 收紧 `.gitignore`，明确忽略依赖、构建产物、本地环境变量和微信开发者工具私有配置。
- 确认以下内容不会进入 Git：
  - `node_modules/`
  - `dist/`
  - `project.private.config.json`
- 检查敏感配置风险，当前只发现已记录的微信小程序 AppID 和 CloudBase 环境 ID，没有发现 `.env` 文件或 API 密钥类配置。
- 将当前小程序代码、文档、配置和保留的旧 H5 文件一起纳入第一次 Git 基线提交。

本轮修改文件：

- `.gitignore`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `DECISIONS.md`

当前还没解决的问题：

- 旧 React/Vite H5 文件仍保留，不是当前主线；后续是否逐个归档或删除仍需单独确认。
- 尚未做新一轮运行体检；本轮目标是版本管理和项目状态收尾。

已尝试但失败的方案：

- 首次 `git init` 因目录权限限制失败，随后在用户授权后完成初始化。

下一步建议：

- 完成第一次 Git 基线提交后，再进入第二轮运行体检。
- 第二轮优先用微信开发者工具和真机预览确认首页、添加页、分区热区、CloudBase 写入和 mock 流程。

## 2026-05-23 第二轮运行体检

本轮完成：

- 完成静态检查：
  - 小程序 JS、service、utils、云函数 `node --check` 全部通过。
  - `npm run lint` 通过。
  - `npm run build` 通过；该命令仍是旧 Vite 兼容检查，不代表当前主线是 H5。
- 完成小程序结构检查：
  - 15 个 JSON 文件可解析。
  - 7 个页面的 `js/json/wxml/wxss` 文件完整。
  - `project.config.json` 中 `miniprogramRoot: "./"` 和 `cloudfunctionRoot: "cloudfunctions/"` 指向有效。
- 完成微信开发者工具自动化 smoke test：
  - 首页能加载当前冰箱模板。
  - 分区热区和统计卡片数量与配置一致。
  - 点击分区能打开分区面板。
  - 添加页能接收分区传入的存放位置。
  - 空表单校验能提示食品名称和过期日期。
  - 解析确认页、日历页、菜谱页、我的页均可打开并初始化。
  - 自动化截图：`/private/tmp/fridge-automator/current-smoke-index.png`
- 完成完整 CloudBase 流程验收：
  - 手动添加食品可以写入 CloudBase。
  - 编辑食品后首页能显示新名称。
  - 搜索结果能找到编辑后的食品。
  - 删除食品后有正确提示。
  - mock 解析确认保存后 `source` 为 `photo`。
  - mock 解析确认保存后 `parseStatus` 为 `manual_confirmed`。
  - 本轮临时测试数据已清理。

本轮修改文件：

- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮临时文件：

- `/private/tmp/fridge-automator/current-smoke-check.js`
- `/private/tmp/fridge-automator/current-smoke-index.png`
- `/private/tmp/fridge-automator/full-flow-check.js`

当前还没解决的问题：

- 还没有做真机手动预览；模拟器和自动化已通过，但真实手机尺寸和触控手感仍需人工确认。
- `node_modules` 里有旧 H5 依赖残留的 extraneous 包；不影响当前小程序运行，后续可单独做依赖清理。
- 旧 React/Vite H5 文件仍保留，不是当前主线；后续是否归档或删除仍需单独确认。

已尝试但失败的方案：

- `npm prune --dry-run` 仍尝试写入 `node_modules/.package-lock.json`，因系统权限返回 `EPERM`，本轮未继续清理依赖目录。

下一步建议：

- 优先做真机预览，重点看首页一屏布局、冰箱图片清晰度、分区热区、统计卡片位置、添加页日期弹窗和按钮触控。
- 真机确认后，再决定是否微调 `utils/constants.js` 中冰箱热区和门架 `markerPoint`。
- 之后再单独评估旧 H5 文件和旧依赖目录是否逐个归档或清理。
