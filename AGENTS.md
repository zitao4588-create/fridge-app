# AGENTS.md

## 项目目标

本项目当前主线是微信小程序“冰箱管家”，用于管理冰箱食品饮料库存。

当前阶段目标：

- 用户可以手动添加冰箱食品饮料
- 首页可以查看库存、过期状态、统计、搜索和筛选
- 支持编辑、删除食品
- 数据保存到微信云开发 CloudBase 云数据库
- 每条食品数据绑定当前用户 `_openid`
- 日历页显示到期食品，并在日历下方直接承接临期 / 过期食材去化
- 菜谱页固定为 AI 菜谱体验页，第一轮使用 mock AI / mock 天气结构；默认下方留白，用户点选入口后生成库存感知推荐
- 拍食品、拍包装 / 条码、拍购物小票第一阶段走 mock 解析，并必须经过确认页后保存

## 技术栈

- 微信小程序原生开发
- 原生 JavaScript
- WXML
- WXSS
- 微信云开发 / CloudBase
- 云数据库集合：`items`、`reminders`、`parseLogs`、`fridgeZoneConfigs`
- 云函数：`getOpenId`、`parseFoodImage`、`parseBarcode`、`generateRecipes`、`sendExpiryReminders`

补充说明：

- 当前不做登录页
- 当前不获取用户头像、昵称、手机号
- 当前不接独立后端服务器
- 当前不接 Vercel、Supabase、Next.js
- 当前不接真实 OCR、真实条形码商品库、真实 AI API
- 当前不接真实天气 API 或真实联网搜索
- 当前不做订阅消息真实推送
- 旧 React/Vite H5 文件仍保留，但不是当前开发主线

## 当前已完成功能

当前第一阶段 MVP 已经完成：

- 微信小程序项目结构
- CloudBase 初始化
- CloudBase 数据库集合：`items`、`reminders`、`parseLogs`、`fridgeZoneConfigs`
- 云函数部署：`getOpenId`、`parseFoodImage`、`parseBarcode`、`generateRecipes`、`sendExpiryReminders`
- 首页库存列表
- 手动添加食品
- 编辑已有食品
- 删除食品和二次确认
- 食品名称搜索
- 品类筛选
- 存放位置筛选
- 顶部统计：总数、3 天内过期、已过期
- 过期状态计算
- 日历页展示到期食品
- 日历页临期去化：今日到期、3 天内、7 天内、已过期统计，优先处理食材，3 道去化菜谱卡片，过期安全提醒
- AI 菜谱体验页：Tips 窗口、默认空白等待点选入口、库存感知推荐、已有 / 缺少食材标记、我来选食材、菜品盲盒、每日微醺、健康饮品
- 拍食品 mock 解析确认流程
- 拍包装 / 条码 mock 解析确认流程
- 拍购物小票 mock 批量确认流程
- 首页“智能录入”独立入口
- 首页“确定放哪 / 不确定放哪”指示牌式决策入口
- 首页已改为分区货架展示，支持 5 个标准分区启用 / 排序 DIY
- 首页分区 DIY 配置保存到 CloudBase 集合 `fridgeZoneConfigs`
- 分区弹窗内支持手动添加、拍食品、拍包装 / 条码
- 智能录入支持手动输入名称后推荐分区
- 首页空状态优化
- 搜索 / 筛选无结果时可清空筛选
- 删除成功后页面内提示
- 添加 / 编辑页字段级校验提示
- 添加 / 编辑页品类、单位、存放位置快捷点选

当前页面行为：

- 可录入食品名称
- 可录入品类
- 可录入数量
- 可录入单位
- 可录入生产日期
- 可录入保质期天数
- 可录入过期日期
- 可录入存放位置
- 可录入备注
- 品类、单位、存放位置可直接点选，选中项会高亮
- 可编辑已有食品
- 列表按过期日期从近到远排序
- 顶部展示总数、3 天内过期数、已过期数
- 无库存时提示“冰箱还是空的”
- 搜索或筛选无结果时提示清空筛选
- 菜谱页可查看菜谱详情，展示匹配食材、缺少食材、步骤和安全提示
- “我来选食材”可从冰箱库存选择 1 到 5 个未过期食材生成推荐
- AI 菜谱页进入后不自动展示“临期去化攻略”，必须点选四个入口之一后才生成下方攻略内容

当前过期状态规则：

- 已过期：`overdue`
- 1 天内过期：`critical`
- 3 天内过期：`warning`
- 7 天内过期：`soon`
- 正常：`normal`

## 当前数据结构

当前核心数据结构由 `services/itemService.js` 清洗后写入 CloudBase 的 `items` 集合。

### 1. 食品数据

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

字段说明：

- `_id`：CloudBase 文档 ID
- `_openid`：微信云开发自动绑定的当前用户标识
- `name`：食品名称
- `category`：品类
- `quantity`：数量
- `unit`：单位
- `productionDate`：生产日期，可选
- `shelfLifeDays`：保质期天数，可选
- `expireDate`：过期日期，格式为 `YYYY-MM-DD`
- `storageLocation`：存放位置
- `note`：备注
- `source`：来源，手动 / 拍食品 / 条码 / 包装说明 / 小票
- `createdAt`：创建时间戳
- `updatedAt`：更新时间戳

### 2. service 层

