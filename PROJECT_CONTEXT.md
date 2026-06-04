# PROJECT_CONTEXT.md

最后更新：2026-06-04

## 当前项目目标

本项目当前主线已经从原来的 React/Vite H5，切换为微信小程序项目。

项目名称：冰箱小雷达
项目目录：`fridge-app`  
产品方向：冰箱食品饮料库存管理

品牌同步说明：

- 2026-05-31 已确认正式产品名为「冰箱小雷达」。
- 小程序可见标题、项目入口文档、关于页、AI 提示词和宣传物料搜索口径已统一。
- 「冰箱雷达」「冰箱管家」只作为历史阶段名称保留在旧记录中。

当前阶段目标是完成第一阶段 MVP：

- 用户可以手动添加冰箱食品饮料
- 首页通过可 DIY 的分区货架查看库存、过期状态、统计和搜索
- 支持编辑、删除食品
- 数据保存到微信云开发 CloudBase 云数据库
- 每条食品数据绑定当前用户 `_openid`
- 日历页显示到期食品，并在日历下方直接承接临期 / 过期食材去化
- 菜谱页固定为 AI 菜谱体验页，已接入云函数真实 AI 路径和腾讯实时天气；菜谱盲盒 / 我来选食材不再使用本地菜谱结果兜底
- 拍食品已接入智谱视觉模型直看图片；拍包装、拍购物小票走腾讯云 OCR + CloudBase/Hunyuan 结构化；条形码扫描模块已从用户入口移除；所有识别结果仍必须经过确认页后保存

## 下一版本规划入口

第一版已经提交审核并上线，后续版本规划优先参考：

- `NEXT_VERSION_GUIDE.md`

该文档用于持续记录下一版本优化方向，当前重点是：

- 上线后稳定性
- 图片资源治理
- 菜谱图按标签共用，不按每道菜维护
- 图片资料库云存储化
- 用户拍照图片和孤儿图片的云存储清理策略
- 主包体积控制，避免继续逼近微信小程序 2MB 主包限制

后续每次开始新版本前，先读 `NEXT_VERSION_GUIDE.md`，再结合 `TODO.md` 和 `DECISIONS.md` 选择本轮最小可交付范围。

## 当前技术栈

- 微信小程序原生开发
- 原生 JavaScript
- WXML
- WXSS
- 微信云开发 / CloudBase
- 云数据库集合：`items`、`reminders`、`parseLogs`、`fridgeZoneConfigs`、`recipeRecords`
- 云函数：`getOpenId`、`parseFoodImage`、`parseBarcode`、`generateRecipes`、`sendExpiryReminders`

当前不使用：

- Vercel
- Supabase
- React H5 作为主线
- Next.js
- 独立后端服务器
- 登录页
- 独立前端直连真实 OCR / 条形码商品库 / AI API
- 前端直连真实天气 API
- 前端保存或暴露 API key
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
  - `fridgeZoneConfigs`
- `items`、`reminders`、`parseLogs` 权限按仅创建者可读写使用
- `fridgeZoneConfigs` 已创建，权限已在 CloudBase 控制台确认为“仅创建者可读写”

## 当前已完成功能

### 页面

- `pages/index`：首页冰箱分区视图、统计、搜索和弹窗清单
- `pages/item-form`：添加 / 编辑食品
- `pages/quick-add`：独立智能录入入口
- `pages/parse-confirm`：单个解析结果确认页
- `pages/batch-parse-confirm`：小票批量解析结果确认页
- `pages/calendar`：小程序内日历页、临期去化卡片推荐
- `pages/recipes`：AI 菜谱体验页

说明：

- `pages/profile` 文件暂时保留在目录中，但当前已不再注册为小程序页面，也不再出现在底部 Tab。

### 首页

- 首页当前已从冰箱实物图热区改为分区货架展示
- 首页顶部展示吉祥物状态卡、全局三项统计和搜索框
- 首页保留“确定放哪 / 不确定放哪”添加引导
- 首页分区本身只作为“添加食材到该分区”的入口
- 首页展示用户启用并排序后的标准分区：
  - 冷藏区
  - 冷冻区
  - 门上储物格
  - 果蔬抽屉
  - 变温区
- 每个分区显示标题、温度标签、`总 / 临 / 过` 统计、横向食品卡片和添加提示
- 点击分区空白、标题或加号会弹出添加方式面板：
  - 手动添加
  - 拍食品
  - 拍包装
- 点击分区 `总 / 临 / 过` 统计会打开当前分区对应清单
- 点击食品图片会打开食品详情面板，可查看、编辑、删除
- 食品卡片使用本地食材图片或拍照图片作为主视觉，文字区按状态三色区分：正常绿色、临期黄色、已过期红色
- 拍食品会上传照片到 CloudBase 云存储并保存 `imageFileId`，首页优先显示照片
- 手动、包装、小票来源使用本地品类图片缩略图；条形码来源仅保留历史数据兼容
- 分区 DIY 配置保存到 `fridgeZoneConfigs`
- 首次无配置时弹出分区 DIY 面板，可启用 / 隐藏和排序 5 个标准分区
- 首页提供轻量“分区”入口用于重新配置
- 已取消冰箱类型选择

历史说明：

- 第一栏曾固定展示默认冰箱模板图，默认是“三门冰箱”
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
- 分区清单内可手动添加食品到当前分区
- 分区清单内可拍食品、拍包装，并默认带入当前分区
- 首页“我的冰箱”标题右侧提供“智能录入”入口，用于不预选分区的拍食品、拍包装和小票批量录入
- 首页已取消冰箱类型选择，固定使用默认“三门冰箱”模板
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

- 当前主要显示字段：
  - 食品名称
  - 品类
  - 生产日期
  - 保质期天数
  - 过期日期
  - 存放分区
  - 备注
- 数量和单位不再作为添加 / 识别确认的用户必填项，保存时继续写入兼容默认值：
  - `quantity: 1`
  - `unit: "份"`
- 存放分区只使用当前 5 个标准分区：冷藏、冷冻、门架、果蔬抽屉、变温
- 历史数据中的 `其他` 存放位置会在读取时归一到有效分区，避免首页和日历统计对不上
- 生产日期 + 保质期天数可自动计算过期日期
- 过期日期仍可手动修改
- 品类、存放分区支持直接点选，不再必须打开系统 picker
- 已选品类、存放分区会高亮显示
- 智能录入里的手动输入会进入带推荐分区的添加页，用户可采纳推荐分区后保存
- 表单会对食品名称、保质期天数、过期日期做字段级校验
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
- 日历功能下方新增“临期去化”
- 临期去化展示今日到期、3 天内到期、7 天内到期、已过期数量
- 临期统计卡片可点击查看对应清单，但卡片内不显示“查看清单”小字
- 临期去化列出优先处理食材
- 临期食品会直接生成 3 道优先消耗菜谱卡片
- 去化菜谱卡片展示已有食材、缺少食材、可直接做 / 还差几样、建议优先用掉、耗时、难度和标签
- 已过期食品只做安全检查和丢弃提醒，不默认推荐为可食用菜谱
- 第一阶段不接系统日历

### 菜谱页

- 当前定位为 AI 菜谱体验页。
- 顶部顺序为城市天气卡、雷达建议、我的收藏、菜谱盲盒 / 我来选食材切换。
- 天气信息通过 `generateRecipes` 云函数读取腾讯实时天气；前端不保存腾讯位置服务 key。
- 雷达建议通过 `scene: "climateRadar"` 独立生成，只结合城市、天气、温湿度、节气、地域饮食特征和中医食养方向，不重复天气卡里的数字。
- 雷达建议已改为今日全天饮食建议，不再区分早餐、午餐、晚餐或夜间轻食。
- 进入菜谱页后，下方默认保持空白，不自动展示“临期去化攻略”。
- 菜谱页当前只保留“菜谱盲盒”和“我来选食材”两个入口。
- “菜谱盲盒”不读取冰箱库存，只按当前城市、天气、节气和气候食养方向调用云端 AI 生成 3 道应季养生家常菜。
- “我来选食材”只围绕料理碗里的库存 / 临时食材调用云端 AI 生成 3 道菜。
- 菜谱盲盒和我来选食材云端失败时不再回退本地菜谱结果，只展示等待或失败提示。
- AI 菜谱步骤要求更详细，包含备菜、切配、火候、时间、熟度判断、出锅状态和替代建议。
- 食材 chip 只显示食材名，不显示数量；数量和克重可以出现在详情步骤里。
- 支持点击菜谱卡查看详情，展示食材、步骤和安全提示。
- 支持“我来选食材”半屏弹窗：
  - 保留功能名称“我来选食材”
  - 使用奶油陶瓷料理碗视觉承载已选食材
  - 可从冰箱库存点选未过期食材
  - 可搜索库存食材
  - 可输入任意临时食材参与本次推荐
  - 临时食材不自动写入 `items`
  - 生成后可跳转添加页，预填临时食材名称，由用户补齐到期日后保存
  - 生成结果会保留到用户点击“清空”，切页面不会重新生成
  - 菜谱盲盒按“当天 + 城市”缓存，每个城市每天首次点击时生成一次
- 当前不做真实联网搜索；真实 AI 和真实天气只通过云函数调用。

### 智能录入识别流程

- 拍食品入口会打开相机 / 相册，上传图片到 CloudBase 云存储后调用 `parseFoodImage`
- 拍食品优先走智谱视觉模型直看图片，失败时回退 mock / 待确认结果
- 拍包装入口会打开相机 / 相册，上传图片后走腾讯 OCR + CloudBase/Hunyuan 结构化，失败时回退 mock / 待确认结果
- 拍购物小票入口会打开相机 / 相册，上传图片后走腾讯 OCR + CloudBase/Hunyuan 批量结构化，失败时回退 mock / 待确认结果
- 条形码扫描入口已移除，当前不再作为用户录入方式
- 单个解析结果进入 `pages/parse-confirm`
- 小票批量解析结果进入 `pages/batch-parse-confirm`
- 单品会显示推荐分区；从冰箱分区进入时默认使用当前分区，用户可采纳推荐分区
- 小票批量确认页每条食品可单独勾选、修改名称、品类、过期日期和存放分区
- 小票批量确认页保留手动补充添加入口，用于识别漏项时继续追加食品
- 用户确认后才保存到 `items`
- `parseLogs` 会记录解析日志

### fridgeZoneConfigs

用于保存首页分区 DIY 配置。

```ts
type FridgeZoneConfig = {
  _id: string;
  _openid: string;
  zones: Array<{
    key: "cold" | "freeze" | "door" | "produce" | "temp";
    enabled: boolean;
  }>;
  createdAt: number;
  updatedAt: number;
};
```

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
  storageLocation: "冷藏" | "冷冻" | "门架" | "果蔬抽屉" | "变温";
  note?: string;
  source: "manual" | "photo" | "barcode" | "package" | "receipt";
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

用于记录拍食品、包装、小票识别日志；条形码历史日志仅用于兼容旧数据。

### recipeRecords

用于保存菜谱收藏记录，按当前用户 `_openid` 隔离。

已配置组合索引：

- `openid_created_desc`：`_openid` 升序、`createdAt` 降序
- `recipeKey_openid`：`recipeKey` 升序、`_openid` 升序

### 本地缓存

- `fridge_recipe_picker_cache_v2`
  - 当前缓存版本：3
  - 用于保存最近一次“我来选食材”生成结果
  - 保存内容包括已选库存食材 ID、临时食材、云端菜谱、气候上下文、状态文案和保存时间
  - 只使用 `wx.setStorageSync`，不写入 CloudBase
  - 用户点“清空”时清除，切页面或切换入口不清除
- `fridge_recipe_blind_box_cache_v1`
  - 当前缓存版本：5
  - 用于保存当天某个城市第一次点击“菜谱盲盒”生成的 3 道菜
  - 缓存 key 带日期和城市，避免上海、广州、长沙等城市结果串用
- `fridge_recipe_climate_cache_v1`
  - 当前缓存版本：5
  - 用于保存当天某个城市的天气上下文和雷达建议
  - 城市变化后会按城市重新读取或生成
- `fridge_calendar_radar_recipe_cache_v1`
  - 用于保存日历页当天第一次进入“开饭雷达”生成的云端 AI 菜谱
  - 当天重复进出日历页不重复调用 AI

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
  - `parseFoodPhoto`
  - `parsePackagePhoto`
  - `parseReceiptPhoto`
  - `normalizeParseResult`
  - `calculateExpireDate`
- `services/reminderService.js`
  - `createReminder`
  - `cancelReminder`
  - `getCalendarEvents`
  - `requestSubscribeMessage`
- `services/recipeService.js`
  - `getAIRecipeRecommendations`
  - `getExpiryUsageRecommendations`
  - `getBlindBoxRecommendation`
  - `getMockRecommendationContext`
  - `getRecipeRecommendations`
  - `ruleBasedRecipes`

页面不要直接堆复杂数据库逻辑，新增业务逻辑优先放到 service 层。

## 云函数状态

已部署成功：

- `getOpenId`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

说明：

- `parseFoodImage` 已部署真实识别路径：
  - 拍食品：优先走智谱 `glm-4.6v-flash` 视觉模型直接识别图片
  - 拍包装 / 小票：走腾讯 OCR + CloudBase/Hunyuan 结构化，使用已领取的混元额度
  - 拍食品的 DeepSeek `v4-flash` 仅作为 OCR / 图片标签文字整理备用
  - 真实服务不可用、OCR 和标签均为空或识别失败时回退 mock / 待确认结果
- `parseBarcode` 云函数文件和历史部署暂时保留，但小程序用户入口已移除，不再主动调用
- `generateRecipes` 已部署 CloudBase AI 菜谱生成路径；模型额度 / 频率受限时回退 mock
- `sendExpiryReminders` 第一阶段只保留结构，不实际发送订阅消息

## 本轮完成内容

