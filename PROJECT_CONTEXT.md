# PROJECT_CONTEXT.md

最后更新：2026-05-28

## 当前项目目标

本项目当前主线已经从原来的 React/Vite H5，切换为微信小程序项目。

项目名称：冰箱雷达
项目目录：`fridge-app`  
产品方向：冰箱食品饮料库存管理

当前阶段目标是完成第一阶段 MVP：

- 用户可以手动添加冰箱食品饮料
- 首页通过可 DIY 的分区货架查看库存、过期状态、统计和搜索
- 支持编辑、删除食品
- 数据保存到微信云开发 CloudBase 云数据库
- 每条食品数据绑定当前用户 `_openid`
- 日历页显示到期食品，并在日历下方直接承接临期 / 过期食材去化
- 菜谱页固定为 AI 菜谱体验页，已接入云函数真实 AI 路径，服务不可用或额度受限时自动回退 mock 结构
- 拍食品、拍包装、拍购物小票已接入云函数 OCR / AI 结构化路径；条码已预留联网搜索路径；所有识别结果仍必须经过确认页后保存

## 当前技术栈

- 微信小程序原生开发
- 原生 JavaScript
- WXML
- WXSS
- 微信云开发 / CloudBase
- 云数据库集合：`items`、`reminders`、`parseLogs`、`fridgeZoneConfigs`
- 云函数：`getOpenId`、`parseFoodImage`、`parseBarcode`、`generateRecipes`、`sendExpiryReminders`

当前不使用：

- Vercel
- Supabase
- React H5 作为主线
- Next.js
- 独立后端服务器
- 登录页
- 独立前端直连真实 OCR / 条形码商品库 / AI API
- 真实天气 API
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
  - 拍包装 / 条码
- 点击分区 `总 / 临 / 过` 统计会打开当前分区对应清单
- 点击食品图片会打开食品详情面板，可查看、编辑、删除
- 食品卡片使用本地食材图片或拍照图片作为主视觉，文字区按状态三色区分：正常绿色、临期黄色、已过期红色
- 拍食品会上传照片到 CloudBase 云存储并保存 `imageFileId`，首页优先显示照片
- 手动、条码、包装、小票来源使用本地品类图片缩略图，不接真实外部识别或图片服务
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
- 分区清单内可拍食品、拍包装 / 条码，并默认带入当前分区
- 首页“我的冰箱”标题右侧提供“智能录入”入口，用于不预选分区的拍食品、拍包装 / 条码和小票批量录入
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
- 日历功能下方新增“临期去化”
- 临期去化展示今日到期、3 天内到期、7 天内到期、已过期数量
- 临期统计卡片可点击查看对应清单，但卡片内不显示“查看清单”小字
- 临期去化列出优先处理食材
- 临期食品会直接生成 3 道优先消耗菜谱卡片
- 去化菜谱卡片展示已有食材、缺少食材、可直接做 / 还差几样、建议优先用掉、耗时、难度和标签
- 已过期食品只做安全检查和丢弃提醒，不默认推荐为可食用菜谱
- 第一阶段不接系统日历

### 菜谱页

- 当前定位为 AI 菜谱体验页
- 顶部使用冰箱吉祥物 banner，展示库存感知菜谱推荐说明和一条生活化饮食建议
- 顶部下方展示节气、季节、气温和湿度四个 mock 环境信息
- 第一轮使用 mock 日期、季节、天气、时间段和 AI 推荐结构
- 进入菜谱页后，下方默认保持空白，不自动展示“临期去化攻略”
- 菜谱页当前只保留“菜谱盲盒”和“我来选食材”两个入口
- “菜谱盲盒”一次展示 3 道 mock 推荐菜
- 菜谱结果以美食图片卡片展示，包含菜品图、菜名、耗时、难度、标签、已有食材、缺少食材和临期优先提醒
- 菜谱结果支持“换一批”
- AI 推荐会读取冰箱库存，标记已有食材、缺少食材、可直接做 / 还差几样
- 临期食材会被加权并显示“建议优先用掉”
- 支持点击菜谱卡查看详情，展示食材匹配、步骤和安全提示
- 支持“我来选食材”半屏弹窗：
  - 保留功能名称“我来选食材”
  - 使用奶油陶瓷料理碗视觉承载已选食材
  - 可从冰箱库存点选未过期食材
  - 可搜索库存食材
  - 可输入任意临时食材参与本次推荐
  - 临时食材不自动写入 `items`
  - 生成后可跳转添加页，预填临时食材名称，由用户补齐到期日后保存
  - 同一天内通过本地缓存恢复最近一次“我来选食材”结果
- 第一阶段不调用真实 AI API、真实天气 API 或真实联网搜索

### 智能录入 mock 流程

- 拍食品入口会打开相机 / 相册，第一阶段返回 mock 食品解析结果
- 拍包装入口会打开相机 / 相册，第一阶段返回 mock 包装说明解析结果
- 扫码条形码入口会打开扫码能力，第一阶段返回 mock 商品解析结果
- 拍购物小票入口会打开相机 / 相册，第一阶段返回多条 mock 食品解析结果
- 单个解析结果进入 `pages/parse-confirm`
- 小票批量解析结果进入 `pages/batch-parse-confirm`
- 单品会显示推荐分区；从冰箱分区进入时默认使用当前分区，用户可采纳推荐分区
- 小票批量确认页每条食品可单独勾选、修改名称、数量、单位、品类、过期日期和存放位置
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
  storageLocation: "冷藏" | "变温" | "冷冻" | "门架" | "其他";
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

