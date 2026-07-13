# CloudBase v2.0 家庭库存安全配置

本文是发布前人工配置清单，不会由本地代码自动修改线上数据库。

## 核心原则

- `items` 保持现有 `PRIVATE` 权限，个人库存继续由当前 `_openid` 创建者直连。
- 家庭食材的 `_openid` 统一写为家庭创建者；可编辑成员只能通过 `familyInventory` 访问，不能依赖自己的 `_openid` 直连。
- `accessMode: "family"` 和 `familyId` 用于业务路由与服务端校验，不再要求正式 `items` 切换自定义安全规则。
- `families`、`familyMembers`、`familyInvites`、`inventoryEvents` 均禁止小程序端直接读写。
- 云函数只使用 `cloud.getWXContext().OPENID`，不得信任前端传入的 openid、familyId 或 role。

## items 集合

保持现有 `PRIVATE` 权限，不切换自定义安全规则。

原因：截至 2026-07-13，正式 `items` 的 215 条历史记录均没有 `accessMode`；旧版客户端读取时也没有显式携带 `_openid` 和 `accessMode` 查询条件。CloudBase 自定义规则引用文档字段后，客户端查询必须包含对应条件，直接切换会造成历史数据或旧版客户端不可读。

家庭库存改用以下边界：

- 创建家庭时，创建者原有食材保留其 `_openid`，并写入 `familyId`、`accessMode: "family"`。
- 编辑成员加入家庭时，其迁入食材的 `_openid` 改为家庭创建者，同时保留真实成员记录和迁移记录。
- 家庭内新增食材的 `_openid` 始终写为家庭创建者，实际操作者通过成员记录和 `inventoryEvents.actorOpenid` 审计。
- 编辑成员退出或被移除后，其 `_openid` 不再匹配家庭食材，客户端无法绕过云函数直读。
- 家庭解散时，食材恢复为创建者个人库存，并写回 `accessMode: "personal"`。

## 家庭相关集合

以下集合全部使用拒绝客户端访问的规则：

```json
{
  "read": false,
  "write": false
}
```

- `families`
- `familyMembers`
- `familyInvites`
- `inventoryEvents`

## 上线顺序

1. 在测试环境创建四个家庭相关集合。
2. 部署 `familyInventory` 云函数。
3. 配置家庭集合拒绝客户端访问。
4. 核对 `items` 仍为 `PRIVATE`，不得切换为公开、所有用户可读或未经验证的自定义规则。
5. 用两个测试微信验证创建家庭、邀请和共同编辑；本次发布候选按用户决定跳过移除成员后的越权场景。
6. 验证通过后再上传体验版；不得先开放家庭入口再补家庭集合权限。

本次 v2.0 发布候选中，用户于 2026-07-13 明确决定跳过第 5 步里的“移除成员和越权失败”场景。该决定只解除当前推进阻断，不代表权限场景已验证；正式家庭集合仍必须执行拒绝客户端直连规则，出现成员权限异常时应立即停止上传或发布。

## 同环境隔离测试

如果账号只有一个正在承载 v1.x 的付费环境，不要为了测试直接修改线上 `items` 规则，也不要在无法确认价格时自动创建第二个环境。

测试部署可为 `familyInventory` 配置环境变量：

```text
FAMILY_COLLECTION_PREFIX=v2test_
```

此时云函数只访问以下隔离集合：

- `v2test_items`
- `v2test_families`
- `v2test_familyMembers`
- `v2test_familyInvites`
- `v2test_inventoryEvents`

这些集合应全部拒绝小程序端直接访问。测试阶段不得修改正式 `items` 的权限规则，也不得把测试集合中的记录迁回正式集合。正式发布前需要移除 `FAMILY_COLLECTION_PREFIX`，创建无前缀家庭集合并重新部署；`items` 继续保持 `PRIVATE`，再按本文件的上线顺序验证。

## 回滚

1. 暂停上传或发布包含家庭入口的版本。
2. 保留家庭集合和事件记录，不直接删除。
3. 将受影响家庭标记为暂停迁移，先导出核对后再恢复为个人库存。
4. 未确认数据归属前，不批量清空 `familyId` 或修改 `_openid`。