### 2026-05-28 删除条形码扫描用户入口

- 按用户决策移除条形码扫描模块的用户入口。
- 智能录入页入口从“拍包装/条码”改为“拍包装”。
- 首页分区添加面板入口从“拍包装/条码”改为“拍包装”。
- 首页智能录入引导文案从“拍照或扫码”改为“拍照识别”。
- `services/parseService.js` 移除前端扫码调用链：
  - `scanBarcode`
  - `parseByBarcode`
  - `scanAndParseBarcode`
  - 条码 mock 预填导出
- `utils/constants.js` 移除 `SOURCE_LABELS.barcode`。
- `items.barcode` 字段暂时保留，用于兼容历史数据。
- `cloudfunctions/parseBarcode` 本地目录和云端历史函数暂时保留，本轮未做物理删除。

本轮修改文件：

- `pages/quick-add/quick-add.js`
- `pages/quick-add/quick-add.wxml`
- `pages/index/index.js`
- `pages/index/index.wxml`
- `services/parseService.js`
- `utils/constants.js`
- `README.md`
- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `DECISIONS.md`

下一步建议：

- 真机确认智能录入页不再出现条码 / 扫码入口。
- 真机确认首页分区添加面板只保留拍食品、拍包装、手动添加。
- 如果未来确认彻底不恢复条码扫描，再单独逐个删除 `cloudfunctions/parseBarcode` 本地文件，并在云端删除历史函数。

### 2026-05-28 真实拍照识别模型路由与 Loading 修复

- `parseFoodImage` 云函数已配置真实模型路由：
  - 拍食品使用智谱 `glm-4.6v-flash` 直接看图
  - 拍包装 / 小票使用腾讯 OCR + CloudBase/Hunyuan 结构化
  - DeepSeek `v4-flash` 只作为拍食品文字整理备用，不再处理包装和小票
- 已将智谱 API key 配置到 CloudBase 云函数环境变量，未写入前端或代码仓库
- 已清理包含云函数环境变量的 `/private/tmp` 临时配置文件
- 同一张真机上传的杨梅照片云端验证通过，返回：
  - `name: 杨梅`
  - `category: 水果`
  - `providerStatus: real`
- 修复智能录入 Loading 时机：
  - 弹出“拍摄 / 从手机相册选择”时不再提前显示“识别中”
  - 用户拍完或选完图片后，开始上传和云函数识别时才显示“识别中”
  - 识别中使用 `mask: true`，避免用户误点
  - 用户取消拍摄时不显示失败提示
- 已生成并由用户真机验证最新预览二维码：
  - `/private/tmp/fridge-preview-loading-fix-20260528.png`

本轮修改文件：

- `cloudfunctions/parseFoodImage/index.js`
- `services/parseService.js`
- `pages/quick-add/quick-add.js`
- `pages/index/index.js`

本轮验证：

- `node --check cloudfunctions/parseFoodImage/index.js`
- `node --check services/parseService.js`
- `node --check pages/quick-add/quick-add.js`
- `node --check pages/index/index.js`
- `npm run lint`
- `git diff --check`
- CloudBase 云函数部署成功
- 云端直接调用 `parseFoodImage` 识别杨梅图成功
- 用户真机验证 Loading 时机修复成功

当前还没解决的问题：

- 智谱视觉识别一次真实调用约十几秒，Loading 已修复但仍需继续观察真机等待体感。
- 包装和小票已切到 Hunyuan 路由，但还需要继续用真实包装、小票照片做真机验收。
- 条形码扫描模块已从用户入口移除，当前不再作为上线前验证项。
- 菜谱生成已接入 CloudBase AI 路径，但仍需继续观察混元额度、429 和 mock 兜底表现。

下一步建议：

- 真机各拍 1 张包装和 1 张购物小票，确认是否进入确认页、字段是否可编辑、保存后库存是否正常显示。
- CloudBase 控制台查看 `parseFoodImage` 日志，确认不同入口的 `providerStatus` 和 `fallbackReason` 可读。
- 上线前为智谱和腾讯云密钥准备生产专用 key，避免继续使用开发期 key。

### 2026-05-28 添加流程简化、分区归一和日历库存修复

- 所有添加 / 识别确认流程不再要求用户填写数量和单位。
- `items` 数据结构仍保留 `quantity` 和 `unit`，保存时继续写入默认值 `1 / 份`，保证历史数据和页面兼容。
- 存放分区收敛为 5 个标准分区：
  - 冷藏
  - 冷冻
  - 门架
  - 果蔬抽屉
  - 变温
- 存放分区不再提供 `其他` 选项；食品品类仍保留 `其他`。
- 历史库存中 `storageLocation: "其他"` 的食品会在读取时归一到有效分区，避免日历库存和首页分区统计对不上。
- 智能录入里的手动输入改为进入带“推荐分区”的添加页，而不是直接进入普通手动添加。
- 单品确认页和小票批量确认页的“采纳推荐”按钮已做居中处理。
- 小票批量确认页保留手动补充添加入口，便于识别漏掉食品时继续补录。
- 日历页 `库存 / 临期 / 过期` 弹窗清单新增删除入口，用户可以在日历库存清单中直接删除食品。
- 分区管理弹窗优化：
  - 显示 / 删除按钮和拖动触摸区分开，减少点不到的问题
  - 单指按住分区主体可上下拖动排序
  - 拖动时增加轻触震动反馈
  - 保存分区设置按钮位置重新调整，避免贴边
- 明确不引入 `shadcn/ui` 或 Storybook。它们适合 React/Web 项目，不适合当前微信小程序原生 WXML/WXSS 主线。

本轮修改文件：

- `pages/quick-add/quick-add.js`
- `pages/quick-add/quick-add.wxml`
- `pages/item-form/item-form.js`
- `pages/item-form/item-form.wxml`
- `pages/item-form/item-form.wxss`
- `pages/parse-confirm/parse-confirm.js`
- `pages/parse-confirm/parse-confirm.wxml`
- `pages/parse-confirm/parse-confirm.wxss`
- `pages/batch-parse-confirm/batch-parse-confirm.js`
- `pages/batch-parse-confirm/batch-parse-confirm.wxml`
- `pages/batch-parse-confirm/batch-parse-confirm.wxss`
- `pages/index/index.js`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `services/itemService.js`
- `services/zoneConfigService.js`
- `utils/constants.js`

本轮验证：

- `node --check services/itemService.js`
- `node --check services/zoneConfigService.js`
- `node --check pages/index/index.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/item-form/item-form.js`
- `node --check pages/parse-confirm/parse-confirm.js`
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具 CLI 预览编译通过，最新二维码：
  - `/private/tmp/fridge-preview-zone-fixes-20260528.jpg`

当前还没解决的问题：

- 分区拖动仍需要用户在真机上继续确认手感是否足够顺滑。
- 日历库存弹窗删除食品已完成代码和编译验证，但还需要真机确认删除后弹窗关闭、库存统计刷新是否符合预期。
- 历史 `其他` 分区数据当前只在读取展示时归一，不会主动批量改写数据库，避免未经确认批量修改用户数据。

下一步建议：

- 扫描最新预览码，重点测试分区管理显示 / 删除 / 拖动、日历库存弹窗删除、智能录入手动推荐分区、小票手动补充添加。
- 真机确认无误后，再考虑是否把历史 `其他` 数据做一次用户确认后的单条迁移。

### 2026-05-28 “我来选食材”料理碗与本地缓存

- 保留功能名称“我来选食材”，不改成“小锅”或其他名称
- 将“我来选食材”半屏弹窗升级为料理碗式选材体验
- 已选食材使用奶油陶瓷料理碗视觉展示，去掉第一版粗糙的锅盖、把手和蒸汽
- 支持从冰箱库存点选未过期食材加入料理碗
- 支持搜索库存食材
- 支持输入任意临时食材参与本次菜谱生成
- 临时食材默认品类为“其他”，只参与本次推荐，不自动写入 CloudBase
- 生成后如包含临时食材，会提示可加入库存；点击后跳转添加页并预填食品名称和品类
- 添加 / 编辑页支持从 URL 读取 `name` 和 `category` 作为新增食品默认值
- “我来选食材”生成结果新增当天本地缓存：
  - 切走菜谱页再回来会恢复本次选材和推荐
  - 点“清空”会删除缓存
  - 切到“菜谱盲盒”会删除缓存
  - 第二天自动失效
- 本轮不新增数据库集合、不改 `items` 结构、不改云函数、不接真实 AI

本轮修改文件：

- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `pages/item-form/item-form.js`

本轮验证：

- `node --check pages/recipes/recipes.js`
- `node --check pages/item-form/item-form.js`
- `node --check services/recipeService.js`
- `npm run lint`
- `npm run build`
- `git diff --check`

当前还没解决的问题：

- 尚未在微信开发者工具或真机上人工点验“我来选食材”的完整流程。
- 本地缓存只保存在当前设备；换设备、卸载重装或清理缓存后会丢失。
- 如果上线后需要跨设备保留生成记录，需要新增云端菜谱历史或草稿集合。

已尝试但失败 / 修正的方案：

- 曾先把旧锅样式直接改成料理碗样式，但用户要求“先弄出来让我看，确认了再改”；随后已撤回未确认代码，先生成视觉预览图，用户确认后再落地。
- 第一版“小锅”视觉过于直白，锅盖、把手、蒸汽显得粗糙；已改成厚白边、冰蓝内胆和奶油内层的料理碗。

下一步建议：

- 用微信开发者工具打开菜谱页，点验“我来选食材”：库存点选、搜索、临时食材、生成、切页恢复、清空、加入库存跳转。
- 真机检查料理碗高度、食材 chip 容量和搜索输入触控是否舒服。
- 上线前再决定是否从本地缓存升级为云端菜谱历史。

### 2026-05-28 奶油玩具冰箱风格重构

- 按用户新方向将视觉目标从“去拟物”修正为“高完成度玩具拟物”
- 统一全局色板为奶油背景、薄荷主色、冰蓝冰箱、蜂蜜橙 CTA、珊瑚红危险色
- 重写 `styles/tokens.wxss`，并保留旧变量别名，降低其他页面样式断裂风险
- 调整 `app.wxss` 和 `app.json`，导航栏、TabBar 和页面背景统一到奶油白体系
- 收敛 `styles/components.wxss` 和 `styles/fridge-theme.wxss`，按钮材质统一为软糖绿色、蜂蜜橙、白色胶囊和珊瑚危险色
- 首页顶部新增真实 PNG 吉祥物状态卡，保留分区管理、搜索和添加引导
- 首页冰箱材质重新分层：
  - 外壳：薄荷绿塑料
  - 内胆：冰蓝玻璃
  - 分区：半透明玻璃抽屉
  - 食材卡：白色小托盘
- 首页非拍照食品不再使用汉字圆圈作为主视觉，改为本地品类图片 fallback
- 食品详情弹窗复用同一图片逻辑，拍照来源仍优先显示 CloudBase 图片
- 菜谱页从报告式布局改成美食推荐布局：
  - 吉祥物 banner
  - 节气 / 季节 / 气温 / 湿度环境信息
  - 推荐 / 选食材 / 微醺 / 饮品四个入口
  - 带菜品图片的推荐卡
  - 换一批按钮
- `services/recipeService.js` 只给 mock 菜谱补充 `image` 字段，不改推荐算法、不改数据结构、不改云函数
- 新增本地 PNG 资产目录：
  - `images/mascot/`
  - `images/foods/`
  - `images/recipe/`
  - `images/decor/`
- 本轮没有新增页面、删除页面、修改数据库集合、修改云函数或接入真实外部 API

本轮修改文件：

- `app.json`
- `app.wxss`
- `styles/tokens.wxss`
- `styles/components.wxss`
- `styles/fridge-theme.wxss`
- `pages/index/index.js`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `services/recipeService.js`
- `images/mascot/*`
- `images/foods/*`
- `images/recipe/*`
- `images/decor/*`

本轮验证：

