const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const privatePages = [
  'pages/index/index.js',
  'pages/calendar/calendar.js',
  'pages/family/family.js',
  'pkg-add/item-form/item-form.js',
]

privatePages.forEach((file) => {
  assert.doesNotMatch(read(file), /onShareTimeline\s*\(/)
})

;[
  'pages/index/index.js',
  'pages/calendar/calendar.js',
  'pages/family/family.js',
  'pkg-add/item-form/item-form.js',
].forEach((file) => {
  assert.match(read(file), /onShareAppMessage\s*\(/)
})

const familyPage = read('pages/family/family.js')
const familyShareBlock = familyPage.slice(
  familyPage.indexOf('onShareAppMessage()'),
  familyPage.indexOf('handleRevokeInvite()'),
)
assert.match(familyShareBlock, /\?invite=\$\{encodeURIComponent\(invite\.inviteCode\)\}/)
assert.doesNotMatch(familyShareBlock, /familyId|openid|itemId|imageFileId/)

const timelinePages = [
  'pages/about/about.js',
  'pages/features/features.js',
  'pages/privacy/privacy.js',
  'pages/recipes/recipes.js',
]

const actualTimelinePages = fs
  .readdirSync(path.join(ROOT, 'pages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `pages/${entry.name}/${entry.name}.js`)
  .filter((file) => fs.existsSync(path.join(ROOT, file)))
  .filter((file) => /onShareTimeline\s*\(/.test(read(file)))
  .sort()

assert.deepStrictEqual(actualTimelinePages, timelinePages)

timelinePages.forEach((file) => {
  const source = read(file)
  assert.doesNotMatch(source, /require\(['"]\.\.\/\.\.\/services\//)
  assert.match(source, /onShareTimeline\s*\(\)/)
})

console.log('share-entry: 19 assertions passed')
