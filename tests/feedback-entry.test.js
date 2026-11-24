const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const aboutTemplate = fs.readFileSync(
  path.join(root, 'pages/about/about.wxml'),
  'utf8',
)
const recipesTemplate = fs.readFileSync(
  path.join(root, 'pages/recipes/recipes.wxml'),
  'utf8',
)
const aboutPage = fs.readFileSync(
  path.join(root, 'pages/about/about.js'),
  'utf8',
)

assert.match(aboutTemplate, /open-type="feedback"/)
assert.match(aboutTemplate, /提交问题反馈/)
assert.match(aboutTemplate, /3 个工作日/)
assert.match(aboutTemplate, /不保证实时回复/)
assert.match(aboutTemplate, /手机号/)
assert.match(aboutTemplate, /身份证/)
assert.match(aboutTemplate, /家庭库存截图/)
assert.match(aboutTemplate, /邀请口令/)
assert.doesNotMatch(aboutTemplate, /open-type="contact"/)
assert.doesNotMatch(recipesTemplate, /open-type="contact"/)
assert.doesNotMatch(aboutTemplate, /私人微信/)
assert.doesNotMatch(aboutPage, /services\//)
assert.match(recipesTemplate, /bindtap="handleOpenAbout"/)
assert.match(aboutTemplate, /v2\.3 提供手动录入/)
assert.match(aboutTemplate, /拍照识别.*尚未开放/)
assert.doesNotMatch(aboutTemplate, /一图一件/)

console.log('feedback-entry: 16 assertions passed')