- `node --check app.js`
- `node --check pages/index/index.js`
- `node --check pages/recipes/recipes.js`
- `node --check services/recipeService.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具 CLI 预览编译通过
- 预览二维码：`/private/tmp/fridge-app-preview-qrcode-style-v2.png`
- 预览信息：`/private/tmp/fridge-app-preview-info-style-v2.json`
- 小程序预览包体大小：`1,904,964 bytes`，约 `1.8 MB`

当前还没解决的问题：

- 尚未做真机人工视觉验收，仍需在手机上确认首页冰箱层级、食材图片清晰度、菜谱卡片密度和弹窗触控体验。
- 新增图片资产后主包约 `1.8 MB`，低于 2MB 但已经需要关注；后续继续加图片前应优先压缩或考虑分包。
- 菜谱、食材和装饰图仍是本地 mock 资产，不代表真实菜品照片或真实 AI 生成内容。
- 真实 OCR、真实条形码商品库、真实 AI、真实天气和真实联网搜索仍未接入。

已尝试但失败 / 修正的方案：

- 首次生成的菜谱图里包含中文标签，但本地图片生成脚本字体渲染出现小方块；已改为移除图片内文字，只保留装饰色块和页面文本展示菜名。
- 首次微信开发者工具预览包体约 `2,087,827 bytes`，过于接近 2MB；已将吉祥物 PNG 从 512px 继续压缩到 384px，复测包体降到 `1,904,964 bytes`。

下一步建议：

- 先用微信开发者工具和真机预览检查首页、菜谱页、食品详情弹窗和选食材弹窗。
- 如果真机截图里首页仍显拥挤，下一轮优先微调 dashboard 高度、分区卡间距和食材卡尺寸。
- 如果菜谱卡片信息仍偏多，下一轮把“已有 / 缺少食材”进一步压缩，详情弹窗展示完整内容。
- 后续新增图片资产前先评估主包大小，必要时压缩图片或做分包，不要继续无控制堆图。

### 2026-05-24 AI 菜谱与临期去化体验版

- 日历页新增“临期去化”模块，放在日历功能下方
- 临期去化展示今日到期、3 天内到期、7 天内到期和已过期数量
- 临期统计卡片只显示数字和标题，不再显示“查看清单”小字；点击统计卡片仍可打开对应库存清单
- 临期去化列出 7 天内优先处理食材
- 临期去化直接生成 3 道优先消耗菜谱卡片
- 去化菜谱卡片展示已有食材、缺少食材、可直接做 / 还差几样、建议优先用掉、耗时、难度和标签
- 已过期食品不默认进入可食用菜谱，只展示安全检查和丢弃提醒
- 菜谱页改为“AI 菜谱”
- 菜谱页顶部新增“小光”健康 Tips 窗口，去掉绿色小字说明和搜索说明行
- 菜谱页 Tips 日期卡片使用短日期，不显示年份
- 菜谱页进入后下方默认空白，只有点选四个入口之一后才生成对应攻略内容
- AI 菜谱页读取冰箱库存并标记已有食材、缺少食材、可直接做 / 还差几样
- AI 菜谱页支持显示临期食材“建议优先用掉”
- AI 菜谱页支持菜谱详情弹窗
- AI 菜谱页支持“我来选食材”半屏弹窗，可选 1 到 5 个未过期库存食材重新生成推荐
- AI 菜谱页支持“菜品盲盒”“每日微醺时刻”“每日健康饮品”
- `services/recipeService.js` 扩展为统一推荐服务层，页面不直接堆复杂推荐逻辑
- `cloudfunctions/generateRecipes` 调整为 mock AI 返回结构，预留未来真实 AI / 天气 / 搜索接入点
- 本轮不新增数据库集合，不修改 `items` 数据结构，不接真实外部 API
- `app.globalData.recipePrefillItemIds` 仍保留为后续跨页带入食材的预留缓存，但当前日历页不展示“生成 AI 菜谱”按钮

本轮修改文件：

- `app.js`
- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.json`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `services/recipeService.js`
- `cloudfunctions/generateRecipes/index.js`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `DECISIONS.md`
- `BUG_NOTES.md`
- `README.md`
- `AGENTS.md`

本轮验证：

- `node --check app.js`
- `node --check pages/index/index.js`
- `node --check pages/item-form/item-form.js`
- `node --check pages/quick-add/quick-add.js`
- `node --check pages/parse-confirm/parse-confirm.js`
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check services/itemService.js`
- `node --check services/parseService.js`
- `node --check services/reminderService.js`
- `node --check services/recipeService.js`
- `node --check utils/constants.js`
- `node --check utils/date.js`
- `node --check utils/status.js`
- `node --check cloudfunctions/getOpenId/index.js`
- `node --check cloudfunctions/parseFoodImage/index.js`
- `node --check cloudfunctions/parseBarcode/index.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- `node --check cloudfunctions/sendExpiryReminders/index.js`
- 19 个严格 JSON 配置文件解析通过，`tsconfig*.json` 属于 JSONC，未按严格 JSON 解析
- `git diff --check`
- `services/recipeService.js` VM 抽样输出检查
- `npm run lint`
- `npm run build`

当前还没解决的问题：

- 本轮尚未跑微信开发者工具自动化 UI 断言。
- 已生成真机预览二维码：`/private/tmp/fridge-app-preview-qrcode-20260524-calendar-recipe-v2.png`
- 真机人工验收仍需用户扫描二维码后确认页面实际效果。
- AI 菜谱仍是 mock 体验版，不是真实 AI、真实天气或真实联网搜索。
- 菜谱库和盲盒卡池仍是小规模示例，需要后续继续扩充。

已尝试但失败 / 修正的方案：

- 直接用 `node -e "require('./services/recipeService')"` 抽样 service 失败，原因是旧 H5 `package.json` 使用 `"type": "module"`，直接 require 和微信小程序 CommonJS 运行环境不一致；已改用只读 VM 包装方式验证。
- 首次严格 JSON 扫描把 `tsconfig*.json` 也纳入，因 JSONC 注释报错；已改为只检查小程序实际 JSON 配置和 package 文件。

下一步建议：

- 用微信开发者工具打开日历页和 AI 菜谱页，手动点一遍统计清单、“我来选食材”“菜品盲盒”“每日微醺”“健康饮品”。
- 真机预览确认日历去化卡片密度、AI 菜谱默认空白状态、半屏弹窗高度、详情弹窗滚动和按钮触控。
- 真机确认后再决定是否压缩 AI 菜谱卡片信息，或给“可直接做 / 缺 1 样”增加筛选。

### 2026-05-24 拍照添加功能融合

- 首页“我的冰箱”标题右侧新增“智能录入”入口，进入 `pages/quick-add`
- 首页新增“确定放哪 / 不确定放哪”指示牌式入口：
  - 确定放哪：提示用户直接点冰箱分区
  - 不确定放哪：进入智能录入
- 分区弹窗里的单一“添加食品”改为三种分区内入口：
  - 手动添加：继续进入 `pages/item-form`，默认带入当前分区
  - 拍食品：打开相机 / 相册后进入单品确认页
  - 拍包装 / 条码：可选择扫码条形码或拍包装说明
- `pages/quick-add` 改为独立智能录入页，支持手动输入、拍食品、拍包装 / 条码、拍购物小票
- `pages/parse-confirm` 支持推荐分区展示和“采纳推荐”
- 智能录入里的手动输入会根据食品名称和品类更新 mock 推荐分区
- 新增 `pages/batch-parse-confirm`，用于小票多条食品批量确认和保存
- 小票批量确认页支持：
  - 每条食品勾选是否保存
  - 修改名称、数量、单位、品类、过期日期、存放位置
  - 查看推荐分区并一键采纳
  - 一次保存选中的多条食品
- `services/parseService.js` 扩展为：
  - 调用相机 / 相册或扫码入口
  - 返回拍食品、包装、条码、小票 mock 结果
  - 生成推荐分区
  - 使用临时缓存传递解析结果，避免 URL 携带大段 JSON
- `source` 扩展为 `manual | photo | barcode | package | receipt`
- 本轮验证通过：
  - `node --check pages/index/index.js`
  - `node --check pages/quick-add/quick-add.js`
  - `node --check pages/parse-confirm/parse-confirm.js`
  - `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
  - `node --check services/parseService.js`
  - `npm run lint`
  - `npm run build`

### 2026-05-24 取消“我的”入口和冰箱类型选择

本轮完成：

- 底部 Tab 从 `冰箱 / 日历 / 菜谱 / 我的` 调整为 `冰箱 / 日历 / 菜谱`。
- `app.json` 不再注册 `pages/profile/profile`，用户侧不再进入“我的”页。
- 首页不再读取本地 `selectedFridgeLayoutKey`。
- 首页固定使用 `DEFAULT_FRIDGE_LAYOUT_KEY` 对应的默认冰箱模板。
- `pages/profile` 文件暂时保留，但已移除其中“冰箱类型”选择 UI 和相关读取 / 写入逻辑。
- 本轮没有删除文件，避免扩大改动范围。

本轮修改文件：

- `app.json`
- `pages/index/index.js`
- `pages/profile/profile.wxml`
- `pages/profile/profile.wxss`
- `pages/profile/profile.js`

本轮验证通过：

- `node --check pages/index/index.js`
- `node --check pages/profile/profile.js`
- `app.json` JSON 解析检查
- `npm run lint`
- `npm run build`

当前还没解决的问题：

- `pages/profile` 相关文件仍保留在目录中，但当前不作为页面入口使用；后续如果确认彻底不需要，再按项目安全规则逐个文件处理。
- 真机上仍建议重新编译确认底部 Tab 只剩 `冰箱 / 日历 / 菜谱`。

下一步建议：

- 真机预览确认三 Tab 底部导航是否更清爽。
- 如果后续确实需要“设置”，不要恢复“我的”个人中心；建议单独做一个轻量设置入口，并只放必要功能。
- 如果未来做多冰箱，再重新设计冰箱切换或冰箱管理，不沿用本轮已取消的单机冰箱类型选择。

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
- 首页曾预留 `selectedFridgeLayoutKey` 作为冰箱类型选择缓存；该预留已在 2026-05-24 取消
- 首页不展示冰箱类型切换按钮；当前固定使用默认“三门冰箱”模板
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

- `app.json`
- `pages/profile/profile.wxml`
- `pages/profile/profile.wxss`
- `pages/profile/profile.js`
- `pages/index/index.js`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/quick-add/quick-add.js`
- `pages/quick-add/quick-add.wxml`
- `pages/quick-add/quick-add.wxss`
- `pages/parse-confirm/parse-confirm.js`
- `pages/parse-confirm/parse-confirm.wxml`
- `pages/parse-confirm/parse-confirm.wxss`
- `pages/batch-parse-confirm/batch-parse-confirm.js`
- `pages/batch-parse-confirm/batch-parse-confirm.wxml`
- `pages/batch-parse-confirm/batch-parse-confirm.wxss`
- `pages/batch-parse-confirm/batch-parse-confirm.json`
- `services/parseService.js`
- `utils/constants.js`

