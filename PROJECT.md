# 冰箱管家

## 项目名称

- 中文名：冰箱管家
- 英文目录名：fridge-miniapp

## 产品定位

冰箱管家是一个微信小程序，用于管理家庭冰箱中的食品和饮料库存。

当前第一阶段目标是完成最小可用版本：

- 快速记录冰箱食品
- 查看库存和过期状态
- 搜索和筛选库存
- 用日历查看到期食品
- 根据临期食品推荐简单菜谱
- 保留拍照和扫码录入入口，第一版使用 mock 解析

## 目标用户

- 独居、合租、家庭做饭用户
- 经常囤牛奶、酸奶、鸡蛋、蔬菜、水果、饮料、速冻食品的人
- 容易忘记食品保质期的人
- 想减少食品浪费的人

## 技术栈

- 微信小程序原生开发
- JavaScript
- WXML
- WXSS
- 微信云开发 / CloudBase
- 云数据库
- 云函数
- 云存储预留

当前不使用：

- React H5
- Vite
- Next.js
- Vercel
- Supabase
- 独立后端服务器
- 登录页
- Docker

## 当前 MVP 范围

第一阶段实现：

- 手动添加食品
- 编辑食品
- 删除食品，删除前二次确认
- 首页库存列表
- 顶部统计：总食品数、3 天内过期数、已过期数
- 过期状态计算
- 按品类筛选
- 按存放位置筛选
- 按名称搜索
- 小程序内日历页
- 今日菜谱页，本地规则推荐 3 个菜谱
- 快速录入页
- 拍照 mock 解析流程
- 扫码 mock 解析流程
- 解析确认页，用户确认或修改后才能保存
- getOpenId 云函数
- mock 解析云函数结构
- reminder service 结构预留

第一阶段暂不实现：

- 真实 OCR
- 真实条形码商品库
- 真实 AI 菜谱推荐
- 真实订阅消息提醒
- 获取用户头像、昵称、手机号
- 系统日历接入
- 多人共享冰箱

## 数据结构

### items

```js
{
  _id: string,
  _openid: string,
  name: string,
  category: '蔬菜' | '水果' | '肉蛋' | '乳制品' | '饮料' | '速冻' | '调料' | '主食' | '其他',
  quantity: number,
  unit: string,
  productionDate?: string,
  shelfLifeDays?: number,
  expireDate: string,
  storageLocation: '冷藏' | '冷冻' | '门架' | '其他',
  note?: string,
  source: 'manual' | 'photo' | 'barcode',
  barcode?: string,
  imageFileId?: string,
  parseConfidence?: number,
  parseRawText?: string,
  parseStatus?: 'mock' | 'pending' | 'success' | 'failed' | 'manual_confirmed',
  createdAt: number,
  updatedAt: number
}
```

### reminders

```js
{
  _id: string,
  _openid: string,
  itemId: string,
  itemName: string,
  expireDate: string,
  remindAt: string,
  remindType: 'one_day_before' | 'three_days_before' | 'on_expire_day',
  status: 'pending' | 'sent' | 'failed' | 'cancelled',
  subscribeMessageAuthorized: boolean,
  createdAt: number,
  updatedAt: number
}
```

### parseLogs

```js
{
  _id: string,
  _openid: string,
  type: 'photo' | 'barcode',
  imageFileId?: string,
  barcode?: string,
  result: {
    name?: string,
    category?: string,
    productionDate?: string,
    shelfLifeDays?: number,
    expireDate?: string,
    brand?: string,
    spec?: string
  },
  confidence: number,
  rawText?: string,
  status: 'mock' | 'success' | 'failed' | 'confirmed',
  createdAt: number
}
```

## 页面结构

- `pages/index`：首页，库存列表、统计、搜索、筛选
- `pages/item-form`：添加 / 编辑食品
- `pages/quick-add`：快速录入，手动添加、拍照 mock、扫码 mock
- `pages/parse-confirm`：解析确认页
- `pages/calendar`：日历页
- `pages/recipes`：今日菜谱页
- `pages/profile`：我的页，统计、清空数据、项目说明

底部 Tab：

- 冰箱
- 添加
- 日历
- 菜谱
- 我的

## 云函数说明

- `getOpenId`：获取当前用户 openid
- `parseFoodImage`：第一阶段返回 mock 图片解析结果
- `parseBarcode`：第一阶段返回 mock 条形码解析结果
- `generateRecipes`：第一阶段保留规则推荐结构
- `sendExpiryReminders`：第一阶段保留结构，不实际发送订阅消息

## service 层说明

- `services/itemService.js`：食品数据增删改查、搜索、清空
- `services/parseService.js`：拍照 / 扫码 mock 解析、解析结果标准化、过期日期计算
- `services/reminderService.js`：日历事件、提醒结构预留
- `services/recipeService.js`：规则菜谱推荐、AI 推荐接口预留

页面不要直接堆复杂业务逻辑。数据库、解析、提醒、菜谱推荐统一通过 service 层处理。

## 关键业务规则

### 过期状态

- `expireDate < today`：已过期，`overdue`
- 距今天 `<= 1` 天：1 天内过期，`critical`
- 距今天 `<= 3` 天：3 天内过期，`warning`
- 距今天 `<= 7` 天：7 天内过期，`soon`
- 其他：正常，`normal`

### 过期日期计算

- 如果填写 `productionDate` 和 `shelfLifeDays`，自动计算 `expireDate`
- 如果用户手动填写 `expireDate`，以用户填写值为准
- 缺失过期日期时不允许保存

### 解析可信度

- `confidence >= 0.8`：默认填入，但仍需用户确认
- `confidence < 0.8`：提示用户检查识别结果
- 解析结果必须进入确认页，确认或修改后才能保存

### 菜谱推荐

- 优先使用 3 天内过期食品
- 其次使用 7 天内过期食品
- 如果没有临期食品，则基于库存推荐
- 不推荐用户没有的核心食材
- 缺少调料时，可以写需要额外准备

## 开发约定

- 每次新增功能前先阅读 `PROJECT.md`
- 不要随意重构整个项目
- 每次只改和当前任务相关的文件
- 页面不要直接堆复杂业务逻辑
- 解析、提醒、菜谱推荐必须通过 service 层
- 第一阶段所有 AI / OCR / 条形码解析都先用 mock
- CloudBase 环境 ID 先使用 `YOUR_CLOUD_ENV_ID` 占位
- 后续在微信开发者工具中创建云开发环境后，再替换真实 envId
- 保证项目能在微信开发者工具中导入并运行

