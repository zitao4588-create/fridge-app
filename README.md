# 冰箱小雷达 · Fridge Radar（微信小程序）

冰箱小雷达是一个**家庭冰箱库存管理**微信小程序：记录食材、按 5 大分区存放、跟踪保质期、提醒临期与过期，并在日历页用本地算法给出「开饭雷达」可开饭指数。

> 当前版本（v1.0）是**纯本地、不含 AI 的稳定版**，面向**个人主体**优先上线：不含 AI / 深度合成、不含拍照识别、无登录、无支付、无 UGC。拍照识别、AI 菜谱、会员支付等为后续迭代方向，详见下文 **Roadmap**（这些能力需要企业主体）。

English name: Fridge Radar. 本项目为微信小程序原生开发，早期的 React/Vite H5 脚手架已彻底移除，仓库即纯小程序工程。

## 截图

<table>
  <tr>
    <td align="center">
      <img src="docs/screenshots/home-fridge.png" width="220" alt="Fridge inventory home screen" />
      <br /><sub>分区货架（首页）</sub>
    </td>
    <td align="center">
      <img src="docs/screenshots/calendar-overview.png" width="220" alt="Expiry calendar overview" />
      <br /><sub>到期日历 + 开饭雷达</sub>
    </td>
  </tr>
</table>

> 截图为早期 UI，最新版已做轻奢黏土风格与无障碍重构，细节略有差异，后续会更新截图。

## 功能（当前 v1.0）

底部三个 Tab：**冰箱（首页）· 日历 · 菜谱**。

**首页**
- 5 个固定分区：冷藏区、冷冻区、门上储物格、果蔬抽屉、变温区，每区有独立色彩身份。
- 每个分区显示「库存 · 临期 · 过期」内联统计 + 横向食材卡片，右上角「＋ 加食材」直达添加。
- 吉祥物文案按库存状态（空 / 临期 / 过期 / 正常）动态显示。
- 搜索食材；点食材卡片查看详情（到期日、状态、备注），可编辑 / 删除。
- 食材缩略图按**品类 / 食材族群共用写实图**；**拍照录入接口已预留**（用户照片优先于系统图）。
- 底部「清空全部食品数据」（带二次确认）。

**日历**
- 月历视图标记到期日；总库存 / 临期 / 过期统计卡可展开清单。
- 选中日「到期」清单，可直接编辑 / 删除。
- **开饭雷达**：基于库存量、品类多样性、临期与过期风险的**纯本地评分**（可开饭指数），无任何云端 AI。

**菜谱**
- 占位页「菜谱搭配，敬请期待」（家常菜谱搭配方向，当前不提供任何生成功能）。
- 「隐私与数据」说明 + 查看隐私保护指引入口。

**工程**
- UI：TDesign 小程序组件 + 自定义「轻奢黏土」主题；已完成 WCAG 2.1 AA 无障碍整改（对比度、触控目标、`aria` 角色 / 标签、减少动效）。
- 体积：主包约 1.7MB；TDesign 通过**分包独立 npm**（`pkg-add`）放入分包，保证主包 < 2MB。

## Roadmap · 迭代方向

> **关键约束**：以下能力涉及 **AI / 深度合成** 或 **微信支付**，**个人主体小程序不可上线**（2026-05 的 AI 菜谱版本即因「深度合成技术、个人主体尚未开放服务类目」被驳回，建议企业主体）。因此从 v2 起，需先**升级 / 新注册「企业主体」小程序**再分阶段接入。

| 阶段 | 方向 | 主体要求 | 备注 |
|---|---|---|---|
| v1.x | 本地体验打磨、到期提醒（订阅消息）、食材图库扩充 | 个人主体可做 | 不触碰 AI / 支付 |
| v2.0 | **拍照识别**：拍食品 / 包装自动录入 | 需企业主体 | 云函数 `parseFoodImage` 已预留；前端入口待接回；取图已是「用户照片 > 系统图」 |
| v2.x | **AI 菜谱**：按库存 / 临期生成或推荐菜谱 | 需企业主体 | 菜谱图已按「做法 / 食材族群共用」治理铺好路（见 `NEXT_VERSION_GUIDE.md`） |
| v3.0 | **会员 / 支付**：会员权益与微信支付 | 需企业主体 + 微信支付 | 微信支付不对个人主体开放 |