本轮文档收尾涉及：

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `DECISIONS.md`
- `README.md`

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
- 条形码扫描用户入口已移除，不再作为当前验收项
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
- 2026-05-24 拍照添加功能融合已通过：
  - `node --check pages/index/index.js`
  - `node --check pages/quick-add/quick-add.js`
  - `node --check pages/parse-confirm/parse-confirm.js`
  - `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
  - `node --check services/parseService.js`
  - `npm run lint`
  - `npm run build`
- 2026-05-24 AI 菜谱与临期去化最终 UI 调整已通过：
  - `node --check pages/calendar/calendar.js`
  - `node --check pages/recipes/recipes.js`
  - `node --check services/recipeService.js`
  - `node --check cloudfunctions/generateRecipes/index.js`
  - `git diff --check`
  - `npm run lint`
  - `npm run build`
  - 微信真机预览二维码已生成：`/private/tmp/fridge-app-preview-qrcode-20260524-calendar-recipe-v2.png`

## 当前还没解决的问题

- 奶油玩具冰箱风格本轮已通过微信开发者工具预览编译，但仍需要真机人工确认视觉和触控体验
- 新增图片资产后主包约 `1.8 MB`，后续继续加图前需要关注 2MB 主包限制
- 首页已改为分区 DIY 货架，不再使用冰箱模板热区作为当前主线
- `fridgeZoneConfigs` 集合已创建，权限已在 CloudBase 控制台确认为“仅创建者可读写”
- 临时云函数 `setupFridgeZoneConfigs` 只用于创建集合，当前仍留在云端；本轮在 CloudBase 控制台删除时连续失败，后续需要稍后重试或手动删除
- 多冰箱管理还没做；后续如果一个用户有两个及以上冰箱，再单独设计冰箱切换入口
- `pages/profile` 文件仍保留，但当前不注册页面、不出现在底部 Tab
- 拍食品已接入智谱视觉；包装和小票已接入腾讯 OCR + CloudBase/Hunyuan，但仍需要更多真实样本验证效果
- 真实条形码商品库当前不接入，条形码扫描入口已移除
- 真实 AI 菜谱推荐已接入云函数路径，但仍需要继续观察额度、429 和 mock 兜底表现
- 拍食品、拍包装、小票批量确认还需要继续用真机复查相机、确认页和保存体验
- 日历页临期去化卡片和 AI 菜谱两个入口仍需要继续真机人工确认
- 真实订阅消息提醒未接入
- 旧 React/Vite 文件还保留在目录里，后续如果确认不再需要，可以手动逐个清理
- 开发者工具服务端口为了本轮测试已开启，后续不用自动化时可以在微信开发者工具的安全设置里关闭
- `miniprogram-automator` 本轮仅临时安装在 `/private/tmp/fridge-automator`，没有写入项目依赖

## 下一步建议

优先建议：

- 用真机预览检查本轮“奶油玩具冰箱”视觉：奶油背景是否干净、冰箱外壳 / 内胆 / 抽屉层级是否清楚、食材图片是否比汉字占位更自然
- 用真机预览检查菜谱页：banner、菜谱盲盒、我来选食材、菜品图片卡、换一批、详情弹窗和选食材弹窗是否顺手
- 关注主包大小；后续新增图片资产前先压缩或评估分包
- 在微信开发者工具和真机上检查首页分区 DIY 货架、横向食品卡片和添加方式面板
- 重点复查分区 `总 / 临 / 过` 统计是否好点、食品图片详情面板是否好用
- 确认底部 Tab 是否只保留 `冰箱 / 日历 / 菜谱`，并观察是否比四 Tab 更清爽
- 如果后续需要设置入口，优先做轻量设置，不恢复“我的”个人中心
- 如果后续支持多个冰箱，再单独设计冰箱切换入口
- 检查新增 `变温` 位置在首页分区、添加页、编辑页、日历页、菜谱页的实际展示是否顺畅
- 用真机预览检查首页、添加页、分区统计、底部 Tab 的实际触控体验
- 用真机预览检查智能录入入口、分区内拍食品、拍包装、小票批量保存流程
- 用真机预览检查日历页临期去化卡片、统计清单弹窗和 AI 菜谱页默认空白状态
- 用真机预览点击“菜谱盲盒”和“我来选食材”，确认下方内容按入口生成且不自动显示临期去化
- 根据真机截图继续微调首页货架布局、分区统计按钮大小和触控面积

后续第二阶段：

- 拍食品图片上传到 CloudBase 云存储已完成；后续完善图片压缩、云存储清理和真实识别
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
  - 解析确认页、日历页、菜谱页等页面可打开并初始化；该记录来自当时版本，后续“我的”页入口已取消。
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

## 2026-05-24 首页分区 DIY 与集合创建

本轮完成：

- 首页从冰箱实物图热区改为分区货架展示。
- 顶部显示全局三色统计卡和搜索框。
- 保留“确定放哪 / 不确定放哪”添加引导。
- 分区本身只作为添加入口，点击后弹出手动添加、拍食品、拍包装 / 条码。
- 分区食品卡片支持横向滑动。
- 点击食品图片打开详情面板，可编辑和删除。
- 点击全局三色卡、分区 `总 / 临 / 过`、搜索确定仍打开对应清单。
- 新增 `果蔬抽屉` 独立存放位置。
- 新增 `services/zoneConfigService.js`，用于读取和保存首页分区 DIY 配置。
- 新增 CloudBase 集合 `fridgeZoneConfigs`。
- 拍食品流程会上传照片到 CloudBase 云存储并保存 `imageFileId`。

本轮修改文件：

- `pages/index/index.js`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/parse-confirm/parse-confirm.wxml`
- `pages/parse-confirm/parse-confirm.wxss`
- `services/parseService.js`
- `services/zoneConfigService.js`
- `utils/constants.js`
- `AGENTS.md`
- `README.md`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/index/index.js`
- `node --check pages/item-form/item-form.js`
- `node --check pages/parse-confirm/parse-confirm.js`
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
- `node --check services/parseService.js`
- `node --check services/zoneConfigService.js`
- `node --check utils/constants.js`
- `npm run lint`
- `npm run build`
- 微信开发者工具自动化通过首页分区货架行为检查：
  - 顶部统计存在
  - 搜索框存在
  - 添加引导保留
  - DIY 分区生成
  - 点击分区打开添加方式面板
  - 点击分区不会打开查看清单
  - 点击分区统计打开对应清单
- CloudBase 集合创建结果：
  - 集合名：`fridgeZoneConfigs`
  - 临时云函数返回：`{"ok":true,"created":true,"message":"created"}`

当前还没解决的问题：

- 临时云函数 `setupFridgeZoneConfigs` 已部署到云端用于创建集合，当前仍留在云端。
- 本轮已在 CloudBase 控制台尝试删除 `setupFridgeZoneConfigs`，但删除过程报 `socket hang up` / 卡在 99%，微信开发者工具 CLI 也没有删除云函数命令；后续需要稍后在控制台重试或手动删除。
- 还没有真机预览新首页货架样式，仍需检查横向滑动、分区添加面板、食品详情面板和分区 DIY 面板手感。
- `fridgeZoneConfigs` 集合权限已在 CloudBase 控制台确认为“仅创建者可读写”。

下一步建议：

- 真机预览新首页，重点看 5 个分区货架密度、横滑食品卡、三色信息区和添加方式面板。
- 进入首页首次配置分区，保存后重进小程序确认云端配置能恢复。
- 稍后到 CloudBase 控制台重试删除临时云函数 `setupFridgeZoneConfigs`。

## 2026-05-24 UI 风格迁移收尾

本轮完成：

- 按“年轻可爱风 + 轻拟物冰箱风”完成整体视觉换肤。
- 建立全局 UI 基础样式：
  - `styles/tokens.wxss`
  - `styles/components.wxss`
  - `styles/fridge-theme.wxss`
- `app.wxss` 引入全局 tokens 和通用视觉类，统一页面背景、卡片、按钮、输入框、状态色。
- `app.json` 可见产品名、导航栏颜色和原生 TabBar 颜色已同步为“冰箱雷达”风格。
- 首页分区外框升级为参考图方向的轻拟物冰箱内部效果：
  - 冰蓝内胆
  - 玻璃隔层
  - 透明抽屉质感
  - 软阴影和高光
- 首页“我的冰箱”下方的小字说明已移除。
- 添加 / 编辑页、智能录入页、单品识别确认页、小票批量确认页、日历页、菜谱页、保留的我的页均完成视觉统一。
- 本轮没有新增页面、没有删除页面、没有修改接口、没有修改数据库集合、没有修改字段。
- 当前最终不启用 custom TabBar，仍使用微信原生 TabBar，并通过浅薄荷底色和本地图标做轻量优化。

本轮修改文件：

- `app.json`
- `app.wxss`
- `styles/tokens.wxss`
- `styles/components.wxss`
- `styles/fridge-theme.wxss`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/item-form/item-form.wxss`
- `pages/quick-add/quick-add.wxss`
- `pages/parse-confirm/parse-confirm.wxss`
- `pages/batch-parse-confirm/batch-parse-confirm.wxss`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.wxss`
- `pages/profile/profile.wxml`
- `pages/profile/profile.wxss`

本轮验证：

- `node --check app.js`
- `node --check pages/index/index.js`
- `node --check pages/item-form/item-form.js`
- `node --check pages/quick-add/quick-add.js`
- `node --check pages/parse-confirm/parse-confirm.js`
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check pages/profile/profile.js`
- `node --check services/itemService.js`
- `node --check services/parseService.js`
- `node --check services/recipeService.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- `git diff --check`
- `npm run lint`
- `npm run build`
- 微信开发者工具中确认首页、日历页、菜谱页可以打开并显示。

当前还没解决的问题：

- 微信开发者工具 Console 里仍有一条历史存在的 `Error: timeout`，页面未白屏，首页 / 日历 / 菜谱均能显示；后续如要排查，应单独定位开发者工具运行时或云开发调用超时来源。
- `getSystemInfo` / HarmonyOS 相关提示是微信基础库警告，不是本轮 UI 改造问题。
- 轻拟物样式使用了较多渐变、阴影和少量伪元素，仍需真机预览检查低端机性能和小屏溢出。
- 当前只是原生 TabBar 轻量美化；微信原生 TabBar 的高度、圆角、底部安全区和悬浮胶囊效果无法用 WXSS 调整。如果要做参考图那种悬浮圆润底栏，需要单独确认后重新实现 custom TabBar。

下一步建议：

- 真机预览完整 UI，重点看首页冰箱分区框架、食品卡片横滑、底部弹窗、添加页表单、日历页临期去化、菜谱页四个入口。
- 如果真机上底部原生 TabBar 视觉仍不够贴近参考图，需要先重新确认是否接受 custom TabBar，再单独评估实现。
- 视觉稳定后再考虑低风险组件化，例如 `EmptyState`、`ExpiryBadge`，不要马上大规模抽组件。

## 2026-05-24 默认 TabBar 回退与图标优化收尾

本轮完成：

- 根据用户反馈，不再使用 custom TabBar，当前 `app.json` 未启用 `"custom": true`。
- 首页顶部导航已恢复为微信默认导航，不再使用 `navigationStyle: "custom"`。
- 微信原生 TabBar 保留 `冰箱 / 日历 / 菜谱` 三个入口。
- 原生 TabBar 增加本地图标资源：
  - `images/tabbar/fridge.png`
  - `images/tabbar/fridge-active.png`
  - `images/tabbar/calendar.png`
  - `images/tabbar/calendar-active.png`
  - `images/tabbar/recipe.png`
  - `images/tabbar/recipe-active.png`
- 原生 TabBar 背景从奶油白调整为浅薄荷底色，选中态继续使用绿色。
- 已删除三个 Tab 页面里用于 custom TabBar 选中态同步的 `getTabBar().setData(...)` 逻辑。
- `custom-tab-bar/` 目录当前仍保留在工作区但未启用；后续是否删除需要单独确认，不能批量删除。

本轮修改文件：

- `app.json`
- `pages/index/index.json`
- `pages/index/index.js`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxss`
- `images/tabbar/*.png`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/index/index.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `git diff --check`
- `npm run lint`
- `npm run build`
- 微信开发者工具中确认底部为微信原生 TabBar，并能显示本地图标。

当前还没解决的问题：

- 微信原生 TabBar 的高度、底部安全区、圆角、悬浮胶囊效果无法用 WXSS 调整。
- 如果用户后续仍希望减少底部大白边或实现参考图那种悬浮圆润底栏，只能重新确认后再启用 custom TabBar。
- `custom-tab-bar/` 目录未删除，避免违反项目“不要批量删除文件目录”的约束。

下一步建议：

- 真机预览底部 TabBar 图标清晰度、选中态颜色和文字可读性。
- 如果原生 TabBar 仍不能满足审美要求，再单独讨论是否重新做 custom TabBar，并明确它会改变底部导航实现方式。

## 2026-05-25 首页与日历页细节收尾

本轮完成：

- 首页顶部信息结构调整：
  - 可见标题统一为“我的冰箱”。
  - 原“冰箱雷达”和“我的冰箱”重复标题已收敛。
  - 首页顺序保持为三色统计卡、搜索栏、添加引导、冰箱分区。
- 首页分区交互调整：
  - 分区添加只集中在每个分区右上角 `+`。
  - 点击分区 `总 / 临 / 过` 统计只打开对应清单。
  - 分区标题下方的小字说明已移除。
  - 首页食品卡片下方的到期日期小字已移除。
- 首页分区添加弹窗调整：
  - 三个添加方式改为横版整行按钮。
  - 按钮左右拉满，左侧图标、中间标题和单行说明、右侧箭头。
  - 说明文字强制单行省略，避免跨行撑高。
- 智能录入页调整：
  - 删除“第一阶段提示”说明卡。
  - 四个录入方式改为横版整行按钮。
  - 按钮左右拉满，说明文字单行省略。
- 首页分区管理弹窗调整：
  - 右上角入口文案从“分区”改为“分区管理”。
  - 分区排序改为按住左侧“拖动”区域单指上下拖动。
  - 每个分区操作收敛为“显示”和“删除”两项。
  - “删除”只表示从首页隐藏分区，不删除食品数据或数据库字段。
  - 五个分区卡片全部直接展示，不再在弹窗内部滚动。
  - 保存按钮下移并居中放置。
- 日历页调整：
  - 删除选中日期标题条，例如 `2026-05-27 / 1 项到期`。
  - 保留临期统计卡：今日到期、3 天内、7 天内、已过期。
  - 去掉临期统计卡右侧的浅绿色装饰遮挡。
  - “上月 / 下月”从原生 `button` 改为普通 `view`，避免默认按钮样式遮挡月份。
  - 月份栏稳定为三段布局：左“上月”、中间月份、右“下月”。

本轮修改文件：

- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/index/index.js`
- `pages/quick-add/quick-add.wxml`
- `pages/quick-add/quick-add.wxss`
- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/index/index.js`
- `node --check pages/quick-add/quick-add.js`
- `node --check pages/calendar/calendar.js`
- `git diff --check`
- `npm run lint`
- `npm run build`

当前还没解决的问题：

- 本轮主要根据微信开发者工具截图调整视觉细节，没有做新的自动化截图比对。
- 首页 `pages/index/index.wxss` 仍然很大，后续继续改首页时需要小步处理，避免继续叠覆盖样式。
- 日历页月份栏这次经过多轮修正，当前截图反馈已确认正常，但后续类似调整应先使用更稳定的简单布局。

本轮教训：

- 不要在微信小程序里为了按钮间距轻易使用复杂绝对定位或挤压式 grid；尤其 `text` 和原生 `button` 容易受到小程序默认渲染影响。
- 截图里用户圈出的是具体目标区域时，应先复述“删的是哪一块、保留的是哪一块”，再动代码。
- 用户明确说“统计卡保留”后，应立即恢复被误删的统计卡，只删除遮挡装饰。
- UI 微调不能只凭 CSS 直觉反复试，应优先采用简单、稳定、可解释的结构。

## 2026-05-27 首页 / 日历 / AI 菜谱标注改造收尾

说明：

- 本节是 2026-05-27 的最新状态记录；如与 2026-05-25 的日历统计卡记录冲突，以本节为准。
- 本轮仍保持微信小程序原生技术栈，不接登录、数据库重构、支付、Docker、独立后端、真实 OCR、真实 AI、真实天气或联网搜索。

本轮完成：

- 首页：
  - 首页顶部三色统计卡已移出首页。
  - 首页继续保留“我的冰箱”、搜索、添加引导和冰箱分区。
  - 首页不再常驻展示 `库存 / 临期 / 过期` 三色统计。
- 日历页：
  - 日历面板下方新增从首页迁移来的三色统计卡：`库存 / 临期 / 过期`。
  - 日历页原先常驻的 `今日到期 / 3 天内 / 7 天内 / 已过期` 四项统计卡已被三色库存统计替换。
  - 三色统计卡点击后仍打开对应清单。
  - 删除“优先处理”区块。
  - `AI 去化推荐` 改为 `开饭雷达检测报告`。
  - 去化菜谱卡片精简：删除小标签、右侧状态、AI 说明、底部标签行。
  - 去化菜谱卡片可点击打开详情弹窗，展示食材匹配、推荐理由和做菜步骤。
- AI 菜谱页：
  - 顶部“小光”改为 2 × 2 字牌 `雷 / 达 / 建 / 议`。
  - 顶部日期信息改为节气信息，下方显示 `当日 / 还差 X 天 / 已过 X 天`。
  - 顶部饮食建议由 mock AI 提示词逻辑生成，结合中医饮食思路、当前节气、季节、气温和湿度。
  - 删除 `每日微醺时刻`、`每日健康饮品` 两个入口。
  - 保留 `菜谱盲盒` 和 `我来选食材` 两个入口。
  - `菜谱盲盒` 入口小字为“随机应季健康餐”。
  - `我来选食材` 入口小字为“指定库存生成菜谱”。
  - `菜谱盲盒攻略` 副标题为“不纠结，先抽一道今日推荐应季健康菜谱。”
  - 菜谱卡片左上角 `菜谱 1` 等序号标签已删除。
  - 菜谱卡片展示“推荐理由”，详情弹窗也展示推荐理由。
  - 菜谱盲盒推荐逻辑会结合冰箱库存、节气、季节、气温、湿度和雷达建议做 mock 排序与理由生成。
