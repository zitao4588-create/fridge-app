# TODO.md

最后更新：2026-05-28

## 当前主线

项目当前主线是微信小程序“冰箱雷达”，不是旧的 React/Vite H5。

第一阶段 MVP 已经完成到可以在微信开发者工具中运行和验收。

当前首页已从普通库存列表和旧冰箱模板热区方案，升级为“分区 DIY 货架 + 横向食品卡片 + 分区添加入口 + 统计清单弹窗”的交互方式。

当前日历页新增“临期去化”模块，菜谱页已固定为库存感知的 AI 菜谱体验页。AI / OCR / 条码能力已在云函数侧接入真实调用路径，但仍保留 mock 兜底；联网搜索当前未启用，真实天气仍未接入。

## 已完成

- 使用现有目录改造为微信小程序项目
- 保留旧 React/Vite 文件，未批量删除
- 创建小程序基础文件：
  - `app.js`
  - `app.json`
  - `app.wxss`
  - `project.config.json`
  - `sitemap.json`
- 创建 `PROJECT.md`
- 创建当前注册的 7 个小程序页面：
  - 首页 `pages/index`
  - 添加 / 编辑页 `pages/item-form`
  - 快速录入页 `pages/quick-add`
  - 解析确认页 `pages/parse-confirm`
  - 小票批量确认页 `pages/batch-parse-confirm`
  - 日历页 `pages/calendar`
  - AI 菜谱页 `pages/recipes`
- `pages/profile` 文件暂时保留，但当前不再注册为页面，也不再出现在底部 Tab
- 创建 service 层：
  - `itemService`
  - `parseService`
  - `reminderService`
  - `recipeService`
- 创建工具模块：
  - 常量
  - 日期
  - 过期状态
- 创建并部署云函数：
  - `getOpenId`
  - `parseFoodImage`
  - `parseBarcode`
  - `generateRecipes`
  - `sendExpiryReminders`
- 创建 CloudBase 数据库集合：
  - `items`
  - `reminders`
  - `parseLogs`
  - `fridgeZoneConfigs`
- 完成手动添加食品
- 完成食品列表展示
- 完成编辑食品
- 完成删除食品和二次确认
- 完成食品名称搜索
- 曾完成品类筛选和存放位置筛选，当前首页一屏方案已暂时移除常驻筛选区
- 完成顶部统计
- 完成过期状态计算
- 完成日历页展示到期食品
- 完成日历页“临期去化”模块：
  - 展示今日到期、3 天内、7 天内、已过期数量
  - 统计卡片只保留数字和标题，不显示“查看清单”小字
  - 点击统计卡片仍可打开对应库存清单
  - 展示 7 天内优先处理食材
  - 生成 3 道临期食材优先消耗菜谱卡片
  - 去化菜谱卡片展示已有食材、缺少食材、可直接做 / 还差几样、优先用掉、耗时、难度和标签
  - 已过期食品只做安全检查和丢弃提醒，不默认推荐食用
- 完成 AI 菜谱体验页：
  - 顶部吉祥物菜谱推荐 banner
  - 顶部展示节气、季节、天气、湿度 mock 环境信息
  - 进入菜谱页默认不展示攻略内容，点选入口后再生成
  - 读取冰箱库存并标记已有食材、缺少食材、可直接做 / 还差几样
  - 临期食材加权并提示“建议优先用掉”
  - 带菜品图片的推荐卡片和菜谱详情弹窗
  - “我来选食材”半屏弹窗，支持库存点选、搜索和临时食材
  - “我来选食材”当天本地缓存
  - 菜谱盲盒入口一次展示 3 道菜
- 完成拍食品 mock 解析流程
- 完成拍包装 / 条码 mock 解析流程
- 完成拍购物小票 mock 批量解析流程
- 完成 `parseFoodImage` 云函数真实 OCR / 图像标签 / AI 结构化路径，并保留 mock 兜底
- 完成 `parseBarcode` 云函数联网搜索 + AI 结构化预留路径；当前搜索未启用时保留 mock 兜底
- 完成 `generateRecipes` 云函数 CloudBase AI 菜谱路径；模型额度 / 频率受限时保留 mock 兜底
- 已用 CloudBase CLI 固定版本部署 `parseFoodImage`、`parseBarcode`、`generateRecipes`
- 完成解析结果确认后保存
- 完成首页“智能录入”入口
- 完成首页“确定放哪 / 不确定放哪”指示牌式入口
- 完成分区弹窗内手动添加、拍食品、拍包装 / 条码入口
- 完成智能录入页手动输入名称后推荐分区
- 完成单品识别推荐分区和“采纳推荐”
- 完成小票批量确认页，可逐条选择分区并批量保存
- 完成微信开发者工具运行配置
- 完成 README 主线说明对齐：当前 README 已改为微信小程序“冰箱管家”说明，不再是 Vite 模板
- 完成独立 Git 仓库初始化
- 完成 `.gitignore` 版本管理边界收紧：
  - 忽略 `node_modules/`
  - 忽略 `dist/`
  - 忽略 `miniprogram_npm/`
  - 忽略 `project.private.config.json`
  - 忽略 `.env` 和本地配置文件
