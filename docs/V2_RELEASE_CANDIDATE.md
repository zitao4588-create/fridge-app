# 冰箱小雷达 v2.0 M4 发布候选报告

日期：2026-07-12

完成等级：C3 已完成正式后端切换；双账号核心链路和餐盘真机手势已通过。用户决定跳过成员移除后的越权验证，该风险保留但不再阻断提审。前端尚未上传、提审或发布。

## 版本范围

- 可选数量：`quantityTracked`、正整数、仅显示 `×N`、不显示单位。
- 库存闭环：常温分区、餐盘消耗、默认减 1、移出库存、短时撤销。
- 私有家庭共享：单家庭、`owner/editor`、微信邀请、撤回、过期、成员移除和退出。
- 服务端权限：OPENID 取自微信上下文，家庭集合禁止客户端直连，家庭食材统一归家庭创建者 `_openid`。
- 明确排除：健康余额、AI、识别、支付、会员、公开 UGC、多家庭和独立后端。

## 主要文件

- `services/itemService.js`、`services/familyService.js`
- `utils/inventory.js`、`utils/constants.js`
- `pages/index/*`、`pages/family/*`、`pkg-add/item-form/*`
- `cloudfunctions/familyInventory/*`
- `tests/inventory-domain.test.js`、`tests/family-domain.test.js`
- `docs/CLOUDBASE_V2_SECURITY.md`

## 本地验证证据

- 30 个 JavaScript 文件执行 `node --check`，全部通过。
- 20 个 JSON 文件执行 `jq empty`，全部通过。
- 数量与消耗领域测试：8 项断言通过。
- 家庭角色、邀请、共享消耗、集合隔离、家庭食材归属和缺失文档识别：15 项断言通过。
- `git diff --check` 通过。
- 微信开发者工具 Stable `2.01.2510290`、基础库 `3.15.2` 普通编译：Errors 0，问题 0。
- 首页实际渲染家庭入口和第六个常温分区。
- 添加页实际渲染“记录数量”开关和“常温”选项。
- 正式上传前微信开发者工具预览成功：总包 720.4 KB，主包 437.5 KB，`pkg-add` 分包 282.9 KB，均低于单包 2 MB 限制。

## 未验证项目

- 测试版 `familyInventory` 和 5 个 `v2test_*` 集合保留用于隔离证据；四个无前缀正式家庭集合已创建并设为 `ADMINONLY`。
- 正式 `items` 保持 `PRIVATE`；预检确认不应切换依赖 `accessMode` 的自定义规则。
- 双微信账号邀请、加入、共享写入和成员消耗已通过；成员移除后的越权失败由用户明确跳过，仍属于未验证权限风险。
- 餐盘真机手势已通过：拖动期间页面与分区横向列表保持静止，松手后恢复正常滚动。
- `familyInventory` 已移除测试前缀并部署安全修正版；未操作生产数据迁移、体验版上传、提审或发布。

## C3 测试环境策略

- 当前账号只有一个承载 v1.x 的个人版环境，且新建环境会自动下单；未确认价格前不创建第二个环境。
- C3 改用同环境隔离集合：云函数设置 `FAMILY_COLLECTION_PREFIX=v2test_`，所有家庭和库存测试数据只写入 `v2test_*`。
- 测试阶段不修改正式 `items` 集合的权限或数据。
- 正式切换已完成：测试前缀已移除，无前缀家庭集合均为 `ADMINONLY`；体验版仍需执行完整真机验收。

## C3 当前证据（2026-07-13）

- 已创建 5 个 `v2test_*` 集合并全部设为 `ADMINONLY`。
- 隔离测试阶段的 `familyInventory` 为 Active、运行时 `Nodejs18.15`，当时使用 `FAMILY_COLLECTION_PREFIX=v2test_`；正式后端状态见下节。
- 小程序端直读测试集合返回 `DATABASE_PERMISSION_DENIED`；正式个人库存读取仍成功。
- 单账号云端冒烟通过：家庭状态、创建食材、数量减 1、撤销、无数量移出、邀请创建和撤回。
- 双账号核心链路通过：有效邀请被第二账号使用，云端形成 `owner/editor` 两名有效成员；两个账号的数据进入同一家庭库存，第二账号实际产生删除事件。
- 餐盘真机手势通过：第一版仅用 `page-meta` 锁页在真机无效，第二版改为拖动时动态启用 `catchtouchmove`，页面与横向列表不再跟随移动。
- 正式 `items` 当前为 215 条，均缺少 `accessMode`；未修改正式权限和数据，后续继续保持 `PRIVATE`。
- 成员移除后的越权失败已由用户决定跳过；前端仍未上传体验版，因此完成等级不能提升为 C4。

## 正式后端状态（2026-07-13）

- `families`、`familyMembers`、`familyInvites`、`inventoryEvents` 已创建，当前记录数均为 0，权限均为 `ADMINONLY`。
- `items` 为 215 条，权限仍为 `PRIVATE`，未批量写入 `accessMode` 或修改 `_openid`。
- `familyInventory` 为 `Active / Available`，运行时 `Nodejs18.15`，环境变量列表为空。
- 线上代码已包含 `getFamilyOwnerOpenid` 和 `_openid: ownerOpenid` 安全修正。
- 管理端无微信身份调用返回稳定 `NOT_AUTHENTICATED`，未写入正式家庭或库存数据。

## 部署与迁移顺序

1. 在测试环境创建 `families`、`familyMembers`、`familyInvites`、`inventoryEvents`。
2. 部署 `familyInventory`，用测试 OPENID 调用 `getFamilyState`。
3. 配置家庭集合拒绝客户端访问。
4. 核对 `items` 继续保持 `PRIVATE`；家庭食材的 `_openid` 统一写为家庭创建者。
5. 创建家庭时由成员记录先进入 `migrating`；迁移完整后才切为 `active`。
6. 迁移失败时调用 `retryMigration`，家庭成员不会读取半迁移库存。
7. 完成双账号和真机验收后，才上传包含家庭入口的体验版。

## 回滚

- 家庭入口尚未发布时，直接停止后续上传，不删除任何云端集合。
- 云端验证失败时保留家庭、成员、邀请和事件记录，先导出核对。
- 不批量修改 `_openid`、`familyId` 或 `accessMode`。
- 只有创建者移除其他成员后才能解散；云函数将家庭食材恢复为创建者个人库存，再归档家庭。

## 发布文案

冰箱小雷达 v2.0 用于受邀家庭成员共同管理私有冰箱库存，支持可选数量、常温储物和餐盘式消耗。不提供公开内容发布、评论、聊天、陌生人发现或社区功能。