- `services/recipeService.js`：
  - 新增 mock AI 饮食建议提示词生成能力。
  - 新增 mock AI 饮食建议输出能力。
  - 新增结合库存和气候的菜谱推荐理由生成。
  - 仍不接真实 AI API；真实 AI 接入时应优先放到云函数或 service 层，不能把 API key 放小程序前端。

本轮修改文件：

- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `services/recipeService.js`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/index/index.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check services/recipeService.js`
- `git diff --check`
- `npm run lint`
- `npm run build`

当前还没解决的问题：

- 节气信息目前使用常见公历日期做本地近似计算，不是每年精确天文节气时刻。
- 菜谱页的“AI”仍是 mock AI / 规则生成，不是真实大模型调用。
- 本轮未做微信开发者工具自动截图比对；需要用户在开发者工具和真机预览中继续看实际视觉效果。
- `pages/index/index.wxss` 仍然偏大，后续继续改首页时应先局部清理，避免叠加覆盖样式。

已尝试但失败 / 需要记录的方案：

- 直接读取用户提供的 HEIC 标注图失败，需先转 PNG 查看。
- 第一次转换 HEIC 时受沙盒临时文件写入限制失败，后续通过受控权限转换成功。
- 菜谱页标注第一次理解不完整，漏改了 `菜谱盲盒`、入口说明、攻略标题、副标题和卡片序号标签；后续按用户逐条确认修正。

下一步建议：

- 在微信开发者工具中复查首页：确认顶部三色统计已消失，首页信息密度是否更清爽。
- 在微信开发者工具中复查日历页：确认日历下方是 `库存 / 临期 / 过期` 三色统计，并且点击清单正常。
- 在微信开发者工具中复查 AI 菜谱页：确认 2 × 2 雷达建议字牌、节气信息、两个入口、推荐理由和详情弹窗。
- 真机预览重点看菜谱页推荐理由是否过长、是否需要折叠或限制行数。

重要注意事项：

- 不要再按 2026-05-25 的“四项临期统计卡必须保留”作为最新日历页目标；2026-05-27 已确认替换为三色库存统计。
- 菜谱页当前不再展示 `每日微醺时刻` 和 `每日健康饮品` 入口。
- 中医饮食建议只能作为生活化饮食灵感，不做诊断、治疗或医疗功效承诺。

## 2026-05-28 GitHub 新仓库上传收尾

本轮完成：

- 重新检查当前最新代码库后，将项目上传到 GitHub 新仓库。
- GitHub 仓库已创建为私有仓库：
  - `https://github.com/zitao4588-create/fridge-app`
- 本地 Git 远程已设置：
  - `origin` -> `https://github.com/zitao4588-create/fridge-app.git`
- 本地 `main` 已推送并跟踪 `origin/main`。
- 上传前提交：
  - `a985244 feat: update fridge app mvp`
- 上传前将微信开发者工具预览产物加入 `.gitignore`：
  - `preview-info.json`
  - `preview-qrcode.png`
- 预览二维码和预览信息文件未进入 Git 提交。

本轮修改文件：

- `.gitignore`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `git diff --check`
- `node --check app.js`
- `node --check pages/index/index.js`
- `node --check pages/item-form/item-form.js`
- `node --check pages/quick-add/quick-add.js`
- `node --check pages/parse-confirm/parse-confirm.js`
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check services/parseService.js`
- `node --check services/recipeService.js`
- `node --check services/zoneConfigService.js`
- `npm run lint`
- `npm run build`

当前还没解决的问题：

- Git 提交作者仍是本机默认值：`qzt <qzt@qztdeMacBook-Air.local>`；不影响当前上传，但后续建议配置正式 Git 用户名和邮箱。
- GitHub 仓库当前为私有仓库；如果后续要公开，需要先确认 AppID、CloudBase 环境 ID 和项目文档中公开信息是否可接受。
- 本轮只完成 GitHub 上传，没有做新的微信开发者工具真机预览。

已尝试但失败 / 修正的方案：

- 第一次 `gh auth login` 曾卡在交互流程，后改用设备验证码方式登录。
- 旧 GitHub CLI token 已失效，第一次授权后仍被旧 token 影响；已先 `gh auth logout` 清除旧记录，再重新登录成功。
- 普通沙盒下 `gh auth status` 显示 token 无效；通过联网授权检查确认 keyring 中的新 token 有效。
- 普通沙盒下 `git add -A` 写入 `.git/index.lock` 失败，已通过受控权限暂存成功。

下一步建议：

- 后续每轮本地修改完成后，继续先跑 `git status`、必要检查，再提交并推送到 `origin/main`。
- 建议配置正式 Git 作者信息，避免后续提交继续使用本机默认邮箱。
- 保持仓库私有，除非明确决定公开项目。

重要注意事项：

- 不要把微信预览二维码、预览信息、本地私有配置、`.env`、`node_modules/`、`dist/` 上传到 GitHub。
- GitHub 登录已恢复到账号 `zitao4588-create`；后续如果 token 过期，需要重新登录。

## 2026-05-28 日历页开饭雷达组件收尾

本轮完成：

- 日历页 `开饭雷达检测报告` 已从普通菜谱列表升级为突出组件：
  - 奶油玩具风格报告卡
  - 冰蓝玻璃雷达盘
  - 本地规则计算的 `可开饭指数`
  - 高 / 中 / 低区间说明
  - 今日优先用掉食材
  - 带图片的推荐去化方案卡片
- `可开饭指数` 不调用 AI，不联网，只基于当前库存、临期食材、过期风险和 mock 菜谱匹配结果计算。
- 根据用户蓝色批注完成二次精简：
  - 去掉 `今日厨房扫描`
  - 去掉 `今日扫描完成`
  - 雷达盘只保留 `可开饭指数` 和数字，例如 `31`
  - 去掉报告卡内部重复的 `库存 / 临期 / 过期` 三项统计行
  - 保留计算说明、区间说明、今日优先用掉和推荐去化方案

本轮修改文件：

- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/calendar/calendar.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具 CLI 预览编译通过：
  - 精简前二维码：`/private/tmp/fridge-app-preview-qrcode-calendar-radar.png`
  - 按批注精简后二维码：`/private/tmp/fridge-app-preview-qrcode-calendar-radar-annotation.png`
  - 最新预览包体：`1,913,344 bytes`

当前还没解决的问题：

- 尚未做微信开发者工具截图自动比对；需要用户在真机或开发者工具里看实际视觉效果。
- 日历页雷达组件在不同库存数据下的高度、菜谱卡密度和文本换行仍需要真机确认。
- 当前开饭指数是本地规则分数，不是营养评分，也不是真实 AI 判断。

已尝试但失败 / 修正的方案：

- 用户提供的 HEIC 批注图不能被当前图片查看工具直接读取。
- 第一次用 `sips` 转 PNG 失败，后改用 `qlmanage` 生成 PNG 缩略图查看。
- 普通沙盒下 `qlmanage` 预览转换失败，使用受控权限后成功生成可查看 PNG。
- 第一版雷达组件展示了 `%`、等级和状态说明；按用户蓝色批注改为只显示 `可开饭指数` 和数字。

下一步建议：

- 真机扫码检查日历页：
  - 雷达盘数字是否足够清楚
  - 区间说明是否过密
  - `今日优先用掉` 是否好点
  - 推荐去化方案卡片是否能顺利打开做法弹窗
- 如果真机上仍显拥挤，优先压缩右侧区间说明，而不是继续缩小雷达数字。

重要注意事项：

- 日历页顶部已有 `库存 / 临期 / 过期` 三色统计，雷达报告卡内部不再重复展示这三项统计。
- `可开饭指数` 不接真实 AI，不改云函数，不改数据库。
- 后续如果要解释分数来源，优先在详情弹窗或帮助文案里解释，不建议把说明都堆在卡片首屏。

## 2026-05-28 首页搜索与菜谱页收敛收尾

本轮完成：

- 首页搜索栏位置调整：
  - 从顶部 `我的冰箱` dashboard 中移出
  - 移到冰箱分区组件顶部、分区卡组上方
  - 继续复用原搜索逻辑，不改搜索行为
- 菜谱页入口收敛：
  - 去掉页面入口层的 `微醺` 和 `饮品`
  - 只保留 `菜谱盲盒` 和 `我来选食材`
  - `recipeService` 中旧 mock 数据暂时保留，避免扩大改动范围
- 菜谱页根据蓝色批注继续调整：
  - 顶部卡标题改为 `雷达建议`
  - 保留下方小字建议内容 `context.healthTip`
  - `菜谱盲盒` 一次展示 3 道菜
  - 节气卡显示规则改为更偏“预告”的逻辑

节气显示规则：

- 节气当天：显示当前节气，提示 `当日`
- 节气过后 1-3 天：仍显示当前节气，提示 `已过 X 天`
- 节气过后超过 3 天：切换到下一个节气，提示 `还有 X 天`
- 例如 2026-05-28：
  - 小满已过 7 天
  - 芒种还有 8 天
  - 页面显示 `芒种 / 还有 8 天`

本轮修改文件：

- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/index/index.js`
- `node --check pages/recipes/recipes.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具 CLI 预览编译通过：
  - 首页搜索 / 菜谱双入口二维码：`/private/tmp/fridge-app-preview-qrcode-home-search-recipe-two.png`
  - 节气规则和雷达建议二维码：`/private/tmp/fridge-app-preview-qrcode-recipe-radar-solar.png`
  - 恢复雷达建议小字后二维码：`/private/tmp/fridge-app-preview-qrcode-recipe-radar-desc.png`
  - 最新包体：`1,913,129 bytes`

当前还没解决的问题：

- 尚未做真机截图回看；首页搜索栏在冰箱外壳内的间距、菜谱页顶部卡高度仍需真机确认。
- 节气日期目前仍是本地近似日期表，不是精确天文节气时刻。

已尝试但失败 / 修正的方案：

- 用户提供的 HEIC 蓝色批注图不能被图片查看工具直接读取，继续使用 `qlmanage -t` 转临时 PNG 查看。
- 第一次理解“雷达建议”时只保留了标题，误删了下方建议小字；已恢复 `{{context.healthTip}}`。

下一步建议：

- 真机检查首页：
  - 搜索栏是否真的像分区组件的一部分
  - 搜索栏和冰箱内胆高光是否有视觉冲突
- 真机检查菜谱页：
  - `雷达建议` 标题和建议小字是否清楚
  - 节气卡是否显示 `芒种 / 还有 8 天`
  - `菜谱盲盒` 是否一次出现 3 道菜
  - `换一批` 是否能切换 3 道菜

重要注意事项：

- 菜谱页当前产品入口以 `菜谱盲盒` 和 `我来选食材` 为准。
- 不要再按“四入口：推荐 / 选食材 / 微醺 / 饮品”作为当前最新页面目标。
- 本轮仍不接真实 AI、真实天气或联网搜索。

## 2026-05-28 AI / OCR / 条码云函数接入与部署收尾

本轮完成：

- `cloudfunctions/parseFoodImage`：
  - 支持 `food`、`package`、`receipt` 三种模式。
  - 真实路径为图片下载、OCR、图像标签、CloudBase AI 结构化。
  - 缺少图片、服务未开、模型失败或解析失败时自动回退 mock。
- `cloudfunctions/parseBarcode`：
  - 保留条码 mock 兜底。
  - 预留腾讯联网搜索 API key 路径；该能力后来已从用户入口移除，当前不作为验收项。
- `cloudfunctions/generateRecipes`：
  - 已接入 CloudBase AI 菜谱生成路径。
  - 模型额度 / 频率受限时自动回退 mock 菜谱。
- `services/parseService.js`：
  - 拍包装、小票现在会先上传图片到云存储，再调用 `parseFoodImage`。
  - 云函数失败时保留本地 mock 兜底和确认页流程。
- `services/recipeService.js`、`pages/recipes/recipes.js`：
  - 菜谱页先显示本地推荐，云端 AI 返回后再刷新。
  - 云端失败时保留本地推荐，不打断用户操作。
- 安装固定版本工具：
  - CloudBase CLI：`@cloudbase/cli@3.5.2`，临时目录 `/private/tmp/fridge-cloudbase-cli`
  - CloudBase MCP：`@cloudbase/cloudbase-mcp@2.20.1`，持久目录 `/Users/qzt/.codex/mcp/cloudbase-mcp`

云端部署结果：

- `parseFoodImage`：部署成功，状态 `Available`，超时 `20s`
- `parseBarcode`：部署成功，状态 `Available`，超时 `10s`
- `generateRecipes`：部署成功，状态 `Available`，超时 `30s`

本轮验证：

- `node --check cloudfunctions/parseFoodImage/index.js`
- `node --check cloudfunctions/parseBarcode/index.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- `node --check services/parseService.js`
- `node --check services/recipeService.js`
- `node --check pages/recipes/recipes.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- CloudBase CLI 云端 smoke test：
  - `parseFoodImage` 无图片兜底调用成功
  - `parseBarcode` 条码兜底调用成功
  - `generateRecipes` 菜谱结构化返回成功

当前还没解决的问题：

- `generateRecipes` 调用真实模型时出现过 `429`，说明当前模型额度 / 频率暂时受限；函数已正确回退 mock。
- 条码联网搜索入口已移除；天气搜索当前也不会真实调用。
- `parseFoodImage` 的真实图片识别链路还需要用真机拍照 / 相册图片生成真实 `fileID` 后验证。
- 此前控制台截图和 CLI 配置详情可能出现过密钥明文，必须在腾讯云访问密钥里轮换旧密钥，并同步更新云函数环境变量。

下一步建议：

- 先做真机端完整冒烟：
  - 拍食品 -> 确认页 -> 保存
  - 拍包装 -> 确认页 -> 保存
  - 拍购物小票 -> 批量确认页 -> 保存
  - 菜谱盲盒和我来选食材 -> 云端失败时页面仍正常
- 在 CloudBase 日志里重点看：
  - `providerStatus`
  - `fallbackReason`
  - OCR 是否成功提取文字
  - AI 是否返回合法 JSON
- 如果真实 AI 仍频繁 `429`，先保持 mock 兜底上线，不要强制关闭兜底。
- 如未来恢复条码或联网搜索能力，先评估接口成本和覆盖率，再申请 / 配置对应 API key。

重要注意事项：

- 任何密钥只能放云函数环境变量，不能写入小程序前端、文档或 Git。
- `parseLogs` 只记录识别结果和 fallback 原因，不记录密钥。
- 本轮接入的是“真实路径 + mock 兜底”，不是所有真实服务都已经稳定可用。

## 2026-05-29 分区管理与首页视觉细节收尾

本轮完成：

- 分区管理弹窗改为固定高度的上下结构：
  - 上方为可滚动分区列表。
  - 下方为独立 footer。
  - 保存按钮不再跟着列表内容上下贴边。
- “保存分区设置”按钮从小程序原生 `button` 改为 `view + text` 组合。
- 保存按钮文字使用 flex 居中，避开原生 `button` 默认行高和内边距导致的视觉不居中问题。
- 保存分区设置时增加重复点击保护，避免保存中再次触发。
- 修复首页冰箱分区中的白色条状遮挡：
  - 原因是冰箱背景装饰霜条层级高于分区卡片。
  - 已将装饰霜条层级降到分区卡片后方。

本轮修改文件：

- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/index/index.js`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/index/index.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具 CLI 预览编译通过：
  - 保存按钮居中预览码：`/private/tmp/fridge-preview-zone-save-center-20260529.jpg`
  - 去掉白色遮挡条预览码：`/private/tmp/fridge-preview-remove-frost-bar-20260529.jpg`
  - 最新包体约 `1.9 MB`

