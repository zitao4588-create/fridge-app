const COLLECTION_NAME = 'recipeRecords'
// 小程序端单次 get() 最多返回 20 条，超过需分页累加，否则收藏会被静默截断。
const PAGE_SIZE = 20

function getDb() {
  if (!wx.cloud) {
    throw new Error('当前环境不支持云开发')
  }

  return wx.cloud.database()
}

function cleanText(value) {
  return String(value || '').trim()
}

function cleanStringList(list, maxCount = 8) {
  return (Array.isArray(list) ? list : [])
    .map(cleanText)
    .filter(Boolean)
    .slice(0, maxCount)
}

function cleanRecipeItems(items, maxCount = 8) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      id: cleanText(item.id || item._id || item.name),
      name: cleanText(item.name),
      category: cleanText(item.category),
      expireDate: cleanText(item.expireDate),
      expiryHint: cleanText(item.expiryHint),
      storageLocation: cleanText(item.storageLocation),
    }))
    .filter((item) => item.name)
    .slice(0, maxCount)
}

function buildRecipeKey(recipe) {
  const id = cleanText(recipe && recipe.id)
  const title = cleanText(recipe && recipe.title)
  const sourceType = cleanText(recipe && recipe.sourceType)

  if (id) {
    return `${sourceType || 'recipe'}:${id}`
  }

  return `${sourceType || 'recipe'}:${title}`
}

function cleanContextSnapshot(context) {
  const safeContext = context || {}

  return {
    city: cleanText(safeContext.city),
    weather: cleanText(safeContext.weather),
    temperature: safeContext.temperature === undefined ? '' : String(safeContext.temperature),
    humidity: safeContext.humidity === undefined ? '' : String(safeContext.humidity),
    solarTermName: cleanText(safeContext.solarTermName),
    solarTermHint: cleanText(safeContext.solarTermHint),
    weatherSource: cleanText(safeContext.weatherSource),
    weatherUpdatedAt: cleanText(safeContext.weatherUpdatedAt),
    radarAdvice: cleanText(safeContext.radarAdvice || safeContext.healthTip),
  }
}

function cleanRecordPayload(payload) {
  const recipe = payload.recipe || {}
  const recipeKey = cleanText(payload.recipeKey) || buildRecipeKey(recipe)

  return {
    recipeKey,
    recipeId: cleanText(recipe.id),
    title: cleanText(recipe.title),
    image: cleanText(recipe.image),
    reason: cleanText(recipe.reason),
    sourceType: cleanText(recipe.sourceType),
    matchLabel: cleanText(recipe.matchLabel),
    canCook: Boolean(recipe.canCook),
    timeCost: cleanText(recipe.timeCost),
    difficulty: cleanText(recipe.difficulty),
    tags: cleanStringList(recipe.tags, 6),
    seasonTags: cleanStringList(recipe.seasonTags, 6),
    availableItems: cleanRecipeItems(recipe.availableItems),
    missingItems: cleanStringList(recipe.missingItems),
    priorityItems: cleanRecipeItems(recipe.priorityItems),
    steps: cleanStringList(recipe.steps, 6),
    safetyNote: cleanText(recipe.safetyNote),
    contextSnapshot: cleanContextSnapshot(payload.context),
  }
}

function fetchRecordsPage(offset, collected) {
  return getDb()
    .collection(COLLECTION_NAME)
    .orderBy('createdAt', 'desc')
    .skip(offset)
    .limit(PAGE_SIZE)
    .get()
    .then((res) => {
      const records = res.data || []
      const nextRecords = collected.concat(records)

      if (records.length < PAGE_SIZE) {
        return nextRecords
      }

      return fetchRecordsPage(offset + PAGE_SIZE, nextRecords)
    })
}

function getRecipeRecords() {
  if (!wx.cloud) {
    return Promise.resolve([])
  }

  return fetchRecordsPage(0, []).catch(() => [])
}

function saveRecipeRecord(payload) {
  const now = Date.now()
  const data = {
    ...cleanRecordPayload(payload),
    updatedAt: now,
  }

  if (!data.recipeKey || !data.title) {
    return Promise.reject(new Error('菜谱信息不完整'))
  }

  const collection = getDb().collection(COLLECTION_NAME)

  return collection
    .where({
      recipeKey: data.recipeKey,
    })
    .limit(1)
    .get()
    .then((res) => {
      const existing = res.data && res.data[0]

      if (existing && existing._id) {
        return collection.doc(existing._id).update({ data }).then(() => ({
          ...existing,
          ...data,
        }))
      }

      return collection
        .add({
          data: {
            ...data,
            createdAt: now,
          },
        })
        .then((addRes) => ({
          _id: addRes._id,
          ...data,
          createdAt: now,
        }))
    })
}

function deleteRecipeRecord(id) {
  if (!id) {
    return Promise.reject(new Error('缺少收藏记录 ID'))
  }

  return getDb().collection(COLLECTION_NAME).doc(id).remove()
}

module.exports = {
  buildRecipeKey,
  deleteRecipeRecord,
  getRecipeRecords,
  saveRecipeRecord,
}