- 完成敏感配置风险检查：
  - 未发现 `.env` 文件
  - 未发现 API key、token、password 类密钥文件
  - 当前 AppID 和 CloudBase 环境 ID 已作为项目配置记录
- 完成第一次 Git 基线提交，后续改动可以按差异追踪
- 完成首页空状态优化：
  - 无库存时提示“冰箱还是空的”
  - 搜索或筛选无结果时提示清空筛选
- 完成删除后的页面内提示
- 完成添加 / 编辑页字段级校验提示
- 完成添加 / 编辑页选择体验优化：
  - 品类可直接点选
  - 单位可直接点选
  - 存放位置可直接点选
  - 选中项会高亮显示
- 完成首页真实冰箱模板图能力：
  - 使用用户提供的 7 张冰箱模板图
  - 默认展示三门冰箱
  - 支持法式多门、十字门、对开门、三门、双门、单门等模板配置
  - 当前取消冰箱类型选择，首页固定使用默认三门冰箱模板
  - 底部 Tab 已取消“我的”，当前只保留 `冰箱 / 日历 / 菜谱`
  - 分区热区点击后打开底部分区清单
  - 分区清单按品类分组
  - 分区清单内可编辑食品
  - 分区清单内可添加食品到当前分区
- 新增 `变温` 存放位置
- 取消“果蔬抽屉 / 保鲜”独立区域，新数据统一归入 `冷藏`
- 完成 7 张冰箱模板图文字清理：
  - 去掉图片顶部大标题
  - 去掉绿色抽屉里的“果蔬抽屉”文字
  - 去掉图片内部“冷藏区 / 变温区 / 冷冻区 / 门上储物格”等分区文字
- 完成首页冰箱分区数量标记优化：
  - 分区统计点显示在冰箱图片对应分区内
  - 统计点显示三项：`总 / 临 / 过`
  - `总` 包含临期和已过期
  - `临` 是 0 到 3 天内到期，不包含已过期
  - `过` 不论是否为 0 都固定红色显示
  - 每个分区可通过 `markerPoint` 单独微调位置
- 完成首页添加入口收口：
  - 移除顶部通用添加按钮
  - 移除底部 Tab 的“添加”
  - 只能从点击冰箱图片分区后的分区清单添加
- 完成首页常驻列表收口：
  - 去掉首页底部常驻食品列表
  - 点击全局“总食品数 / 临期 / 已过期”弹出对应列表
  - 搜索改为一个搜索框加一个确定按钮，点击后弹出搜索结果
- 完成首页一屏布局优化：
  - 首页自身不做上下左右滚动
  - 冰箱图、图片内分区统计、全局统计、搜索框固定在一屏内
- 完成截图反馈细节优化：
  - 去掉“我的冰箱”下方说明文字
  - 冰箱图内容上移，减少顶部空档
  - 搜索“确定”按钮缩小并居中
  - 底部三项全局统计字体加粗加大
- 完成弹窗清单进一步优化：
  - 分区弹窗和首页三色统计弹窗只保留标题
  - 首页三色统计弹窗去掉顶部关闭按钮
  - 弹窗列表去掉重复的数量、位置和状态徽标
  - 分区弹窗食品列表新增删除按钮
- 完成首页搜索按钮真实缩短：
  - 原生 `button` 会被小程序默认最小宽度撑大
  - 已改为可点击 `view`
  - 自动化验证实际宽度从 `184px` 缩短到 `39px`
- 完成首页冰箱分区统计卡片调整：
  - 统计卡片整体放大
  - 冷藏、冷冻、变温等非门架功能区卡片按各自热区中心定位
  - 门上储物格卡片继续显示，并保留原有 `markerPoint` 位置
- 完成首页分区 DIY 货架化改造：
  - 首页顶部显示全局三色统计卡和搜索框
  - 首页保留“确定放哪 / 不确定放哪”添加引导
  - 首页展示可启用 / 隐藏 / 排序的 5 个标准分区
  - 分区本身只作为添加入口
  - 点击分区弹出手动添加、拍食品、拍包装 / 条码
  - 点击分区 `总 / 临 / 过` 继续弹出对应清单
  - 食品卡片横向滑动展示
  - 点击食品图片打开详情面板，可编辑和删除
  - 食品卡片文字区按正常 / 临期 / 已过期三色区分
  - 新增 `果蔬抽屉` 独立存放位置
  - 拍食品会上传照片到 CloudBase 云存储并保存 `imageFileId`
  - 非拍食品来源使用本地图标缩略图
- 完成 CloudBase 集合 `fridgeZoneConfigs` 创建：
  - 通过临时云函数 `setupFridgeZoneConfigs` 调用云端 SDK 创建集合
  - 返回结果：`{"ok":true,"created":true,"message":"created"}`
- 完成 CloudBase 控制台权限确认：
  - `fridgeZoneConfigs` 权限为“仅创建者可读写”