当前还没解决的问题：

- 仍需要用户真机确认：
  - 保存分区设置按钮是否在不同屏幕高度下都视觉居中、位置合适。
  - 首页冰箱里的白色条状遮挡是否已经完全消失。
  - 分区拖动手感是否达到用户预期。

下一步建议：

- 先扫最新预览码，重点检查首页分区和分区管理弹窗。
- 如果白色装饰条仍有干扰，下一步直接隐藏该装饰层，而不是继续微调层级。
- 如果分区拖动仍不够顺手，建议改成更稳定的排序模式，例如“长按进入排序 + 上下移动按钮”，避免小程序触摸事件和滚动容器继续打架。

重要注意事项：

- 本轮只改 UI 层和文档，没有修改数据库结构、云函数、AI 接口或 CloudBase 权限。
- 分区管理仍保持微信小程序原生 WXML / WXSS / JS 实现，不引入 Web 组件库。

## 2026-05-29 日历页去化方案精简收尾

本轮完成：

- 根据用户蓝色标注精简日历页“开饭雷达检测报告”下方的去化方案区域。
- 删除菜谱列表上方的 `推荐去化方案` 标题。
- 删除右侧绿色 `推荐 3 个去化方案` 提示。
- 删除每张菜谱卡片里的时间、难度和匹配状态标签，例如：
  - `15 分钟`
  - `简单`
  - `还差 2 样`
- 保留菜名、`查看做法`、已有食材和缺少食材标签。

本轮修改文件：

- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/calendar/calendar.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具 CLI 预览编译通过：
  - 预览码：`/private/tmp/fridge-preview-calendar-clean-20260529.png`
  - 预览信息：`/private/tmp/fridge-preview-calendar-clean-20260529.json`
  - 最新包体：`1,940,364 bytes`

当前还没解决的问题：

- 仍需要用户真机确认精简后的日历页是否足够清爽。
- 菜谱详情弹窗仍保留时间、难度、匹配状态，因为用户本轮标注只针对列表卡片。

下一步建议：

- 真机打开日历页，检查去化方案区域是否不再有重复标题和小标签干扰。
- 如果列表仍显拥挤，再考虑缩小食材标签数量或只展示前 3 个缺少食材。

重要注意事项：

- 本轮只删展示层元素，没有改 `recipeService` 推荐逻辑。
- 详情弹窗继续保留完整信息，避免用户点进详情后缺少做菜判断依据。

## 2026-05-29 开饭雷达云端 AI 菜谱收尾

本轮完成：

- 系统性检查日历页 `开饭雷达检测报告` 推荐链路，确认旧实现会在本地用固定菜谱库和模板兜底生成菜谱。
- 按新要求调整为：
  - 本地只做库存感知扫描。
  - 本地扫描可用库存、3 天内临期、7 天内临期和已过期风险。
  - 日历页不再使用本地规则 / mock 生成去化菜谱。
  - 日历页异步调用云函数 `generateRecipes` 生成云端 AI 菜谱。
  - 云端 AI 成功后展示 3 道菜谱。
  - 云端 AI 不可用或无可用库存时，不再回退成本地菜谱，只显示状态提示。
- 保留菜谱卡片和详情中的已有食材 / 缺少食材展示。
- 修复云端 AI 返回食材名带 `临期`、数量或单位时，前端和云函数无法匹配库存的问题。
- 过滤基础调味品，避免 `盐`、`食用油`、`水`、`葱姜蒜` 等污染 `缺少食材` 列表。
- 收紧过期食品安全提示：过期食品不进入菜谱，只提示直接丢弃。
- 已重新部署 `generateRecipes` 云函数到 CloudBase。

本轮修改文件：

- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `services/recipeService.js`
- `cloudfunctions/generateRecipes/index.js`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/calendar/calendar.js`
- `node --check services/recipeService.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- 已改动小程序页面和 service 的 `node --check`
- `git diff --check`
- `npm run lint`
- `npm run build`
- CloudBase CLI 部署 `generateRecipes` 成功。
- CloudBase CLI 云端 smoke test 通过：
  - 有临期番茄、鸡蛋、米饭和过期牛奶时，返回 `providerStatus: "real"` 和 3 道云端 AI 菜谱。
  - `availableItems` 能正确匹配番茄、鸡蛋、米饭。
  - `missingItems` 不再包含基础调味品。
  - 过期牛奶只出现在安全提示里，不作为菜谱原料。
  - 只有过期食品时返回 `recommendations: []` 和 `providerStatus: "empty"`，没有本地菜谱兜底。

当前还没解决的问题：

- 尚未在微信开发者工具或真机上点验日历页异步加载云端 AI 菜谱的真实页面表现。
- 云端 AI 调用仍受模型额度、频率和环境变量影响；如果云端失败，日历页会展示失败原因而不是本地菜谱。
- AI 生成内容仍需要继续观察真实库存场景，尤其是菜名重复、搭配合理性和安全提示措辞。

下一步建议：

- 用微信开发者工具打开日历页，确认先显示库存扫描状态，再展示云端 AI 菜谱。
- 真机确认云端 AI 等待时间是否可接受。
- 如果等待体感偏长，下一步可以只优化 Loading 文案或增加手动刷新，不恢复本地菜谱兜底。

重要注意事项：

- 日历页 `开饭雷达检测报告` 现在不再使用本地 mock / 规则菜谱兜底。
- 菜谱页的 `菜谱盲盒 / 我来选食材` 后续已改为直接云端 AI 生成，不再保留本地推荐兜底，详见后文“AI 菜谱生成、缓存与雷达建议收尾”。

## 2026-05-29 菜谱页雷达与双入口重构收尾

本轮完成：

- 系统性优化菜谱页，新增城市展示和修改入口。
- 菜谱页雷达建议改为独立气候养生建议：
  - 根据城市、腾讯实时天气、温度、湿度、季节 / 节气综合生成。
  - 不再随“我来选食材”的下方菜谱结果变化。
  - 小程序前端不保存腾讯位置服务 API key，真实天气通过 `generateRecipes` 云函数获取。
- 新增菜谱收藏记录能力：
  - 新增 `recipeRecords` 集合对应 service。
  - 菜谱卡片和详情支持收藏 / 取消收藏。
  - 菜谱页增加“我的收藏”入口。
- 明确拆分两个菜谱入口：
  - `菜谱盲盒`：不读取冰箱库存，只根据雷达气候信息推荐 3 道应季养生家常菜。
  - `我来选食材`：只围绕料理碗里的库存 / 临时食材生成菜谱。
- `我来选食材` 体验优化：
  - 切到菜谱盲盒再切回时，保留上一次选择和生成结果。
  - 只有点击“清空”才清掉料理碗和生成结果。
  - 移除所有“换一批”入口。
  - 点击生成后显示“正在生成菜谱”，并持续到云端刷新完成。
- 菜谱盲盒展示层同步调整：
  - 不再展示“有用食材 / 还差”库存匹配。
  - 改为展示“建议食材”。
- 已重新部署 `generateRecipes` 云函数到 CloudBase。

本轮修改文件：

- `AGENTS.md`
- `README.md`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`
- `cloudfunctions/generateRecipes/index.js`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `services/recipeService.js`
- `services/recipeRecordService.js`

本轮验证：

- `node --check services/recipeService.js`
- `node --check pages/recipes/recipes.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- CloudBase CLI 部署 `generateRecipes` 成功。
- CloudBase CLI 云端 smoke test 通过：
  - 返回 `weatherSource: "tencent"`、`weatherStatus: "real"`。
  - 返回上海实时天气、温度、湿度。
  - `radarAdvice` 已按城市天气气候生成。

当前还没解决的问题：

- 尚未在微信开发者工具或真机完整点验菜谱页新交互。
- `recipeRecords` 集合权限已在本轮前配置过，但还需要真机确认收藏 / 取消收藏在真实用户 `_openid` 下读写正常。
- `generateRecipes` 真实 AI 仍可能受模型额度 / 频率影响；失败时菜谱页展示失败提示，不再静默回退本地推荐。

下一步建议：

- 在微信开发者工具中点验菜谱页：
  - 修改城市。
  - 点菜谱盲盒，确认不展示库存匹配。
  - 点我来选食材，确认加载提示持续到云端刷新完成。
  - 切换两个入口，确认我来选食材结果保留。
  - 收藏 / 取消收藏菜谱，确认“我的收藏”列表同步。
- 真机确认菜谱页卡片和弹窗文字不拥挤。

重要注意事项：

- 菜谱盲盒和我来选食材是两个独立系列，后续不要再共用同一组 `recommendations` 作为展示来源。
- 雷达建议是页面级气候建议，不应被下方菜谱生成结果覆盖。
- 腾讯位置服务 key 只能配置在云函数环境变量里，不能写入小程序前端。

## 2026-05-29 菜谱页 UI 收尾与日历统计口径修正

本轮完成：

- 菜谱页顶部信息顺序调整为：
  - 城市天气卡片在最上方。
  - 雷达建议在天气卡片下方。
  - 我的收藏入口放在雷达建议下方。
  - 菜谱盲盒 / 我来选食材切换按钮放在收藏入口下方。
- 合并原先分散的天气和气候信息：
  - 天气卡片展示城市、天气、温度、湿度、季节、节气和更新时间。
  - 删除原来的四个独立气候小卡。
- 菜谱卡片继续收紧信息密度：
  - 去掉卡片里的“简单 / 应季 / 盲盒”等低价值标签。
  - 收藏按钮放到卡片右上角。
  - 卡片图片、间距、标签和收藏列表行高整体压缩。
- 菜谱详情弹窗同步精简：
  - 删除右上角关闭 `X`。
  - 收藏按钮放到原关闭按钮位置，并区分已收藏 / 未收藏颜色。
  - 删除推荐理由区块。
  - 删除底部红色安全提醒。
  - 已有食材只显示食材名，不再显示剩余时间。
- 收藏弹窗列表删除每条菜谱下方的城市 / 天气 / 时间小字。
- 推荐结果区域删除“菜谱盲盒 / 我来选食材”的黑色标题，只保留小字说明。
- 日历页顶部三色统计口径改为和首页分区管理一致：
  - 读取 `fridgeZoneConfigs` 当前启用分区。
  - 只统计启用分区覆盖到的库存。
  - 点击库存 / 临期 / 过期打开的清单也使用同一批过滤后的食品。

本轮修改文件：

- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `pages/calendar/calendar.js`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/recipes/recipes.js`
- `node --check pages/calendar/calendar.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具页面热重载后，日历页库存统计已从 `11` 对齐为首页启用分区加总 `10`。

当前还没解决的问题：

- 还需要真机确认菜谱页顶部天气卡、雷达建议、收藏入口和切换按钮之间的间距是否足够自然。
- 微信开发者工具控制台仍提示 `recipeRecords` 查询建议新增组合索引，后续建议在 CloudBase 控制台处理。

下一步建议：

- 真机完整点验菜谱页：
  - 菜谱盲盒。
  - 我来选食材。
  - 收藏 / 取消收藏。
  - 我的收藏弹窗。
  - 菜谱详情弹窗。
- 在 CloudBase 控制台为 `recipeRecords` 增加常用查询索引，优先处理 `_openid + createdAt`。

重要注意事项：

- 本轮只改展示顺序、信息密度和统计口径，没有修改 CloudBase 数据结构。
- 日历页统计现在和首页启用分区保持一致，但日历日期标记仍基于全部到期事件展示，后续如要完全一致，需要再确认是否也按启用分区过滤日历事件。

## 2026-05-29 CloudBase 核查与索引补充收尾

本轮完成：

- 按最早 `PROJECT.md` 和当前项目状态核查 CloudBase 外部接口部署情况。
- 使用固定版本 CloudBase CLI 登录后，确认目标环境 `cloud1-d3g4v0ms8ee56bd94` 内云函数均处于 `Deployment completed`：
  - `getOpenId`
  - `parseFoodImage`
  - `parseBarcode`
  - `generateRecipes`
  - `sendExpiryReminders`
  - `setupFridgeZoneConfigs`
- 补齐 `recipeRecords` 集合组合索引：
  - `openid_created_desc`：`_openid` 升序、`createdAt` 降序，用于收藏列表排序。
  - `recipeKey_openid`：`recipeKey` 升序、`_openid` 升序，用于收藏状态同步和去重查询。
