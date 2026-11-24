const assert = require('assert')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const itemServiceSource = fs.readFileSync(
  path.join(projectRoot, 'services', 'itemService.js'),
  'utf8',
)
const personalHandlerSource = fs.readFileSync(
  path.join(projectRoot, 'backend', 'personal.cjs'),
  'utf8',
)
const familyHandlerSource = fs.readFileSync(
  path.join(projectRoot, 'backend', 'family', 'handler.cjs'),
  'utf8',
)

assert.ok(
  !itemServiceSource.includes('parseRawText: payload.parseRawText'),
  '个人库存写入不得继续保存 OCR 原文',
)
assert.ok(
  !familyHandlerSource.includes('parseRawText: payload.parseRawText'),
  '家庭库存写入不得继续保存 OCR 原文',
)
assert.ok(
  !personalHandlerSource.includes('parseRawText:'),
  '个人后端接口不得写入 OCR 原文',
)
assert.ok(
  itemServiceSource.includes('delete safeItem.parseRawText'),
  '个人库存读取必须剥离历史 OCR 原文字段',
)
assert.ok(
  familyHandlerSource.includes('delete safeItem.parseRawText'),
  '家庭库存读取必须剥离历史 OCR 原文字段',
)
assert.ok(
  familyHandlerSource.includes('before: stripSensitiveLegacyFields(item)'),
  '家庭库存事件不得复制历史 OCR 原文',
)
assert.ok(
  personalHandlerSource.includes('const { parseRawText, imageCaptureId, _openid, ...client } = item'),
  '个人后端返回必须剥离敏感及内部字段',
)
assert.ok(
  !itemServiceSource.includes('imageFileId: payload.imageFileId'),
  '个人库存普通写入不得接受前端任意图片 fileId',
)
assert.ok(
  !familyHandlerSource.includes('imageFileId: payload.imageFileId'),
  '家庭库存普通写入不得接受前端任意图片 fileId',
)
assert.ok(
  itemServiceSource.includes('delete safeItem.imageCaptureId'),
  '个人库存读取不得向前端暴露图片会话 ID',
)
assert.ok(
  familyHandlerSource.includes('delete safeItem.imageCaptureId'),
  '家庭库存读取不得向前端暴露图片会话 ID',
)

console.log('privacy-field-boundary: 11 assertions passed')