- 完成本轮微信开发者工具自动化测试，测试数据已清理
- 完成 UI 风格迁移第一轮整体换肤：
  - 新增 `styles/tokens.wxss`
  - 新增 `styles/components.wxss`
  - 新增 `styles/fridge-theme.wxss`
  - `app.wxss` 引入全局视觉基础设施
  - 可见产品名统一为“冰箱雷达”
  - 首页分区外框升级为轻拟物冰箱内部效果
  - 首页主标题下方的小字说明已移除
  - 添加 / 编辑页、智能录入页、识别确认页、小票批量确认页、日历页、菜谱页、保留的我的页完成奶油白 / 薄荷绿 / 浅橙 / 冰蓝视觉统一
  - 本轮没有新增页面、删除页面、修改接口、修改数据库或修改字段
- 完成 UI 风格迁移第二轮“奶油玩具冰箱”重构：
  - 全局 token 收敛为奶油背景、薄荷主色、冰蓝冰箱、蜂蜜橙 CTA、珊瑚红危险色
  - 首页保留强拟物冰箱结构，但重做外壳、内胆、玻璃抽屉和食材托盘材质
  - 首页新增 PNG 吉祥物状态卡
  - 首页非拍照食品从汉字圆圈占位改为本地品类图片 fallback
  - 菜谱页改为吉祥物 banner、环境信息、四入口 tab 和带菜品图片的推荐卡
  - `recipeService` 只补 mock 菜谱 `image` 字段，不改推荐逻辑
  - 新增 `images/mascot/`、`images/foods/`、`images/recipe/`、`images/decor/` 本地 PNG 资产
  - 微信开发者工具 CLI 预览编译通过，主包大小约 `1.8 MB`
- 完成“我来选食材”功能优化：
  - 保留“我来选食材”名称
  - 弹窗视觉改为奶油陶瓷料理碗，不再使用粗糙锅盖 / 把手 / 蒸汽
  - 支持从冰箱库存点选未过期食材
  - 支持搜索库存食材
  - 支持输入任意临时食材参与本次 mock 菜谱生成
  - 临时食材不自动入库，生成后可跳转添加页预填名称和品类
  - 同一天内通过 `wx.setStorageSync` 恢复最近一次生成结果
  - 点“清空”、切到“菜谱盲盒”或第二天会清掉本地缓存

## 本轮验收已通过

- 微信开发者工具可以导入并运行
- 可以添加食品
- 可以编辑食品
- 可以删除食品
- 食品数据保存到 CloudBase 云数据库
- 每条食品数据绑定当前用户 `_openid`
- 首页能通过分区弹窗、统计弹窗和搜索弹窗查看食品列表
- 首页能看到总数、3 天内过期数、已过期数
- 过期状态显示准确
- 搜索可用；常驻筛选区已从当前首页方案中移除
- 日历页能显示食品到期日期
- 菜谱页能根据临期食品推荐菜谱
- 拍食品入口能返回 mock 解析结果
- 拍包装 / 条码入口能返回 mock 解析结果
- 小票入口能返回 mock 批量解析结果
- mock 解析结果必须经过用户确认后才能保存
- 项目根目录有 `PROJECT.md`
- 首页空状态文案和操作入口可用
- 表单字段级校验可用
- 搜索无结果后可以一键清空筛选
- 删除后页面内提示可用
- 本轮自动化测试通过 15 项断言
- 品类 / 单位 / 存放位置快捷选择自动化测试通过 15 项断言
- 复跑核心流程自动化测试通过
- `node --check pages/index/index.js` 通过
- `node --check pages/item-form/item-form.js` 通过
- `node --check utils/constants.js` 通过
- `npm run lint` 通过
- `npm run build` 通过
- 7 张冰箱模板图均为正常 JPEG 文件
- 微信开发者工具自动化测试通过，截图：`/private/tmp/fridge-automator/fridge-layout-test.png`
- 分区三项统计版已通过：
  - `node --check pages/index/index.js`
  - `npm run lint`
  - `npm run build`
  - 微信开发者工具自动化测试
- 首页入口收口和一屏布局本轮验证通过：
  - `node --check pages/index/index.js`
  - `node --check pages/item-form/item-form.js`
  - `node --check pages/parse-confirm/parse-confirm.js`
  - `npm run lint`
  - `npm run build`
- 截图反馈优化后验证通过：
  - `node --check pages/index/index.js`
  - `npm run lint`
  - `npm run build`
  - 7 张冰箱模板图仍为正常 JPEG 文件
- 2026-05-22 弹窗、搜索按钮、分区卡片补充验证通过：
  - `node --check pages/index/index.js`
  - `npm run lint`
  - `npm run build`
  - 微信开发者工具自动化尺寸断言
  - 微信开发者工具自动化分区卡片定位断言
- 2026-05-22 添加页表单简化和日期弹窗验证通过：
  - 添加页已去掉数量、单位、存放位置可见填写项
  - 添加页已去掉大标题下方的小字说明
  - 日期支持“生产日期 + 保质期”和“直接选择过期日”两种方式
  - 日期选择改为点击日期行后弹出底部日历窗口
  - 日历弹窗没有关闭按钮，点选日期后自动关闭
  - 年月信息保持单行，上月 / 下月按钮已缩小
  - 品类按钮固定三列，不再横向溢出
  - `node --check pages/item-form/item-form.js`
  - `npm run lint`
  - `npm run build`
  - 微信开发者工具自动化通过 16 项添加页断言
- 2026-05-22 `items` 组合索引已在 CloudBase 控制台确认存在：
  - 索引名称：`openid_expire_created`
  - `_openid` 升序
  - `expireDate` 升序
  - `createdAt` 降序
