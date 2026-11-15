const assert = require('assert')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const itemServiceSource = fs.readFileSync(
  path.join(projectRoot, 'services', 'itemService.js'),
  'utf8'
)
const familyInventorySource = fs.readFileSync(
  path.join(projectRoot, 'cloudfunctions', 'familyInventory', 'index.js'),
  'utf8'
)
const recognitionCandidateSource = fs.readFileSync(
  path.join(projectRoot, 'utils', 'recognitionCandidate.js'),
  'utf8'
)
const captureSessionSource = fs.readFileSync(
  path.join(
    projectRoot,
    'cloudfunctions',
    'captureImageSession',
    'index.js'
  ),
  'utf8'
)

assert.ok(
  !itemServiceSource.includes('parseRawText: payload.parseRawText'),
  '个人库存写入不得继续保存 OCR 原文'
)
assert.ok(
  !familyInventorySource.includes('parseRawText: payload.parseRawText'),
  '家庭库存写入不得继续保存 OCR 原文'
)
assert.ok(
  itemServiceSource.includes('delete safeItem.parseRawText'),
  '个人库存读取必须剥离历史 OCR 原文字段'
)
assert.ok(
  familyInventorySource.includes('delete safeItem.parseRawText'),
  '家庭库存读取必须剥离历史 OCR 原文字段'
)
assert.ok(
  familyInventorySource.includes('before: stripSensitiveLegacyFields(item)'),
  '家庭库存事件不得复制历史 OCR 原文'
)
assert.ok(
  !recognitionCandidateSource.includes('parseRawText'),
  '本地候选清洗结果不得暴露 OCR 原文字段'
)
assert.ok(
  !itemServiceSource.includes('imageFileId: payload.imageFileId'),
  '个人库存普通写入不得接受前端任意图片 fileId'
)
assert.ok(
  !familyInventorySource.includes('imageFileId: payload.imageFileId'),
  '家庭库存普通写入不得接受前端任意图片 fileId'
)
assert.ok(
  itemServiceSource.includes('delete safeItem.imageCaptureId'),
  '个人库存读取不得向前端暴露图片会话 ID'
)
assert.ok(
  familyInventorySource.includes('delete safeItem.imageCaptureId'),
  '家庭库存读取不得向前端暴露图片会话 ID'
)
assert.ok(
  captureSessionSource.includes(".collection('familyMembers')"),
  '家庭图片绑定事务必须重新读取家庭成员'
)
assert.ok(
  captureSessionSource.includes(
    '.doc(getMemberId(item.familyId, payload.ownerOpenid))'
  ),
  '家庭图片绑定事务必须读取当前用户的确定性成员记录'
)
assert.ok(
  captureSessionSource.includes("membership.status !== 'active'"),
  '家庭图片绑定事务必须拒绝非活跃成员'
)
assert.ok(
  captureSessionSource.indexOf("membership.status !== 'active'") <
    captureSessionSource.indexOf(
      "await transaction.collection('items').doc(payload.itemId).update"
    ),
  '家庭权限复核必须发生在附件写入之前'
)

console.log('privacy-field-boundary: 14 assertions passed')
