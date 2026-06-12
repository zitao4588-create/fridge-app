# AGENTS.md

## 协作规则

- 始终用中文和用户沟通。
- 把用户当成 vibe coding 新手，解释时少用未说明的工程术语。
- 每次改代码前，先说明准备改哪些文件、为什么改。
- 优先小步迭代，先做最小可运行版本。
- 不要未经确认引入数据库重构、登录、支付、Docker、独立后端、微服务等复杂能力。
- 禁止脚本批量删除文件或目录；如确需批量删除，必须先停下来让用户确认。
- 旧文件清理、云端资源删除、历史函数删除都按高风险操作处理。

## 新会话启动流程

每次在本项目开启新会话时，先只读同步，不要直接改代码。

优先阅读：

- `AGENTS.md`
- `README.md`
- `PROJECT_CONTEXT.md`
- `TODO.md`
- `DECISIONS.md`
- `BUG_NOTES.md`
- `NEXT_VERSION_GUIDE.md`

阅读后先用中文复述：

- 当前项目目标
- 当前技术栈
- 已完成内容
- 当前待办事项
- 重要限制
- 下一步建议

等用户确认后再开始修改代码。

## 项目目标

本项目是微信小程序「冰箱小雷达」，用于家庭冰箱食品饮料库存管理。

当前主线是已上线的 v1.0 个人主体稳定版：

- 记录食材名称、品类、生产日期、保质期、过期日期、存放分区和备注
- 首页按 5 个冰箱分区查看库存、临期和过期状态
- 支持添加、编辑、删除、搜索食品
- 数据保存到微信云开发 CloudBase 云数据库，按当前微信用户 `_openid` 隔离
- 日历页展示到期日，并用本地算法计算「开饭雷达」可开饭指数
- 菜谱页当前是「菜谱搭配，敬请期待」占位页，只保留隐私说明入口

## 当前技术栈

- 微信小程序原生开发
- 原生 JavaScript
- WXML
- WXSS
- TDesign 小程序组件库，放在 `pkg-add` 分包独立 npm 中
- 微信云开发 / CloudBase

当前主要数据集合：

- `items`：当前 v1.0 主业务集合
- `reminders`：提醒能力预留
- `parseLogs`：识别能力历史 / 后续预留
- `fridgeZoneConfigs`：历史分区配置集合，当前 v1.0 首页使用固定 5 分区

当前云函数目录仍保留：

- `getOpenId`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

说明：v1.0 前端不开放 AI、拍照识别、条形码、支付、登录、UGC。相关云函数属于历史实现或后续企业主体版本预留。

## 当前已完成功能

- 微信小程序原生项目结构已收敛为纯小程序工程，旧 React/Vite H5 已移除
- 底部 3 个 Tab：冰箱、日历、菜谱
- 首页 5 个固定分区：
  - 冷藏区
  - 冷冻区
  - 门上储物格
  - 果蔬抽屉
  - 变温区
- 首页每个分区显示库存、临期、过期统计和横向食品卡片
- 首页支持搜索食材
- 首页支持点击食品卡片查看详情、编辑、删除
- 首页支持清空全部食品数据，带二次确认
- 添加 / 编辑页已移到分包 `pkg-add/item-form`
- 添加 / 编辑支持字段级校验
- 食材缩略图按品类 / 食材族群共用写实图
- 用户拍照图的显示接口已预留：`source === "photo"` 且有 `imageFileId` 时优先显示用户照片
- 日历页展示到期食品
- 日历页统计总库存、临期、过期
- 日历页「开饭雷达」使用纯本地评分算法，不调用云端 AI
- 菜谱页为占位页，不提供 AI 生成
- 隐私保护指引入口已接入 `wx.openPrivacyContract`
- 已完成轻奢黏土风格 UI 重构和基础无障碍整改
- 主包约 1.70MB，TDesign 放入分包，避免主包超过微信 2MB 限制

## 当前不做

v1.0 / 个人主体阶段不要做：

- 登录页
- 获取头像、昵称、手机号
- 支付 / 会员
- AI 菜谱生成
- 深度合成相关能力
- 拍照识别入口
- 条形码扫描入口
- 真实商品库
- 独立后端服务器
- Vercel
- Supabase
- Next.js
- Docker
- UGC 社区能力

AI / OCR / 菜谱生成 / 天气 / 第三方 API key 只能放在云函数侧，不能放到小程序前端。

## 当前数据结构

核心数据由 `services/itemService.js` 清洗后写入 CloudBase `items` 集合。

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

- 历史 `category: "肉蛋"` 会在图片映射里兼容。
- 历史 `storageLocation: "保鲜"` 会归一到 `果蔬抽屉`。
- `barcode` 字段在 `itemService` 中仍兼容，但 v1.0 不再产生新条码数据。

## 当前文件职责

- `app.js`：CloudBase 初始化
- `app.json`：页面、分包、底部 Tab 配置
- `app.wxss`：全局样式
- `custom-tab-bar/*`：自定义底部 TabBar
- `pages/index/*`：首页库存、分区、搜索、详情、删除、清空
- `pages/calendar/*`：到期日历、本地开饭雷达、统计清单
- `pages/recipes/*`：菜谱占位页和隐私说明入口
- `pkg-add/item-form/*`：添加 / 编辑食品表单
- `services/itemService.js`：食品增删改查、分页读取、轻缓存
- `services/reminderService.js`：日历事件和提醒能力预留
- `services/parseService.js`：识别能力历史 / 后续预留，当前不开放拍照入口
- `utils/constants.js`：品类、分区、来源标签
- `utils/date.js`：日期工具
- `utils/status.js`：过期状态
- `utils/visualAssets.js`：食材图片归桶
- `styles/tokens.wxss`：视觉 token
- `styles/tdesign-theme.wxss`：TDesign 主题
- `cloudfunctions/*`：云函数，当前部分为后续能力预留

## 后续优先建议

下一步先做上线后稳定性，不要急着恢复 AI 或拍照识别：

- 真机确认 5 个分区、添加 / 编辑、删除、搜索、清空流程
- 真机确认常见食材图片归桶是否正确
- 更新 README 截图，让截图和 v1.0 UI 一致
- 检查微信后台隐私协议、类目、服务内容与当前 v1.0 功能一致
- 评估订阅消息到期提醒，但先不要直接开启真实推送
- 继续控制主包体积，不要无控制新增 PNG

## 结束会话收尾流程

如果用户说「收尾」或「更新项目状态」，更新：

- `PROJECT_CONTEXT.md`
- `TODO.md`
- `BUG_NOTES.md`，如本轮涉及报错或失败尝试
- `DECISIONS.md`，如本轮做了技术选择或产品决策

更新内容包括：

- 本轮完成了什么
- 修改了哪些文件
- 当前还没解决的问题
- 已经尝试但失败的方案
- 下一步建议
- 重要注意事项