- 2026-05-23 第二轮运行体检通过：
  - 小程序 JS、service、utils、云函数 `node --check` 全部通过
  - `npm run lint` 通过
  - `npm run build` 通过
  - 15 个 JSON 文件可解析
  - 7 个页面文件完整
  - 微信开发者工具 smoke test 通过 17 项断言
  - 完整 CloudBase 流程验收通过 12 项断言
  - 本轮临时测试数据已清理
- 2026-05-24 拍照添加功能融合基础验证通过：
  - `node --check pages/index/index.js`
  - `node --check pages/quick-add/quick-add.js`
  - `node --check pages/parse-confirm/parse-confirm.js`
  - `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
  - `node --check services/parseService.js`
  - `npm run lint`
  - `npm run build`
- 2026-05-24 AI 菜谱与临期去化基础验证通过：
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
  - 19 个严格 JSON 配置文件解析通过
  - `git diff --check`
  - `services/recipeService.js` VM 抽样输出检查
  - `npm run lint`
  - `npm run build`
- 2026-05-24 AI 菜谱与日历去化最终 UI 调整验证通过：
  - `node --check pages/calendar/calendar.js`
  - `node --check pages/recipes/recipes.js`
  - `node --check services/recipeService.js`
  - `node --check cloudfunctions/generateRecipes/index.js`
  - `git diff --check`
  - `npm run lint`
  - `npm run build`
  - 新真机预览二维码已生成：`/private/tmp/fridge-app-preview-qrcode-20260524-calendar-recipe-v2.png`
- 2026-05-24 首页分区 DIY 货架化改造验证通过：
  - `node --check pages/index/index.js`
  - `node --check pages/item-form/item-form.js`
  - `node --check pages/parse-confirm/parse-confirm.js`
  - `node --check pages/batch-parse-confirm/batch-parse-confirm.js`
  - `node --check services/parseService.js`
  - `node --check services/zoneConfigService.js`
  - `node --check utils/constants.js`
  - `npm run lint`
  - `npm run build`
  - 微信开发者工具自动化首页分区货架行为检查通过
  - CloudBase 集合 `fridgeZoneConfigs` 创建成功
- 2026-05-24 UI 风格迁移收尾验证通过：
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
  - 微信开发者工具中确认首页、日历、菜谱页面可打开并显示
- 2026-05-24 默认 TabBar 回退与图标优化验证通过：
  - `node --check pages/index/index.js`
  - `node --check pages/calendar/calendar.js`
  - `node --check pages/recipes/recipes.js`
  - `git diff --check`
  - `npm run lint`
  - `npm run build`
  - 微信开发者工具中确认原生 TabBar 显示本地图标和浅薄荷底色

## 当前待办

优先级高：

- 稍后到 CloudBase 控制台重试删除临时云函数 `setupFridgeZoneConfigs`
- 真机预览默认 TabBar 优化效果：
  - 底部图标是否清晰
  - 选中态绿色是否明显
  - 浅薄荷背景是否比纯白更融入页面
  - 原生 TabBar 底部安全区是否可接受
- 真机预览 UI 风格迁移后的整体效果：
  - 首页冰箱分区框架是否像冰箱内部，而不是普通卡片堆叠
  - 主标题下方小字是否已消失
  - 分区玻璃隔层、透明抽屉、高光和阴影是否自然
  - 添加页输入框和按钮触控是否舒服
  - 智能录入页四个入口是否容易点
  - 识别确认页和小票批量确认页是否仍清楚可编辑
  - 日历页临期 / 过期颜色是否醒目但不刺眼
  - 菜谱页是否更有食欲感，弹窗是否好读
  - 小屏手机是否有文字溢出或异常横向滚动
- 观察微信开发者工具 Console 中历史 `Error: timeout` 是否影响真机功能；如果真机也出现阻塞，再单独排查。
- 真机预览新首页分区货架：
  - 顶部全局三色卡和搜索框是否顺手
  - “确定放哪 / 不确定放哪”引导是否仍清楚
  - 5 个分区货架视觉密度是否舒服
  - 食品卡片横向滑动是否顺手
  - 分区点击是否只进入添加方式面板
  - 分区 `总 / 临 / 过` 是否能打开对应清单
  - 食品图片详情面板的编辑 / 删除是否好用
  - 分区 DIY 面板启用 / 隐藏 / 上移 / 下移是否好懂
- 扫描最新真机预览二维码 `/private/tmp/fridge-app-preview-qrcode-20260524-calendar-recipe-v2.png`，确认当前预览不是旧缓存页面
- 真机预览完整核心流程：
  - 首页分区货架是否稳定显示
  - 横向食品卡片是否顺手
  - 分区点击是否只打开添加方式面板
  - 分区统计是否能打开对应清单
  - 食品详情面板是否好用
  - 添加页日期弹窗是否顺手
  - 手动添加、编辑、搜索、删除、mock 解析保存是否和自动化结果一致
- 真机预览智能录入新增流程：
  - 首页“智能录入”入口是否好找
  - 首页两个指示牌是否清楚表达“确定放哪 / 不确定放哪”
  - 分区弹窗内手动添加、拍食品、拍包装 / 条码三个入口是否好点
  - 智能录入手动输入名称后推荐分区是否符合预期
  - 拍食品后是否默认当前分区，并可采纳推荐分区
  - 扫码条形码取消时是否不产生脏数据
  - 拍包装说明后确认页是否可保存
  - 拍购物小票后批量确认页是否能逐条调整分区并保存
- 真机预览添加页：
  - 品类按钮是否仍稳定三列
  - 生产日期弹窗是否顺手
  - 过期日期弹窗是否顺手
  - 年月标题是否仍保持单行
  - 上月 / 下月按钮是否过小或不好点
  - 从冰箱分区进入添加后，保存的食品是否仍归入正确分区
- 编辑旧食品时复查：
  - 原数量、单位、存放位置虽然不显示，但不要被意外清空
  - 名称、品类、日期、备注仍可正常修改
- 在微信开发者工具里重点检查首页分区 DIY 效果：
  - 5 个标准分区启用 / 停用 / 上移 / 下移是否清楚
  - 分区添加入口是否不误打开清单
  - 分区 `总 / 临 / 过` 是否能准确筛出清单
  - 食品卡片状态三色是否清楚
  - 拍食品照片和本地图标缩略图是否都能正常显示
- 真机预览首页是否真正稳定，不出现异常横向滚动
- 检查真机预览效果
- 根据实际手机效果调整页面间距、字体和按钮触控区域
- 用户可在真机上手动复查：分区添加、分区统计清单、全局统计弹窗、搜索弹窗、食品图片详情、编辑、删除、拍照 mock、扫码 mock、日历、菜谱
- 真机预览日历页临期去化：
  - 临期统计是否清楚
  - 7 天内优先处理食材是否容易理解
  - 已过期安全提醒是否足够醒目
  - 去化推荐菜谱卡片是否过密或过长
  - 点击彩色统计卡片后库存清单弹窗是否好用
- 真机预览 AI 菜谱页：
  - 吉祥物 banner 和环境信息是否简洁
  - 初始下方空白是否符合预期
  - 点击 `菜谱盲盒 / 我来选食材` 后是否才生成对应攻略内容
  - 菜品图片卡片和已有 / 缺少食材信息是否拥挤
  - 菜谱详情弹窗是否好读
  - “我来选食材”料理碗弹窗是否好点
  - 临时食材、切页恢复和加入库存跳转是否符合预期

优先级中：

- 用户当前明确不想使用 custom TabBar；如果后续仍希望解决原生 TabBar 底部白边过厚、圆角或悬浮胶囊效果，必须重新确认是否接受 custom TabBar，再单独开一轮做。
- `custom-tab-bar/` 目录当前未启用且未删除；如后续确认不再需要，按项目安全规则逐个文件删除，不能脚本批量删除目录。
- 如果真机反馈逐月切换日期太慢，再考虑给日期弹窗补一个轻量年月切换入口
- 如果后续支持两个及以上冰箱，再重新设计冰箱切换入口和数据结构
- 分区清单继续优化：
  - 增加按过期时间排序提示
  - 继续优化三色状态清单的触控和空状态
- 根据真机效果继续优化首页货架布局和分区统计触控面积
- 增强食品详情面板，补充备注、来源、生产日期等更多信息
- 优化日历页当天到期食品为空时的提示
- AI 菜谱体验继续打磨：
  - 丰富 mock 菜谱库
  - 增加按早 / 中 / 晚餐的推荐切换
  - 增加“只看可直接做 / 允许缺 1 样”的轻量筛选
  - 已完成最近一次“我来选食材”的当天本地缓存；后续评估是否升级为云端菜谱历史

后续第二阶段：

- 拍食品图片上传到 CloudBase 云存储已完成；后续继续完善云存储清理和图片压缩
- 真机验证 `parseFoodImage` 拍食品 / 拍包装 / 小票真实识别链路，并根据日志调整提示词和字段兜底
- 如果要启用条码真实搜索，配置联网搜索 API key，并把 `FRIDGE_ENABLE_REAL_SEARCH` 改为 `true`
- 增加解析置信度字段级提示
- 接入订阅消息授权
- 创建真实 reminder 记录
- 云函数定时扫描临期食品
- 发送订阅消息提醒
- 继续观察真实 AI 菜谱调用的 429 / 额度问题，稳定后再减少 mock 依赖
- 接入真实天气 API，但页面仍通过 service 层和云函数调用

## 暂不做

- 不做登录页
- 不获取用户头像、昵称、手机号
- 不做独立后端服务器
- 不接 Vercel
- 不接 Supabase
- 不做 React H5 主线
- 不接 Next.js
- 不在小程序前端直连真实 OCR / AI / 条形码商品库
- 不在小程序前端保存任何 API key
- 不启用真实天气 API
- 不接系统日历
- 不做冰箱类型选择；后续只有支持两个及以上冰箱时，再重新设计冰箱切换入口
- 当前不启用 custom TabBar；原生 TabBar 已通过浅薄荷底色和本地图标做轻量优化
- 不做复杂权限体系
- 不做支付
- 不做 Docker

## 注意事项

- 旧 React/Vite 文件暂时保留，不要随意批量删除。
- 如果后续要删除旧文件，必须一个一个处理，遵守项目安全约束。
- 小程序页面不要直接堆复杂业务逻辑。
- 解析、提醒、菜谱推荐继续走 service 层。
- 第一阶段 AI / OCR / 条形码 / 小票解析继续保持 mock。
- 首页当前主线是分区 DIY 货架，不再以冰箱模板热区作为主展示。
- 冰箱类型选择已取消，不要继续依赖本地 `selectedFridgeLayoutKey` 作为当前主线能力。
- 每次新增功能前先阅读 `PROJECT.md` 和 `PROJECT_CONTEXT.md`。
- `miniprogram-automator` 仅作为临时测试工具安装在 `/private/tmp/fridge-automator`，不要写入项目依赖，除非后续明确要建立正式自动化测试。
- `fridge-app` 已有独立 Git 仓库；后续每轮功能修改前后都先看 `git status`，避免把临时文件误纳入版本库。
- `node_modules` 里有旧 H5 依赖残留的 extraneous 包，本轮未清理；后续如要处理，先确认是否仍保留旧 H5 兼容构建。

## 2026-05-25 新增待办与注意事项

优先级高：

- 在微信开发者工具和真机预览中复查日历页月份栏：
  - 中间月份是否稳定显示
  - “上月 / 下月”是否大小合适
  - 左右按钮是否不会遮挡月份
- 复查日历页临期统计区：
  - 今日到期、3 天内、7 天内、已过期四张统计卡必须保留
  - 右侧不能再出现遮挡统计卡的装饰圆块
  - 删除选中日期标题条后，当天到期列表和空状态是否仍容易理解
- 复查首页分区管理弹窗：
  - 五个分区卡片是否完整显示且不需要内部滚动
  - 单指拖动排序是否顺手
  - “显示 / 删除”是否容易理解
  - 保存按钮位置是否符合截图预期并且不被底部 TabBar 或安全区遮挡
- 复查智能录入页和分区添加弹窗：
  - 横版整行按钮是否真正拉满
  - 说明文字是否保持单行，不再跨行
  - 点击区域是否足够大

优先级中：

- 首页 `pages/index/index.wxss` 仍然偏大，后续继续优化时先局部清理未使用样式，再继续加样式，避免越叠越难维护。
- 后续任何涉及“删掉红框 / 保留蓝框”的截图反馈，先用中文明确复述目标区域，再改代码。
- 日历页月份栏后续不要再使用复杂绝对定位或原生 `button` 参与核心布局；当前稳定方案是普通 `view` 三段布局。

本轮已完成但需要记住：

- 智能录入页“第一阶段提示”已删除。
- 首页和分区添加弹窗的添加方式已统一为横版整行按钮。
- 分区管理中的“删除”只是隐藏分区，不删除食材数据。
- 日历页统计卡保留四项，不要因为删除装饰误删统计项。

## 2026-05-27 新增待办与注意事项

说明：

- 本节覆盖 2026-05-25 关于“日历页统计卡保留四项”的待办描述。
- 2026-05-27 最新方案是：日历页常驻统计改为 `库存 / 临期 / 过期` 三色统计，首页不再展示这组三色统计。

优先级高：

- 在微信开发者工具中复查首页：
  - 首页是否已经不显示顶部三色统计卡。
  - 搜索、添加引导、冰箱分区和分区管理入口是否仍正常。
  - 分区 `+` 添加、分区 `总 / 临 / 过` 清单、食品详情弹窗是否仍正常。
- 在微信开发者工具中复查日历页：
  - 日历下方是否显示 `库存 / 临期 / 过期` 三色统计。
  - 三色统计点击后是否能打开对应清单。
  - 当天无到期食品和有到期食品两种状态是否都正常。
  - `开饭雷达检测报告` 下方菜谱卡是否可点击打开做法步骤。
- 在微信开发者工具中复查 AI 菜谱页：
  - 本节为 2026-05-27 旧版待办，已被 2026-05-28 “奶油玩具冰箱”四入口方案覆盖。
  - 当前应检查吉祥物 banner、环境信息、`菜谱盲盒 / 我来选食材` 两个入口、菜品图片卡和详情弹窗。
  - 重点点验“我来选食材”的料理碗弹窗、库存点选、临时食材、生成结果恢复和加入库存跳转。

优先级中：

- 继续扩充 mock 菜谱库，让“菜谱盲盒”更容易命中真实库存食材。
- 继续打磨菜谱推荐理由长度：
  - 如果卡片过高，可以考虑限制 2 到 3 行，详情弹窗展示完整理由。
  - 如果理由太像模板文案，可以增加更多库存、节气和天气分支。
- 评估是否把节气计算挪到 `utils/date.js` 或单独 `utils/solarTerm.js`，避免页面 JS 持续变大。
- 评估是否把 `recipeService` 中的 mock AI 提示词结构同步到云函数 `generateRecipes`，为第二阶段真实 AI 接入做准备。
- 首页 `pages/index/index.wxss` 仍然偏大，后续改首页时先清理未使用样式，再继续加视觉效果。

后续第二阶段：

- 如果要接真实 AI 菜谱推荐：
  - API key 必须放云函数或服务端环境，不能放小程序前端。
  - 小程序页面仍通过 `recipeService` 或云函数调用，避免页面直接堆复杂 prompt 和网络逻辑。
  - 真实 AI 输出需要结构化校验，不能直接信任模型返回字段。
- 如果要做精确节气：
  - 当前近似日期可换成年度节气表或云函数计算。
  - 展示逻辑仍保留 `当日 / 还差 X 天 / 已过 X 天`。

暂不做：

- 2026-05-28 最新方案：菜谱页当前只保留 `菜谱盲盒 / 我来选食材` 两个入口，仍全部使用 mock 结构，不接真实外部 API。
- 不恢复首页顶部三色统计卡。
- 不恢复日历页常驻四项临期统计卡，除非用户重新要求。
- 不接真实 AI、真实天气、真实联网搜索。

## 2026-05-28 GitHub 上传收尾

已完成：

- 已创建 GitHub 私有仓库：
  - `https://github.com/zitao4588-create/fridge-app`