用于记录拍食品、包装 / 条码、小票 mock 解析日志。

### 本地缓存

- `fridge_recipe_picker_cache_v1`
  - 用于保存当天最近一次“我来选食材”生成结果
  - 保存内容包括已选库存食材 ID、临时食材、轮换索引和保存时间
  - 只使用 `wx.setStorageSync`，不写入 CloudBase
  - 第二天自动失效
  - 用户点“清空”或切换到“菜谱盲盒”时清除

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
  - `parseFoodPhoto`
  - `parsePackagePhoto`
  - `scanAndParseBarcode`
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

- `parseFoodImage` 已部署真实 OCR / 图像标签 / CloudBase AI 结构化路径；缺少图片、服务未开或调用失败时回退 mock
- `parseBarcode` 已部署联网搜索 + AI 结构化预留路径；当前 `FRIDGE_ENABLE_REAL_SEARCH=false` 时回退 mock
- `generateRecipes` 已部署 CloudBase AI 菜谱生成路径；模型额度 / 频率受限时回退 mock
- `sendExpiryReminders` 第一阶段只保留结构，不实际发送订阅消息

## 本轮完成内容

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
- 真实 OCR 未接入
- 真实条形码商品库未接入
- 真实 AI 菜谱推荐未接入
- 拍食品、拍包装 / 条码、小票批量确认还需要在微信开发者工具和真机上完整复查相机、扫码、确认保存体验
- 日历页临期去化卡片和 AI 菜谱四入口交互已生成预览二维码，但仍等待真机人工确认
- 真实订阅消息提醒未接入
- 旧 React/Vite 文件还保留在目录里，后续如果确认不再需要，可以手动逐个清理
- 开发者工具服务端口为了本轮测试已开启，后续不用自动化时可以在微信开发者工具的安全设置里关闭
- `miniprogram-automator` 本轮仅临时安装在 `/private/tmp/fridge-automator`，没有写入项目依赖

## 下一步建议

优先建议：

- 用真机预览检查本轮“奶油玩具冰箱”视觉：奶油背景是否干净、冰箱外壳 / 内胆 / 抽屉层级是否清楚、食材图片是否比汉字占位更自然
- 用真机预览检查菜谱页：banner、四个入口、菜品图片卡、换一批、详情弹窗和选食材弹窗是否顺手
- 关注主包大小；后续新增图片资产前先压缩或评估分包
- 在微信开发者工具和真机上检查首页分区 DIY 货架、横向食品卡片和添加方式面板
- 重点复查分区 `总 / 临 / 过` 统计是否好点、食品图片详情面板是否好用
- 确认底部 Tab 是否只保留 `冰箱 / 日历 / 菜谱`，并观察是否比四 Tab 更清爽
- 如果后续需要设置入口，优先做轻量设置，不恢复“我的”个人中心
- 如果后续支持多个冰箱，再单独设计冰箱切换入口
- 检查新增 `变温` 位置在首页分区、添加页、编辑页、日历页、菜谱页的实际展示是否顺畅
- 用真机预览检查首页、添加页、分区统计、底部 Tab 的实际触控体验
- 用真机预览检查智能录入入口、分区内拍食品、拍包装 / 条码、小票批量保存流程
- 用真机预览检查日历页临期去化卡片、统计清单弹窗和 AI 菜谱页默认空白状态
- 用真机预览点选四个 AI 菜谱入口，确认下方攻略内容按入口生成且不自动显示临期去化
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
  - 预留腾讯联网搜索 API key 路径，后续启用 `FRIDGE_ENABLE_REAL_SEARCH=true` 后可进入搜索 + AI 结构化。
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
- `FRIDGE_ENABLE_REAL_SEARCH=false`，条码联网搜索和天气搜索当前不会真实调用。
- `parseFoodImage` 的真实图片识别链路还需要用真机拍照 / 相册图片生成真实 `fileID` 后验证。
- 此前控制台截图和 CLI 配置详情可能出现过密钥明文，必须在腾讯云访问密钥里轮换旧密钥，并同步更新云函数环境变量。

下一步建议：

- 先做真机端完整冒烟：
  - 拍食品 -> 确认页 -> 保存
  - 拍包装 -> 确认页 -> 保存
  - 拍购物小票 -> 批量确认页 -> 保存
  - 扫条码 -> 确认页 -> 保存
  - 菜谱盲盒和我来选食材 -> 云端失败时页面仍正常
- 在 CloudBase 日志里重点看：
  - `providerStatus`
  - `fallbackReason`
  - OCR 是否成功提取文字
  - AI 是否返回合法 JSON
- 如果真实 AI 仍频繁 `429`，先保持 mock 兜底上线，不要强制关闭兜底。
- 启用联网搜索前，先申请 / 配置对应 API key，再把 `FRIDGE_ENABLE_REAL_SEARCH` 改为 `true`。

重要注意事项：

- 任何密钥只能放云函数环境变量，不能写入小程序前端、文档或 Git。
- `parseLogs` 只记录识别结果和 fallback 原因，不记录密钥。
- 本轮接入的是“真实路径 + mock 兜底”，不是所有真实服务都已经稳定可用。