- 复核 `items` 集合组合索引仍存在：
  - `openid_expire_created`：`_openid` 升序、`expireDate` 升序、`createdAt` 降序。
- 核心集合可访问，核查时计数为：
  - `items`：13
  - `reminders`：0
  - `parseLogs`：39
  - `fridgeZoneConfigs`：1
  - `recipeRecords`：1
- 近 8 条 `parseLogs` 状态显示：
  - 拍食品、拍包装、小票均已有 `providerStatus: "real"` 的真实识别记录。
  - 条形码仍为 mock / 未启用真实搜索，这与当前条码入口已移除的产品决策一致。
- `generateRecipes` 云端 smoke test 通过：
  - `providerStatus: "real"`
  - `weatherStatus: "real"`
  - `weatherSource: "tencent"`
  - 返回上海实时天气和 3 道 AI 菜谱。
  - 本次调用耗时约 14 秒。
- 发现并修复 `sendExpiryReminders` 云端依赖问题：
  - 旧部署运行时报 `Cannot find module 'wx-server-sdk'`。
  - 已重新部署 `sendExpiryReminders`。
  - 复测返回 `sent: 0`、`skipped: 0`、`message: "当前未开启订阅提醒。"`。
- `getOpenId` smoke test 可执行，CLI 直接调用场景返回空对象；小程序端仍以真实用户上下文调用为准。

本轮修改文件：

- 无项目代码文件修改。
- 本轮只更新收尾文档：
  - `PROJECT_CONTEXT.md`
  - `TODO.md`
  - `BUG_NOTES.md`
  - `DECISIONS.md`

当前还没解决的问题：

- `setupFridgeZoneConfigs` 临时云函数仍保留在 CloudBase 云端。
- `sendExpiryReminders` 仍只是占位函数，当前不做真实订阅消息推送。
- `generateRecipes` 真实 AI 调用耗时约十几秒，仍需要继续观察真机等待体感。

已尝试但失败 / 修正的方案：

- 普通沙盒命令读取 CloudBase CLI 登录态失败，改用已授权的外部执行环境运行 CLI。
- 首次复测 `sendExpiryReminders` 失败，原因是云端部署包缺少 `wx-server-sdk`；已通过重新部署修复。
- 本轮没有执行会打印云函数环境变量值的 `fn detail`，避免密钥泄露。

下一步建议：

- 若确认不再需要 `setupFridgeZoneConfigs`，后续单独确认后删除该临时云函数。
- 继续保留 `sendExpiryReminders` 占位；等要做真实订阅消息时，再单独设计授权、模板 ID、定时触发和失败重试。
- 上线前继续观察 `generateRecipes` 的耗时、额度和失败兜底表现。

重要注意事项：

- CloudBase 密钥、腾讯位置服务 key、智谱 key、腾讯云访问密钥都不能写入代码、Markdown 或聊天记录。
- 后续需要查看云函数配置时，不要使用会输出环境变量值的详情命令。
- 条形码云函数和历史日志保留只是兼容历史，不代表当前要恢复条码入口。

## 2026-05-29 AI 菜谱生成、缓存与雷达建议收尾

本轮完成：

- 菜谱盲盒改为直接调用 `generateRecipes` 云函数的 `scene: "blindBox"`，不再使用本地应季菜谱池或库存匹配结果。
- 我来选食材改为直接调用 `scene: "picker"`，只围绕料理碗里的库存 / 临时食材生成菜谱。
- 日历页开饭雷达新增当天缓存；同一天第一次进入生成一次，切页面回来不重复调用 AI。
- 菜谱盲盒新增当天 + 城市缓存；同一城市当天第一次点击生成一次，切页面回来保留结果。
- 我来选食材生成结果升级为长期本地保留；用户点击“清空”前一直保留，切页面或切换入口不会重新生成。
- 菜谱页天气上下文新增当天 + 城市缓存；城市切换后按新城市刷新天气和雷达建议。
- 雷达建议改为独立 `climateRadar` 场景生成，不再由下方菜谱结果覆盖。
- 雷达建议文案不再复述天气卡已经显示的天气、温度、湿度数字，也不再出现“暂用估算”。
- 云函数使用北京时间计算日期和用餐时段；晚上进入页面应生成晚餐建议，不再固定午餐。
- 云端雷达建议 prompt 增加地域饮食画像、节气阶段和中医食养方向，要求结合祛湿、健脾、润燥、清热、生津、温养等表达。
- AI 菜谱 prompt 收紧为每道菜 5 到 7 步，要求写清备菜、切配、火候、时间、熟度判断、出锅状态和替代建议。
- 菜谱卡片食材 chip 清洗掉数量单位和省略号，只保留食材名；数量可放在详情步骤里。
- 菜谱图片 fallback 增加关键词匹配，减少 AI 菜谱都显示默认图的问题。
- `generateRecipes` 已重新部署到 CloudBase，并生成过微信预览二维码 `/private/tmp/fridge-preview-radar-advice-20260529.png`。

本轮修改文件：

- `cloudfunctions/generateRecipes/index.js`
- `services/recipeService.js`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxml`
- `pages/recipes/recipes.wxss`
- `pages/calendar/calendar.js`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check cloudfunctions/generateRecipes/index.js`
- `node --check services/recipeService.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- CloudBase smoke test：长沙 / 广州 `climateRadar` 返回晚餐向雷达建议，且不复述天气数字。

当前还没解决的问题：

- 用户曾说明季节显示问题暂时不用处理，因此天气卡中的季节字段仍保持现状。
- 真实 AI 调用仍可能受额度、频率和网络耗时影响，需要继续观察真机等待体验。
- 微信本地旧缓存可能让真机短时间内仍看到旧雷达建议；后续如反馈复现，可提升缓存版本号强制失效。

下一步建议：

- 真机重新扫码验收广州、长沙、北京等城市的雷达建议，重点看是否仍套模板、是否错误固定午餐。
- 用同一城市当天重复进入菜谱页、日历页，确认不会重复生成。
- 切换城市后确认天气卡、雷达建议和菜谱盲盒结果都按新城市刷新。

重要注意事项：

- 菜谱盲盒和我来选食材现在都走云端 AI；不要再恢复本地菜谱兜底。
- 雷达建议是页面级气候食养建议，只应由城市 / 天气上下文刷新触发。
- 腾讯位置服务 key、AI key 仍只能保存在云函数环境变量中，不允许写入前端或文档。

## 2026-05-30 上线前视觉配色、配图系统与日历修复收尾

本轮完成：

- 完成 fridge-app 微信小程序上线前视觉配色实验，只做前端视觉、图片资产映射和轻量 view model 字段调整。
- 重构 `styles/tokens.wxss` 配色 token：页面底色、奶油卡片、薄荷、冰蓝、蜂蜜、珊瑚、AI 淡紫和文本色已统一。
- 保留旧变量别名，例如 `--mint-500`、`--honey-500`、`--ice-100`、`--color-primary` 等，避免老页面样式报错。
- 调整首页、日历页、AI 菜谱页大面积绿色问题，改为奶油底 + 冰蓝 / 蜂蜜 / 淡紫分工。
- 首页继续保留奶油玩具冰箱、玻璃抽屉、软糖按钮和冰箱吉祥物，不改成极简工具风。
- 新增 `utils/visualAssets.js`，统一导出 `getIngredientVisual(item)` 和 `getRecipeVisual(recipe)`。
- 首页食材缩略图改为通过 `getIngredientVisual` 生成 `thumbType`、`thumbImage`、`thumbClass`、`categoryIcon`。
- 菜谱 service 图片 fallback 改为通过 `getRecipeVisual` 生成，不改数据库字段。
- 新增食材和菜谱配图资产，并压缩新增 PNG，保证预览主包低于 2MB。
- 修复微信开发者工具白屏问题：新增配图映射统一做字符串路径兜底，并改成更稳的写法。
- 修复日历切到下个月再切回来后当天深色框落到 1 号的问题：切回当前月份时恢复选中今天。
- 微信开发者工具自动化已确认首页能正常加载，日历切月回归通过。
- 已生成本轮最新真机预览二维码：
  - `/private/tmp/fridge-preview-color-refresh-calendar-fix-20260530.png`

本轮修改文件：

- `styles/tokens.wxss`
- `styles/components.wxss`
- `styles/fridge-theme.wxss`
- `app.wxss`
- `pages/index/index.js`
- `pages/index/index.wxss`
- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.wxss`
- `services/recipeService.js`
- `utils/visualAssets.js`
- `images/foods/*.png` 中本轮新增食材图
- `images/recipe/*.png` 中本轮新增菜谱类型 / 食材族群图
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check app.js`
- `node --check services/itemService.js`
- `node --check services/parseService.js`
- `node --check services/recipeService.js`
- `node --check utils/visualAssets.js`
- `node --check pages/index/index.js`
- `node --check pages/item-form/item-form.js`
- `node --check pages/quick-add/quick-add.js`
- `node --check pages/parse-confirm/parse-confirm.js`
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具自动化首页 smoke test：
  - `pages/index/index` 正常加载
  - `exceptionCount: 0`
  - dashboard 和分区可读取
- 微信开发者工具自动化日历切月回归：
  - 初始 `2026-05-30`
  - 切到 `2026年6月` 后选中 `2026-06-01`
  - 切回 `2026年5月` 后恢复选中 `2026-05-30`
- 微信开发者工具 CLI 预览上传成功：
  - 主包大小 `1,916,266 bytes`

当前还没解决的问题：

- 本轮是配色实验工作树，仍需要真机实际看首页、日历页、菜谱页的视觉效果和触控手感。
- 新增配图已压缩以满足 2MB 主包限制，后续若继续增加图片，应优先考虑压缩、分包或云存储策略。
- 日历日期事件口径仍保留全部到期食品；只有统计清单口径已按首页启用分区过滤。

已尝试但失败 / 修正的方案：

- 第一次预览上传失败，原因是新增图片后主包 `2082KB` 超过微信 2MB 限制；压缩新增 PNG 后预览成功。
- `sips` 直接缩放 PNG 反而使透明 PNG 变大，已改用 Pillow 重新导出调色板 PNG。
- 新增配图映射初版在微信开发者工具中触发路径参数类型错误，已改为统一字符串路径兜底。

下一步建议：

- 扫最新二维码真机检查首页食材卡图、分区玻璃抽屉、日历卡片、开饭雷达、AI 菜谱卡片和详情弹窗。
- 若真机低端设备滚动或阴影有性能压力，再单独减少阴影层级和渐变复杂度。
- 如继续扩展配图，先评估主包大小，避免再次超过 2MB。

重要注意事项：

- 本轮没有修改数据库字段、云函数接口、业务流程、页面入口或核心逻辑。
- 不要把临时自动化目录 `/private/tmp/fridge-automator` 写入项目依赖。
- 预览二维码和预览信息文件保留在 `/private/tmp`，不要提交到 Git。

## 2026-05-30 UI 配色二次收敛、格式化与配图规则整理收尾

本轮完成：

- 按用户要求只做 UI 配色二次收敛、代码格式化和配图规则整理。
- 将 `app.wxss`、`styles/tokens.wxss`、`styles/components.wxss`、`styles/fridge-theme.wxss`、`pages/index/index.js`、`services/recipeService.js` 展开为正常多行可读格式。
- `styles/tokens.wxss` 新增 AI 淡紫变量：
  - `--ai-lilac-bg: #F2EFFF`
  - `--ai-lilac: #7C62C7`
  - `--ai-lilac-deep: #5D46A3`
- 继续保留奶油玩具冰箱风格，页面背景以奶油白为主，减少绿色面积。
- 全局背景改为奶油底 + 少量冰蓝柔光 + 少量蜂蜜柔光。
- 首页维持现有结构和强拟物冰箱，不推翻页面；搜索按钮继续绿色，“按分区添加”继续蜂蜜橙，“智能录入 / 不确定放哪”继续冰蓝。
- 日历页维持冰蓝日历主体，开饭雷达继续奶油 + 蜂蜜语义。
- AI 菜谱页收藏按钮改为 AI 淡紫，菜谱属性标签改为冰蓝，食材 chip 改为白底 / 冰蓝 / 蜂蜜为主，减少全绿色铺色。
- `utils/visualAssets.js` 配图规则进一步整理，显式支持菜谱标题精确命中。
- 首页 `getFoodThumb` 继续调用 `getIngredientVisual(item)`，菜谱 `getRecipeImage` 继续调用 `getRecipeVisual(recipe)`。
- 确认只补通用系统资产，不继续增加随机图片。
- 重新生成微信开发者工具真机预览二维码：
  - `/private/tmp/fridge-preview-color-refresh-20260530-005453.png`

本轮修改文件：