- 已把本地仓库 `origin` 指向：
  - `https://github.com/zitao4588-create/fridge-app.git`
- 已推送 `main` 分支到 GitHub，并设置本地 `main` 跟踪 `origin/main`。
- 已提交上传前最新代码：
  - `a985244 feat: update fridge app mvp`
- 已把微信开发者工具预览产物加入 `.gitignore`：
  - `preview-info.json`
  - `preview-qrcode.png`
- 已确认预览产物没有进入 Git 提交。

本轮验证已通过：

- `git diff --check`
- 核心小程序 JS 和 service 的 `node --check`
- `npm run lint`
- `npm run build`
- GitHub 仓库远程信息确认：
  - 仓库：`zitao4588-create/fridge-app`
  - 可见性：`PRIVATE`
  - 默认分支：`main`

当前待办：

- 建议配置正式 Git 提交身份：
  - `git config --global user.name "你的名字"`
  - `git config --global user.email "你的 GitHub 邮箱"`
- 后续每轮修改后继续提交并推送到 `origin/main`。
- 如果未来要公开仓库，先复查 AppID、CloudBase 环境 ID、项目文档和截图资源是否适合公开。

注意事项：

- 仓库当前保持私有。
- 不要上传 `.env`、`project.private.config.json`、`node_modules/`、`dist/`、微信预览二维码和本地临时文件。
- GitHub CLI 已重新登录账号 `zitao4588-create`；如果后续 token 失效，重新执行 `gh auth login -h github.com`。