设计上已为上述迭代留好接口：`utils/visualAssets.js` 的 `getIngredientVisual` 第一优先级即 `source==='photo' && imageFileId`，未来拍照录入只需给 item 写入照片即可，无需改取图逻辑；AI / OCR 能力均放在云函数侧，前端不保存或暴露任何服务商 API key。

## 技术栈

- 微信小程序原生（JavaScript / WXML / WXSS）
- 微信云开发 / Tencent CloudBase（云数据库 + 云函数）
- TDesign 小程序组件库（`pkg-add` 分包独立 npm）

云开发资源：

- AppID：`wx328e2b87665508e7`
- CloudBase 环境 ID：`cloud1-d3g4v0ms8ee56bd94`
- 云数据库集合：`items`、`reminders`、`parseLogs`、`fridgeZoneConfigs` 等
- 云函数（含为后续迭代预留、当前前端已收起的能力）：`getOpenId`、`parseFoodImage`、`generateRecipes`、`sendExpiryReminders` 等

> 以上 AppID 与环境 ID 是项目配置标识，不是可复用密钥。Fork 时请替换为自己的 AppID 与 CloudBase 环境。

## 仓库结构

```text
.
├── app.js / app.json / app.wxss      # 启动、页面/Tab 配置、全局样式
├── custom-tab-bar/                   # 自定义底部 TabBar（冰箱/日历/菜谱）
├── pages/                            # index 首页、calendar 日历、recipes 菜谱
├── pkg-add/                          # 分包：添加/编辑表单 + TDesign 独立 npm
├── services/                         # itemService / parseService / reminderService
├── utils/                            # constants / date / status / visualAssets
├── styles/                           # tokens、tdesign-theme 等共享样式
├── images/                           # 本地视觉素材（食材写实图、吉祥物、tabbar）
├── cloudfunctions/                   # CloudBase 云函数
├── docs/                             # 开源说明、CloudBase 设置、交付/治理文档
└── project.config.json               # 微信开发者工具配置（含分包独立 npm）
```

## 本地运行

1. 打开微信开发者工具，导入本仓库目录，使用项目内 `project.config.json`。
2. 确认识别到 `miniprogramRoot: "./"` 与 `cloudfunctionRoot: "cloudfunctions/"`。
3. 在 `pkg-add/` 下安装依赖并「构建 npm」（TDesign 走分包独立 npm）。
4. 编译运行。Fork 用户需配置自己的 CloudBase 环境，详见 [docs/CLOUDBASE_SETUP.md](docs/CLOUDBASE_SETUP.md)。

## 验证命令

本项目无构建步骤，提交前用 Node 语法检查关键脚本，并在微信开发者工具中编译运行 / 预览：

```bash
node --check app.js
node --check services/itemService.js
node --check services/parseService.js
node --check services/reminderService.js
node --check utils/visualAssets.js
node --check utils/constants.js
node --check pages/index/index.js
node --check pages/calendar/calendar.js
node --check pages/recipes/recipes.js
node --check pkg-add/item-form/item-form.js
```

## 当前不做

- 不做 Vercel / Supabase / Next.js / 独立后端 / Docker / 登录页。
- 不接真实条形码商品库；条形码入口已移除。
- 个人主体阶段不接 AI / 深度合成与微信支付（见 Roadmap）。
- AI、OCR、菜谱生成等能力一律留在云函数侧，前端不保存或暴露服务商 API key。

## 文档

- [NEXT_VERSION_GUIDE.md](NEXT_VERSION_GUIDE.md)：后续版本方向与图片资源治理
- [docs/handoff-index.md](docs/handoff-index.md)：UI 交付规格（全页面）
- [docs/a11y-checklist.md](docs/a11y-checklist.md)：无障碍整改清单（WCAG 2.1 AA）
- [docs/CLOUDBASE_SETUP.md](docs/CLOUDBASE_SETUP.md)：CloudBase 环境配置
- [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md)

## Contributing

Contributions are welcome. Please start by reading [CONTRIBUTING.md](CONTRIBUTING.md). Good first areas: 文档改进、配置说明修正、UI 文案优化、CloudBase 部署说明、可复现的小 bug 修复。

## Security

Please read [SECURITY.md](SECURITY.md) before reporting sensitive issues.

## License

MIT License. See [LICENSE](LICENSE).