- `services/itemService.js`：食品增删改查、搜索、清理
- `services/parseService.js`：拍食品 / 包装 / 条码 / 小票 mock 解析、解析结果标准化、过期日期计算、推荐分区
- `services/reminderService.js`：日历事件和提醒能力预留
- `services/recipeService.js`：AI mock 菜谱推荐、库存匹配、临期去化建议、盲盒推荐

页面不要直接堆复杂数据库逻辑，新增业务逻辑优先放到 service 层。

## 当前项目状态

截至当前，项目状态如下：

- 小程序项目可以在微信开发者工具中导入并运行
- CloudBase 环境已配置：`cloud1-d3g4v0ms8ee56bd94`
- AppID 已配置：`wx328e2b87665508e7`
- 主要云函数已部署成功
- `npm run lint` 可通过
- `npm run build` 可通过
- `node --check pages/index/index.js` 可通过
- `node --check pages/item-form/item-form.js` 可通过
- `node --check pages/quick-add/quick-add.js` 可通过
- `node --check pages/parse-confirm/parse-confirm.js` 可通过
- `node --check pages/batch-parse-confirm/batch-parse-confirm.js` 可通过
- `node --check pages/calendar/calendar.js` 可通过
- `node --check pages/recipes/recipes.js` 可通过
- `node --check services/parseService.js` 可通过
- `node --check services/recipeService.js` 可通过
- `node --check cloudfunctions/generateRecipes/index.js` 可通过
- 微信开发者工具自动化测试通过 15 项断言
- 品类 / 单位 / 存放位置快捷选择自动化测试通过 15 项断言
- 自动化测试数据已清理

当前主要文件职责：

- `app.js`：CloudBase 初始化
- `app.json`：页面和底部 Tab 配置
- `app.wxss`：全局样式
- `pages/index/*`：首页库存列表、统计、搜索、筛选、删除、空状态
- `pages/item-form/*`：添加 / 编辑食品表单
- `pages/quick-add/*`：独立智能录入入口
- `pages/parse-confirm/*`：单个识别结果确认页
- `pages/batch-parse-confirm/*`：小票批量识别结果确认页
- `pages/calendar/*`：到期日历页、临期去化卡片推荐
- `pages/recipes/*`：AI 菜谱体验页
- `pages/profile/*`：我的页
- `services/*`：业务逻辑
- `utils/*`：常量、日期、状态工具
- `cloudfunctions/*`：云函数

## 后续待开发功能

后续开发保持“小步迭代”，优先做直接提升可用性的功能。

优先建议：

- 真机预览检查实际触控体验
- 我的页增加更清晰的数据统计
- 真机预览拍食品、拍包装 / 条码、小票批量确认的完整体验
- 真机预览日历页临期去化和 AI 菜谱页弹窗体验
- 优化首页筛选区的移动端布局和触控面积
- 增加食品详情或卡片展开能力，便于查看备注、来源、生产日期

第二阶段再考虑：

- 拍食品图片上传到 CloudBase 云存储已完成；后续继续完善图片压缩、云存储清理
- 真实 OCR / AI 图片识别
- 真实条形码商品库或第三方接口
- 订阅消息授权与定时提醒
- 真实 AI 菜谱推荐、真实天气 API、真实联网搜索

暂不建议优先引入：

- 登录页
- 获取用户头像、昵称、手机号
- 独立后端服务器
- Vercel
- Supabase
- Next.js
- Docker
- 支付
- 复杂权限体系
- 过早的大规模状态管理重构

## 开发约定

- 每次新增功能前先阅读 `AGENTS.md`、`PROJECT_CONTEXT.md`、`TODO.md`
- 不要随意重构整个项目
- 每次只改和当前任务相关的文件
- 优先保证项目能正常运行
- 每次改代码前先说明准备改哪些文件、为什么改
- 优先做最小可运行版本
- 不要未经确认引入复杂技术
- 禁止脚本批量删除文件或目录
- 旧 React/Vite 文件暂时保留，不要随意批量删除
- 如果后续要删除旧文件，必须一个一个处理，并先确认

补充约定：

- 优先延续现有小程序原生实现方式，不轻易替换技术方案
- 新功能优先在现有页面和 service 层基础上增量开发
- 页面不要直接堆复杂数据库逻辑
- 解析、提醒、菜谱推荐继续走 service 层
- 第一阶段 AI / OCR / 条形码解析继续保持 mock
- 第一阶段 AI 菜谱、天气和联网搜索继续保持 mock；真实接入时优先走云函数，不能把 API key 放小程序前端
- 对数据结构的修改要同步更新 `itemService` 清洗逻辑、页面渲染和文档
- 如果修改影响已有功能，至少跑 `npm run lint`，必要时跑 `npm run build` 和相关 `node --check`
- `miniprogram-automator` 当前只是临时测试工具，安装在 `/private/tmp/fridge-automator`，未写入项目依赖
- 微信开发者工具 CLI 当前没有数据库索引管理命令；`items` 目标组合索引已在 CloudBase 控制台确认存在：`openid_expire_created`，字段为 `_openid` 升序、`expireDate` 升序、`createdAt` 降序

## 维护说明

以后每次版本迭代后，应同步更新本文件中的以下内容：

- 当前已完成功能
- 当前数据结构
- 后续待开发功能
- 任何新增的重要开发约定