## 2026-05-28 奶油玩具冰箱风格重构收尾

已完成：

- 首页和菜谱页完成“奶油玩具冰箱”视觉重构。
- 全局视觉系统已统一到奶油白、薄荷绿、冰蓝、蜂蜜橙、珊瑚红。
- 首页食材卡已从汉字占位改为本地品类图片 fallback。
- 菜谱页已改为美食推荐卡片，并使用本地 mock 菜品图。
- 新增本地 PNG 资产目录：
  - `images/mascot/`
  - `images/foods/`
  - `images/recipe/`
  - `images/decor/`
- 微信开发者工具 CLI 预览编译通过，预览二维码为：
  - `/private/tmp/fridge-app-preview-qrcode-style-v2.png`
- 当前小程序预览包体约 `1.8 MB`。

优先级高：

- 真机预览首页，重点看：
  - 顶部吉祥物状态卡是否显得精致但不过高
  - 搜索、三色统计和添加引导是否好点
  - 冰箱外壳、冰蓝内胆、玻璃抽屉是否层级清楚
  - 食材图片 fallback 是否比汉字圆圈自然
  - 食品详情弹窗图片是否清晰
- 真机预览菜谱页，重点看：
  - banner 是否像美食推荐而不是报告页
  - `菜谱盲盒 / 我来选食材` 两个入口是否容易理解
  - 菜品图片卡片是否过高或过挤
  - “换一批”、详情弹窗、“我来选食材”料理碗弹窗是否顺手
