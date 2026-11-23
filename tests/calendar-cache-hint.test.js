const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

const ROOT = path.resolve(__dirname, '..')

function loadPage(relative, itemService) {
  const filename = path.join(ROOT, relative)
  const actualRequire = createRequire(filename)
  const replacements = {
    '../../services/itemService': itemService,
    '../../services/reminderService': { getCalendarEvents: () => ({}) },
  }
  let definition
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    Page(page) { definition = page },
    require(name) { return replacements[name] || actualRequire(name) },
    wx: { showToast() {} },
    setTimeout() { return 0 },
    clearTimeout() {},
  })
  const page = {
    ...definition,
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(patch, done) { Object.assign(this.data, patch); if (done) done() },
  }
  Object.assign(page.data, { year: 2026, monthIndex: 10, selectedDate: '2026-11-15' })
  return page
}

const ITEMS = [{ _id: 'a', name: '牛奶', expireDate: '2026-11-20', storageLocation: '冷藏' }]

function serviceWith(verifyResult, plainResult) {
  return {
    getItemsWithFamilyAccessCheckResult: () => verifyResult(),
    getItemsLoadResult: () => (plainResult || verifyResult)(),
  }
}

for (const page of ['pages/calendar/calendar.js', 'pages/index/index.js']) {
  const label = page.includes('calendar') ? '日历' : '首页'

  test(`${label}：新鲜缓存（权限已确认）正常切换不显示醒目提示`, async () => {
    for (const permissionState of ['personal', 'valid']) {
      const view = loadPage(page, serviceWith(async () => ({ items: ITEMS, source: 'cache', permissionState })))
      await view.loadItems({ verifyFamilyAccess: true })
      assert.equal(view.data.inventoryView.key, 'cache')
      assert.equal(view.data.inventoryView.showCard, false)
      assert.equal(view.data.inventoryView.canRetry, false)
      assert.equal(view.data.inventoryHasSnapshot, true)
    }
  })

  test(`${label}：真正读取失败只能显示旧数据时，才显示提示和重新读取`, async () => {
    let fail = false
    const view = loadPage(page, serviceWith(async () => {
      if (fail) throw new Error('network failed')
      return { items: ITEMS, source: 'cloud', permissionState: 'personal' }
    }))
    await view.loadItems({ verifyFamilyAccess: true })
    assert.equal(view.data.inventoryView.showCard, false)

    fail = true
    await view.loadItems() // 不重新校验权限的刷新失败，保留旧结果
    assert.equal(view.data.inventoryView.key, 'error-stale')
    assert.equal(view.data.inventoryView.showCard, true)
    assert.equal(view.data.inventoryView.canRetry, true)
    assert.equal(view.data.inventoryHasSnapshot, true)
  })

  test(`${label}：家庭权限无法确认时不展示旧的家庭数据`, async () => {
    let unverified = false
    const view = loadPage(page, serviceWith(async () => {
      if (unverified) {
        const error = new Error('timeout')
        error.inventoryAccessUnverified = true
        throw error
      }
      return { items: ITEMS, source: 'cache', permissionState: 'valid' }
    }))
    await view.loadItems({ verifyFamilyAccess: true })
    unverified = true
    await view.loadItems({ verifyFamilyAccess: true })
    assert.equal(view.data.inventoryView.key, 'permission-unverified')
    assert.equal(view.data.inventoryView.showCard, true)
    assert.equal(view.data.inventoryHasSnapshot, false)
    if (page.includes('calendar')) {
      assert.equal(view.inventoryItems.length, 0)
    } else {
      assert.equal(view.inventoryItems.length, 0)
    }
  })

  test(`${label}：家庭权限已失效时显示提示`, async () => {
    const view = loadPage(page, serviceWith(async () => ({ items: [], source: 'cache', permissionState: 'revoked' })))
    await view.loadItems({ verifyFamilyAccess: true })
    assert.equal(view.data.inventoryView.key, 'permission-revoked')
    assert.equal(view.data.inventoryView.showCard, true)
  })
}