- `app.wxss`
- `styles/tokens.wxss`
- `styles/components.wxss`
- `styles/fridge-theme.wxss`
- `pages/index/index.js`
- `pages/index/index.wxss`
- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.wxss`
- `services/recipeService.js`
- `utils/visualAssets.js`
- `images/foods/*.png` 中本轮通用系统食材图
- `images/recipe/*.png` 中本轮通用菜谱类型 / 食材族群图
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check app.js`
- `node --check services/itemService.js`
- `node --check services/parseService.js`
- `node --check services/recipeService.js`
- `node --check pages/index/index.js`
- `node --check pages/item-form/item-form.js`
- `node --check pages/quick-add/quick-add.js`
- `node --check pages/parse-confirm/parse-confirm.js`
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- `node --check utils/visualAssets.js`
- `npm run lint`
- `npm run build`
- `git diff --check`
- 微信开发者工具 CLI 预览上传成功：
  - 主包大小 `2,017,322 bytes`

当前还没解决的问题：

- 用户反馈二次收敛肉眼变化不明显；这是因为本轮按限制没有重做页面结构、布局、尺寸和核心视觉框架。
- 若要做肉眼更明显的版本，下一轮应集中调整首页首屏 dashboard、冰箱分区卡、AI 菜谱卡片对比度和图片占比。
- 新增图片仍让主包接近 2MB，需要继续控制后续图片增量。

已尝试但失败 / 修正的方案：

- 微信开发者工具 CLI 在普通沙盒内执行 `islogin` 时被本地端口权限拦截，报 `listen EPERM 127.0.0.1:3799`。
- 改用用户已同意的开发者工具 `preview` 命令在授权环境中生成二维码，最终预览成功。

下一步建议：

- 真机扫码查看首页、日历页、AI 菜谱页，判断当前“二次收敛”是否足够。
- 如果需要更明显的视觉提升，下一轮优先做首页和菜谱卡片的局部视觉强化，不动业务逻辑。
- 继续观察主包大小，新增图片前先压缩或评估分包。

重要注意事项：

- 本轮没有修改数据库字段、云函数接口、业务流程、页面入口或核心逻辑。
- 不要提交 `/private/tmp` 下的预览二维码、预览信息和临时自动化目录。

## 2026-05-30 按钮配色柔化微调收尾

本轮完成：

- 按用户要求只做配色微调，不改功能、不改 JS、不改 WXML、不改图片、不改布局结构。
- 大面积按钮从深色实心渐变调整为浅底深字，降低橙色、绿色、蓝色按钮大面积出现时的突兀感。
- `styles/tokens.wxss` 新增并接入更柔和的语义变量：
  - `--brand-mint`
  - `--brand-mint-deep`
  - `--brand-mint-soft`
  - `--ice-bg`
  - `--ice-soft`
  - `--ice-mid`
  - `--ice-strong`
  - `--ice-ink`
  - `--honey-bg`
  - `--honey-soft`
  - `--honey-mid`
  - `--honey`
  - `--honey-deep`
  - `--coral-bg`
  - `--coral`
  - `--coral-deep`
- 首页“按分区添加”改为浅蜂蜜渐变 + 橙棕字。
- 首页“智能录入”改为浅冰蓝渐变 + 深蓝字。
- 搜索按钮保留绿色，但去掉深绿收尾。
- 首页分区加号、分区添加弹窗按钮、分区配置保存按钮整体变柔和。
- 日历选中日期、临期统计、开饭雷达优先处理区、查看做法按钮和步骤编号降低饱和度。
- AI 菜谱页“菜谱盲盒”改为浅蜂蜜软糖感，“我来选食材”选中态改为白底 / 冰蓝边 / 深蓝字。
- 收藏按钮未收藏保持淡紫，已收藏改为浅蜂蜜底 + 橙棕字。
- 大按钮阴影和卡片阴影整体降低，大按钮阴影透明度控制在约 `0.16` 以内。

本轮修改文件：

- `styles/tokens.wxss`
- `app.wxss`
- `styles/components.wxss`
- `styles/fridge-theme.wxss`
- `pages/index/index.wxss`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.wxss`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `DECISIONS.md`

本轮验证：

- `git diff --check`
- `npm run lint`
- `npm run build`

当前还没解决的问题：

- 本轮没有重新生成微信预览二维码，需要真机查看时再单独生成。
- 柔化后是否足够“肉眼明显”，仍需要真机截图判断。

下一步建议：

- 真机重点看首页两个大入口、AI 菜谱页两个入口、日历选中日期和“查看做法”按钮是否更奶油、更统一。
- 如果仍觉得按钮抢眼，下一轮继续只在 WXSS 内降低边框和阴影，不动业务逻辑。

重要注意事项：

- 本轮没有修改 JS、WXML、图片、数据库、云函数、业务流程、页面入口或核心逻辑。
- BUG_NOTES 本轮不更新，因为没有新增报错或失败尝试。

## 2026-05-30 新图压缩替换与真机预览收尾

本轮完成：

- 按用户提供的新图，压缩并替换 20 个食材 / 菜谱图片资产。
- 食材图替换：
  - `images/foods/milk.png`
  - `images/foods/tofu.png`
  - `images/foods/fish.png`
  - `images/foods/chicken.png`
  - `images/foods/beef.png`
  - `images/foods/egg.png`
  - `images/foods/rice.png`
  - `images/foods/fruit.png`
  - `images/foods/mushroom.png`
  - `images/foods/leafy.png`
  - `images/foods/root.png`
  - `images/foods/shrimp.png`
- 菜谱图替换：
  - `images/recipe/type-soup.png`
  - `images/recipe/family-seafood.png`
  - `images/recipe/family-meat.png`
  - `images/recipe/type-salad.png`
  - `images/recipe/type-steam.png`
  - `images/recipe/type-noodle.png`
  - `images/recipe/type-rice.png`
  - `images/recipe/type-stir-fry.png`
- 食材图做轻量透明背景处理，菜谱图保留暖色菜品背景。
- 为满足微信预览包体限制，最终将这批新图压缩为主包可承受的缩略图尺寸。
- 已重新生成真机预览二维码：
  - `/private/tmp/fridge-preview.png`
- 本次微信开发者工具预览包体：
  - `2,080,048 bytes`

本轮验证：

- `npm run build`
- 微信开发者工具 CLI `preview` 成功生成真机二维码

当前还没解决的问题：

- 当前预览包体已经贴近微信小程序主包 2MB 限制，后续继续加图会再次触发超限风险。
- 新图经过强压缩以保证能预览，真机上仍需确认食品卡片和菜谱详情图是否足够清晰。

已尝试但失败的方案：

- 首次按较高尺寸压缩后，真机预览失败，包体提示 `2872KB exceed max limit 2MB`。
- 二次压缩后仍失败，包体提示 `2055KB exceed max limit 2MB`。
- 最终继续降低尺寸和调色板颜色数后，预览上传成功。

下一步建议：

- 真机扫码重点确认首页食材卡片图、AI 菜谱卡片图、菜谱详情图是否清晰、是否有错图。
- 如果后续还要继续增加大量图片，优先做分包、云存储或更系统的图片压缩策略，不要继续无控制放入主包。

重要注意事项：

- 本轮没有修改 JS、WXML、WXSS、数据库、云函数、业务流程、页面入口或核心逻辑。
- `/private/tmp/fridge-preview.png` 和 `/private/tmp/fridge-preview-info.json` 只是本地预览产物，不提交到 Git。

## 2026-05-30 AI 菜谱页天气、日历页收藏与上线前收尾

本轮完成：

- AI 菜谱页去掉天气卡中的“更新时间”，天气卡只展示城市、天气、今日温度区间和湿度。
- 菜谱页天气卡左侧冰蓝渐变保留，其余页面和卡片中的小块深浅渐变团已清理，整体色块更平。
- `generateRecipes` 云函数读取腾讯实时天气时：
  - `type: now` 用于实时天气、实时温度和实时湿度。
  - `type: future` 用于今日白天 / 夜间温度，前端显示为今日温度区间。
- 雷达建议改为今日全天饮食建议，不再按早餐、午餐、晚餐拆分。
- 菜谱盲盒按当天 + 城市固定生成一次；换城市或次日再刷新。
- 菜谱页缓存版本已升级：
  - `fridge_recipe_picker_cache_v2` 版本 3
  - `fridge_recipe_blind_box_cache_v1` 版本 5
  - `fridge_recipe_climate_cache_v1` 版本 5
- 为解决湿度旧值问题，`generateRecipes` 新增 `WEATHER_CONTEXT_VERSION = 2`：
  - 云函数只信任今天、同城市、来源明确、版本匹配的天气上下文。
  - 旧前端缓存里的湿度不会再被云函数继续沿用。
  - 旧上下文不可信时，云函数会重新拉取腾讯天气。
- 日历页 `开饭雷达检测报告`：
  - 去掉右侧叶子装饰。
  - 菜谱卡右侧按钮从“查看做法”改为“收藏 / 已收藏”。
  - 点击菜谱卡片非收藏区域可打开做法弹窗。
  - 日历页接入 `recipeRecordService`，支持菜谱收藏状态同步。
- 初始化 Codegraph，并将 `.codegraph/` 加入 `.gitignore`。
- 微信开发者工具中已确认本地模拟器加载新日历页：叶子消失，按钮显示“收藏”。
- `generateRecipes` 云函数已重新部署到 CloudBase。
- 已生成新的微信真机预览二维码：
  - `/Users/qzt/Desktop/projects/fridge-app/preview-qrcode-20260530-1829.png`

本轮修改文件：

- `.gitignore`
- `app.wxss`
- `cloudfunctions/generateRecipes/index.js`
- `pages/calendar/calendar.js`
- `pages/calendar/calendar.wxml`
- `pages/calendar/calendar.wxss`
- `pages/recipes/recipes.js`
- `pages/recipes/recipes.wxss`
- `pages/index/index.wxss`
- `pages/item-form/item-form.wxss`
- `pages/quick-add/quick-add.wxss`
- `pages/parse-confirm/parse-confirm.wxss`
- `pages/batch-parse-confirm/batch-parse-confirm.wxss`
- `services/recipeService.js`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`
- `DECISIONS.md`

本轮验证：

- `node --check pages/calendar/calendar.js`
- `node --check pages/recipes/recipes.js`
- `node --check cloudfunctions/generateRecipes/index.js`
- `git diff --check`
- `npm run lint`
- `npm run build`
- 微信开发者工具 CLI 部署 `generateRecipes` 成功
- 微信开发者工具 CLI `preview` 成功，主包大小约 `2.0 MB`

当前还没解决的问题：

- 用户手机真机预览曾继续显示旧内容，已通过清理开发者工具编译缓存和生成唯一文件名二维码排查；仍需要用户最终确认手机端是否已加载最新包。
- 当前预览包体仍贴近 2MB，后续新增图片前必须先评估主包体积。

已尝试但失败的方案：

- 使用同名 `preview-qrcode.png` 反复覆盖，容易让聊天窗口或手机端误扫旧二维码图片。
- 首次截图开发者工具时误截到 Codex 前台窗口，随后已切换微信开发者工具到前台重新截图确认。

下一步建议：

- 用户用最新二维码真机确认菜谱页湿度、今日温度区间、雷达建议和日历页收藏交互。
- 如果手机仍显示旧包，优先开启微信开发者工具“真机调试”，看手机实际加载的包和本地 storage。
- 上线前再次确认 CloudBase `generateRecipes` 日志里的 `weatherStatus`、`weatherSource`、`humidity`、`temperatureRangeSource` 是否符合预期。

重要注意事项：

- 微信预览二维码和预览信息文件不提交到 Git。
- 云函数天气逻辑必须继续放在云端，腾讯位置服务 key 不得放到小程序前端。

## 2026-05-31 宣传物料项目已独立

宣传视频和营销物料已迁移到同级独立项目：

- `../fridge-radar-promo`

小程序仓库只作为产品源头，不再保存 Remotion / HyperFrames 视频工程源码和长篇视频制作记录。后续制作宣传物料时，先读取本仓库的产品上下文，再到宣传项目中更新模板。

宣传物料项目当前包含：

- `fridge-radar-demo/`：Remotion 视频工程，包含产品 demo、开发者复盘和 10 条批量短视频模板。
- `hyperframes-fridge-intro/`：HyperFrames 15 秒产品 intro。
- `hyperframes-creator-log/`：HyperFrames 45 秒个人开发者上线记录。
- `promo-video/`：早期 Remotion 18 秒宣传片工程。

真实功能边界：

- 记录冰箱食材
- 设置保质期
- 临期提醒
- 根据库存给做饭思路
- 支持用户反馈和手动修改

宣传禁止项：

- 会员、付费解锁
- 体检报告、健康报告
- 7 天挑战
- 医疗、减肥、营养治疗承诺
- 虚构用户数据
- 虚构品牌合作
- 假数据看板

后续宣传物料工作流：

1. 先读取本仓库 `PROJECT_CONTEXT.md`、`TODO.md`、`DECISIONS.md`，确认小程序最新真实功能。
2. 到 `../fridge-radar-promo` 更新视频文案、素材和模板。
3. 抖音 / 小红书版本不放二维码，只写“微信搜：冰箱小雷达”。
4. 微信生态版本可以使用正式小程序码。

## 2026-06-04 开源准备材料已合入本地 main

本轮完成：

- 确认 `/Users/qzt/Desktop/projects/fridge-app` 是主工作区。
- 从远端 `origin/main` 合入开源准备材料。
- 先在临时分支 `codex/fridge-open-source-sync` 解决冲突并验证。
- 已将验证后的合并结果快进合回本地 `main`。
- 当前本地 `main` 最新提交为 `8882c72 Merge open-source readiness docs`。
- 当前本地 `main` 相对 `origin/main` 为 `ahead 3`，尚未 push。

本轮新增 / 更新内容：

- `.github/ISSUE_TEMPLATE/`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `OPEN_SOURCE_APPLICATION.md`
- `SECURITY.md`
- `docs/CLOUDBASE_SETUP.md`
- `docs/USAGE_EVIDENCE.md`
- `docs/screenshots/*.png`
- `README.md`

处理原则：

- `README.md` 保留「冰箱小雷达」中文产品名和当前微信小程序主线口径。
- 开源文档补充贡献、安全、CloudBase fork 设置、使用证明和截图。
- 不把 API key 放到前端。
- 不恢复 Vercel、Supabase、Next.js、登录页、独立后端或 Docker 路线。

本轮验证：

- `npm run lint` 通过。
- `npm run build` 通过。
- 新截图文件均为有效 PNG。
- 未发现残留 Git 冲突标记。
- 新增开源文档未命中常见 `sk-` / `mkt_` token 形态。

当前还没解决的问题：

- 需要决定是否 push 本地 `main` 到 GitHub。
- Git 提交作者邮箱当前由本机自动生成，推送前建议确认 Git author 配置。