- 关注主包体积：
  - 后续新增图片前先压缩
  - 如果继续加大量图片，优先评估小程序分包

优先级中：

- 根据真机截图继续微调首页 `pages/index/index.wxss`，尤其是 dashboard 高度、分区卡间距和食材卡尺寸。
- 根据真机截图继续微调菜谱卡内容密度，必要时把卡片内食材信息压缩到一行，详情弹窗展示完整内容。
- 如果视觉稳定，下一步可以做食品详情信息增强，补充来源、生产日期、备注等更完整展示。

注意事项：

- 本轮仍不接真实 AI、真实 OCR、真实条形码库、真实天气或联网搜索。
- 新增图片资产是本地 mock 资产，不代表真实食品照片。
- 不要继续无控制增加主包图片，主包大小已经需要关注。

## 2026-05-28 日历页开饭雷达组件收尾

已完成：

- 日历页新增突出版 `开饭雷达检测报告`：
  - 冰蓝玻璃雷达盘
  - 本地规则 `可开饭指数`
  - 高 / 中 / 低区间说明
  - 今日优先用掉
  - 图片式推荐去化方案卡片
- 按用户蓝色批注完成精简：
  - 去掉 `今日厨房扫描`
  - 去掉 `今日扫描完成`
  - 雷达盘只显示 `可开饭指数` 和数字
  - 去掉报告卡内部重复的 `库存 / 临期 / 过期` 三项统计
