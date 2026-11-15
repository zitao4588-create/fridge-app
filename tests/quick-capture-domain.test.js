const assert = require('assert')
const {
  buildManualFallbackUrl,
  classifySelectionError,
  normalizeSelectedMedia,
} = require('../utils/quickCapture')

assert.deepStrictEqual(
  normalizeSelectedMedia({
    tempFiles: [{ tempFilePath: '  wxfile://food.jpg  ', size: 2048 }],
  }),
  {
    tempFilePath: 'wxfile://food.jpg',
    size: 2048,
    fileType: 'image',
  },
)
assert.strictEqual(normalizeSelectedMedia({ tempFiles: [] }), null)
assert.strictEqual(normalizeSelectedMedia(null), null)
assert.deepStrictEqual(classifySelectionError({ errMsg: 'chooseMedia:fail cancel' }), {
  cancelled: true,
  message: '',
})
assert.deepStrictEqual(classifySelectionError({ errMsg: 'chooseMedia:fail auth deny' }), {
  cancelled: false,
  message: '没有相机或相册权限，请授权后重试，或使用手动填写',
})
assert.deepStrictEqual(
  classifySelectionError({
    errMsg: 'chooseMedia:fail api scope is not declared in the privacy agreement',
  }),
  {
    cancelled: false,
    message: '当前图片隐私配置尚未完成，请先使用手动填写',
  },
)
assert.deepStrictEqual(classifySelectionError({ errMsg: 'chooseMedia:fail timeout' }), {
  cancelled: false,
  message: '图片选择超时，请重试，或使用手动填写',
})
assert.deepStrictEqual(classifySelectionError({ errMsg: 'chooseMedia:fail system error' }), {
  cancelled: false,
  message: '图片选择失败，请重试，或使用手动填写',
})
assert.strictEqual(
  buildManualFallbackUrl({ storageLocation: '果蔬抽屉' }),
  '/pkg-add/item-form/item-form?entry=photoFallback&smartRecommend=1&storageLocation=%E6%9E%9C%E8%94%AC%E6%8A%BD%E5%B1%89',
)
assert.strictEqual(
  buildManualFallbackUrl(),
  '/pkg-add/item-form/item-form?entry=photoFallback&smartRecommend=1',
)

console.log('quick-capture-domain: 10 assertions passed')
