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

当前主线是已正式发布的 v2.0 家庭库存闭环版：

- 记录食材名称、品类、日期、6 个存放分区和备注
- 数量由用户选择是否记录，只显示数字，不使用“个、盒、瓶”等单位
- 支持添加、编辑、删除、搜索，以及拖到餐盘完成“用掉”和一次撤销
- 个人库存按 `_openid` 隔离；家庭库存通过邀请制私有家庭共享和服务端权限校验访问
- 日历页展示到期日，并用本地算法计算「开饭雷达」可开饭指数
- 菜谱页保持占位，不开放 AI、识别、支付或公开 UGC

当前完成等级为 C3：正式后端、审核和发布已完成；线上核心流程回归和真实用户验证尚未完成，达到后才能升为 C4。

## 当前技术栈

- 微信小程序原生开发
- 原生 JavaScript
- WXML
- WXSS
- TDesign 小程序组件库，放在 `pkg-add` 分包独立 npm 中
- 微信云开发 / CloudBase

当前主要数据集合：

- `items`：个人库存主业务集合，保持 `PRIVATE`
- `reminders`：到期提醒记录
- `families`、`familyMembers`、`familyInvites`、`inventoryEvents`：v2.0 家庭共享集合，均为 `ADMINONLY`
- `parseLogs`：识别能力历史 / 后续预留
- `fridgeZoneConfigs`：历史分区配置集合，当前首页使用固定 6 分区

当前云函数目录仍保留：

- `getOpenId`
- `familyInventory`
- `parseFoodImage`
- `parseBarcode`
- `generateRecipes`
- `sendExpiryReminders`

说明：v2.0 前端不开放 AI、拍照识别、条形码、支付、登录页或公开 UGC。AI / 识别云函数已设置默认关闭总闸门，属于历史实现或后续企业主体版本预留。

## 当前已完成功能

- 微信小程序原生项目结构已收敛为纯小程序工程，旧 React/Vite H5 已移除
- 底部 3 个 Tab：冰箱、日历、菜谱
- 首页 6 个固定分区：
  - 冷藏区
  - 冷冻区
  - 门上储物格
  - 果蔬抽屉
  - 变温区
  - 常温储物
- 首页每个分区显示库存、临期、过期统计和横向食品卡片
- 首页支持搜索食材
- 首页支持点击食品卡片查看详情、编辑、删除
- 首页支持清空全部食品数据，带二次确认
- 首页支持可选数量；有数量时餐盘消耗默认减 1，没有数量或减到 0 时移出库存
- 长按拖动食材到餐盘期间页面和横向列表保持静止，松手后恢复滚动
- 添加 / 编辑页已移到分包 `pkg-add/item-form`
- 添加 / 编辑支持字段级校验
- 食材缩略图按品类 / 食材族群共用写实图
- 用户拍照图的显示接口已预留：`source === "photo"` 且有 `imageFileId` 时优先显示用户照片
- 日历页展示到期食品
- 日历页统计总库存、临期、过期
- 日历页「开饭雷达」使用纯本地评分算法，不调用云端 AI
- 菜谱页为占位页，不提供 AI 生成
- 隐私保护指引入口已接入 `wx.openPrivacyContract`
- 已完成邀请制私有家庭共享：创建、邀请、加入、共同写入、退出和解散
- 家庭数据只通过 `familyInventory` 云函数访问，服务端从微信上下文读取身份并校验角色
- 已完成轻奢黏土风格 UI 重构和基础无障碍整改
- v2.0 上传包体为总包 720.4 KB、主包 437.5 KB、`pkg-add` 分包 282.9 KB

## 当前不做

v2.0 / 个人主体阶段不要做：

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
  quantityTracked: boolean;
  quantity: number;
  unit: "";
  productionDate?: string;
  shelfLifeDays?: number;
  expireDate: string;
  storageLocation: "冷藏" | "冷冻" | "门架" | "果蔬抽屉" | "变温" | "常温";
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
- `pages/family/*`：家庭创建、邀请、成员管理、退出和解散
- `pkg-add/item-form/*`：添加 / 编辑食品表单
- `services/itemService.js`：食品增删改查、分页读取、轻缓存
- `services/familyService.js`：家庭状态和 `familyInventory` 云函数调用
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

下一步先完成 v2.0 上线后回归和稳定性观察，不要恢复 AI、拍照识别或健康余额：

- 记录正式发布时间和后台线上版本截图
- 回归个人库存、餐盘消耗、家庭邀请、共同写入、退出 / 解散和旧数据兼容
- 确认老用户普通升级后原有 `items` 可见；重点观察加入家庭后的库存迁移和退出行为
- 观察 7 天真实反馈、错误日志和提醒数据，再决定 v2.1 是否立项
- `v2.0.x` 只处理审核整改和线上 P0/P1，不扩功能
- 健康余额继续后置；AI、识别、会员和支付保留为企业主体候选

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