- 微信开发者工具 CLI 预览编译通过：
  - `/private/tmp/fridge-app-preview-qrcode-calendar-radar-annotation.png`
  - 最新包体：`1,913,344 bytes`

优先级高：

- 真机预览日历页，重点看：
  - 雷达报告卡是否比原来更突出
  - `可开饭指数` 数字是否清晰
  - 右侧区间说明是否过密
  - 今日优先用掉条是否好点
  - 菜谱卡 `查看做法` 是否仍然顺手

优先级中：

- 如果区间说明仍显拥挤，可以考虑改为一行折叠提示，详情弹窗里展示完整说明。
- 如果雷达组件整体过高，可以压缩菜谱卡内标签数量，保留图片、菜名、匹配状态和查看做法。

注意事项：

- `可开饭指数` 是本地规则计算，不调用 AI。
- 不要在日历页雷达卡内恢复重复的三项统计，除非用户重新明确要求。

## 2026-05-28 首页搜索与菜谱页收敛收尾

已完成：

- 首页搜索栏已移动到冰箱分区组件顶部。
- 菜谱页只保留两个入口：
  - `菜谱盲盒`
  - `我来选食材`
- 菜谱页已去掉页面入口层的：
  - `微醺`
  - `饮品`
- 菜谱页顶部卡已调整为：
  - 标题：`雷达建议`
  - 小字：继续展示 `context.healthTip`
- `菜谱盲盒` 已调整为一次展示 3 道菜。
- 节气卡已改为预告规则：
  - 节气过后 1-3 天显示当前节气 `已过 X 天`
  - 超过 3 天显示下一个节气 `还有 X 天`
- “我来选食材”已继续优化：
  - 保留原功能名称
  - 已选区改为奶油陶瓷料理碗视觉
  - 支持库存点选、搜索库存和输入临时食材
  - 临时食材可生成后跳转添加页预填名称
  - 生成结果当天本地缓存，切页回来会恢复

优先级高：

- 真机预览首页，重点看：
  - 搜索栏是否位于分区组件顶部
  - 搜索栏是否和冰箱外壳/内胆融合自然
  - 搜索后分区内容是否仍正常过滤
- 真机预览菜谱页，重点看：
  - 顶部 `雷达建议` 和小字建议内容是否都在
  - 节气卡是否显示下一个节气预告
  - 菜谱盲盒是否一次展示 3 道菜
  - `换一批` 是否能正常切换
  - `我来选食材` 料理碗弹窗和生成逻辑是否仍正常
  - 切走菜谱页再回来是否能恢复最近一次“我来选食材”结果
  - 临时食材点击“加入库存”是否能预填添加页名称

优先级中：

- 如果菜谱卡过高，可继续压缩卡片内标签数量。
- 如果节气卡文案仍难懂，可考虑把 `还有 X 天` 改为 `距 XX 还有 X 天`。
- 上线前评估是否需要云端菜谱历史；当前本地缓存不能跨设备同步。

注意事项：

- 当前不要恢复 `微醺` 和 `饮品` 页面入口。
- 真实 AI、真实天气和真实联网搜索仍不在当前阶段。

## 2026-05-28 AI / OCR / 条码云函数部署后待办

已完成：

- 固定版本 CloudBase CLI 登录并部署 3 个云函数：
  - `parseFoodImage`
  - `parseBarcode`
  - `generateRecipes`
- 固定版本 CloudBase MCP 已安装到 Codex 配置：
  - `@cloudbase/cloudbase-mcp@2.20.1`
  - 路径：`/Users/qzt/.codex/mcp/cloudbase-mcp`
- 云端 smoke test 通过：
  - 图片识别无图片兜底正常
  - 条码识别兜底正常
  - 菜谱生成结构化返回正常

优先级高：

- 轮换此前暴露过的腾讯云访问密钥，并同步更新云函数环境变量。
- 真机验证真实拍照链路：
  - 拍食品
  - 拍包装
  - 拍购物小票
  - 每次都确认是否进入确认页、字段是否可编辑、保存后库存是否正常显示
- 真机验证菜谱页：
  - 首屏是否先显示本地结果
  - 云端返回后是否刷新
  - 云端 429 / 失败时是否无明显卡顿
- CloudBase 控制台查看 3 个云函数日志，确认 `providerStatus` 和 `fallbackReason` 可读。

优先级中：

- 如果真实 AI 继续返回 `429`，排查混元 / CloudBase AI 成长计划额度、模型名和调用频率。
- 如果启用联网搜索：
  - 新增联网搜索 API key 环境变量
  - 设置 `FRIDGE_ENABLE_REAL_SEARCH=true`
  - 重新 smoke test `parseBarcode` 和 `generateRecipes`
- 给确认页增加更清楚的“识别置信度 / 需要核对”提示，避免用户误以为真实识别结果一定准确。

注意事项：

- 不要把密钥写入任何 Markdown、代码、截图说明或 Git commit。
- CloudBase CLI `fn detail` 会打印环境变量值，后续不要把完整输出贴到文档或聊天里。
- MCP 新增工具通常需要重启 Codex 或新会话后才会出现在可用工具里。
