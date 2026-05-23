import { useEffect, useState } from 'react'
import { BarChart3, ChefHat, Home, Pencil, Plus, Trash2, X } from 'lucide-react'

type Ingredient = {
  id: string
  name: string
  quantity: string
  unit: string
  category: string
  expiryDate: string
  location: string
  createdAt: string
}

type FormState = {
  name: string
  quantity: string
  unit: string
  category: string
  expiryDate: string
  location: string
}

type IngredientStatus = {
  label: string
  hint: string
  chipClassName: string
}

type ActiveTab = 'home' | 'add' | 'recommend' | 'stats'

type RecipeRule = {
  id: string
  dishName: string
  keywords: string[]
  method: string
}

type GenericRecipe = {
  id: string
  matches?: (item: Ingredient) => boolean
  getDishName: (item: Ingredient) => string
  getMethod: (item: Ingredient) => string
}

type MealRecommendation = {
  id: string
  dishName: string
  usedIngredients: Ingredient[]
  method: string
  reason: string
}

type MealRecommendationResult = {
  mode: 'priority' | 'random' | 'empty'
  recommendations: MealRecommendation[]
}

const STORAGE_KEY = 'fridge-items-v1'
const DAY_MS = 24 * 60 * 60 * 1000

const RECIPE_RULES: RecipeRule[] = [
  {
    id: 'tomato-egg-noodles',
    dishName: '番茄鸡蛋面',
    keywords: ['番茄', '西红柿', '鸡蛋', '面条', '挂面'],
    method:
      '番茄切块炒软，加水煮开，放入面条，最后淋入蛋液并按口味调盐。',
  },
  {
    id: 'vegetable-stir-fry',
    dishName: '清炒时蔬',
    keywords: [
      '青菜',
      '菠菜',
      '生菜',
      '白菜',
      '油麦菜',
      '西兰花',
      '胡萝卜',
      '蘑菇',
      '香菇',
      '蔬菜',
    ],
    method:
      '食材洗净切好，热锅少油快炒，出锅前加盐或少量生抽调味。',
  },
  {
    id: 'tofu-vegetable-soup',
    dishName: '豆腐蔬菜汤',
    keywords: ['豆腐', '青菜', '菠菜', '番茄', '西红柿', '蘑菇', '香菇'],
    method:
      '锅中加水煮开，放入豆腐和蔬菜煮几分钟，最后加盐调味。',
  },
  {
    id: 'egg-fried-rice',
    dishName: '鸡蛋炒饭',
    keywords: ['鸡蛋', '米饭', '胡萝卜', '玉米', '豌豆', '火腿', '葱'],
    method:
      '先炒鸡蛋盛出，再炒米饭和配菜，最后倒回鸡蛋翻匀调味。',
  },
  {
    id: 'yogurt-fruit-bowl',
    dishName: '酸奶水果碗',
    keywords: ['酸奶', '香蕉', '苹果', '草莓', '蓝莓', '芒果', '水果'],
    method:
      '水果切小块，倒入酸奶，按口味加入少量燕麦或坚果即可。',
  },
  {
    id: 'milk-oat-cup',
    dishName: '牛奶燕麦杯',
    keywords: ['牛奶', '燕麦', '香蕉', '草莓', '蓝莓'],
    method:
      '牛奶和燕麦拌匀，加入切好的水果，冷藏一会儿或直接食用。',
  },
  {
    id: 'quick-sandwich',
    dishName: '快手三明治',
    keywords: ['面包', '吐司', '鸡蛋', '生菜', '番茄', '西红柿', '黄瓜', '火腿'],
    method:
      '鸡蛋煎熟，和蔬菜、火腿一起夹进面包，按口味加少量酱料。',
  },
]

const GENERIC_RECIPES: GenericRecipe[] = [
  {
    id: 'dairy-breakfast-cup',
    matches: (item) => itemContainsAny(item, ['酸奶', '牛奶', '奶']),
    getDishName: (item) => `${item.name}早餐杯`,
    getMethod: (item) =>
      `${item.name}倒入碗里，加入水果或燕麦，搅匀后直接食用。`,
  },
  {
    id: 'dairy-smoothie',
    matches: (item) => itemContainsAny(item, ['酸奶', '牛奶', '奶']),
    getDishName: (item) => `${item.name}水果奶昔`,
    getMethod: (item) =>
      `${item.name}和香蕉或其他水果一起搅打，冷藏后口感更清爽。`,
  },
  {
    id: 'fruit-plate',
    matches: (item) =>
      itemContainsAny(item, ['香蕉', '苹果', '草莓', '蓝莓', '芒果', '水果']),
    getDishName: (item) => `${item.name}轻食水果碗`,
    getMethod: (item) =>
      `${item.name}切成小块，搭配酸奶、燕麦或坚果，拌匀即可。`,
  },
  {
    id: 'quick-plate',
    getDishName: (item) => `${item.name}快手拼盘`,
    getMethod: (item) =>
      `${item.name}按适合方式洗净、切块或加热，搭配主食一起吃。`,
  },
  {
    id: 'warm-bowl',
    getDishName: (item) => `${item.name}家常热碗`,
    getMethod: (item) =>
      `${item.name}切成适口大小，加热到熟透，最后按口味简单调味。`,
  },
  {
    id: 'simple-rice-bowl',
    getDishName: (item) => `${item.name}拌饭`,
    getMethod: (item) =>
      `${item.name}加热或焯熟后铺在米饭上，淋少量生抽或喜欢的酱汁。`,
  },
]

const initialFormState: FormState = {
  name: '',
  quantity: '',
  unit: '',
  category: '',
  expiryDate: '',
  location: '',
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDaysUntilExpiry(expiryDate: string) {
  return Math.round(
    (parseLocalDate(expiryDate).getTime() - getToday().getTime()) / DAY_MS,
  )
}

function getIngredientStatus(expiryDate: string): IngredientStatus {
  const diffDays = getDaysUntilExpiry(expiryDate)

  if (diffDays < 0) {
    return {
      label: '已过期',
      hint: `超过 ${Math.abs(diffDays)} 天`,
      chipClassName: 'bg-rose-100 text-rose-700 ring-rose-200',
    }
  }

  if (diffDays === 0) {
    return {
      label: '今天到期',
      hint: '建议优先处理',
      chipClassName: 'bg-amber-100 text-amber-700 ring-amber-200',
    }
  }

  if (diffDays <= 3) {
    return {
      label: '即将到期',
      hint: `还剩 ${diffDays} 天`,
      chipClassName: 'bg-orange-100 text-orange-700 ring-orange-200',
    }
  }

  return {
    label: '状态正常',
    hint: `还剩 ${diffDays} 天`,
    chipClassName: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  }
}

function formatExpiryDate(expiryDate: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parseLocalDate(expiryDate))
}

function getIngredientAmountText(item: Ingredient) {
  return [item.quantity, item.unit].filter(Boolean).join(' ')
}

function formatIngredientNames(items: Ingredient[], maxCount = 2) {
  return items
    .slice(0, maxCount)
    .map((item) => item.name)
    .join('、')
}

function getDailySeed() {
  const today = getToday()
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
}

function getStableHash(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function sortByDailySeed<T>(
  items: T[],
  seed: string,
  getKey: (item: T) => string,
) {
  return [...items].sort((left, right) => {
    return (
      getStableHash(`${seed}-${getKey(left)}`) -
      getStableHash(`${seed}-${getKey(right)}`)
    )
  })
}

function ingredientMatchesRule(item: Ingredient, rule: RecipeRule) {
  const searchableText = `${item.name} ${item.category}`.toLowerCase()

  return rule.keywords.some((keyword) =>
    searchableText.includes(keyword.toLowerCase()),
  )
}

function itemContainsAny(item: Ingredient, keywords: string[]) {
  const searchableText = `${item.name} ${item.category}`.toLowerCase()

  return keywords.some((keyword) =>
    searchableText.includes(keyword.toLowerCase()),
  )
}

function mergeIngredients(items: Ingredient[]) {
  const seenIds = new Set<string>()

  return items.filter((item) => {
    if (seenIds.has(item.id)) {
      return false
    }

    seenIds.add(item.id)
    return true
  })
}

function buildRecommendationReason(
  mode: MealRecommendationResult['mode'],
  items: Ingredient[],
) {
  const names = formatIngredientNames(items)

  if (mode === 'priority') {
    return `优先消耗快过期${names}，减少浪费。`
  }

  return `库存里有${names}，适合今天做一道简单菜。`
}

function buildMealRecommendations(
  sortedIngredients: Ingredient[],
): MealRecommendationResult {
  const usableIngredients = sortedIngredients.filter(
    (item) => getDaysUntilExpiry(item.expiryDate) >= 0,
  )

  if (usableIngredients.length === 0) {
    return {
      mode: 'empty',
      recommendations: [],
    }
  }

  const priorityIngredients = usableIngredients.filter((item) => {
    const diffDays = getDaysUntilExpiry(item.expiryDate)
    return diffDays >= 0 && diffDays <= 3
  })
  const mode: MealRecommendationResult['mode'] =
    priorityIngredients.length > 0 ? 'priority' : 'random'
  const seed = getDailySeed()
  const baseIngredients =
    mode === 'priority'
      ? priorityIngredients
      : sortByDailySeed(usableIngredients, seed, (item) => item.id)
  const recipeRules =
    mode === 'priority'
      ? RECIPE_RULES
      : sortByDailySeed(RECIPE_RULES, seed, (rule) => rule.id)
  const recommendations: MealRecommendation[] = []
  const usedDishNames = new Set<string>()

  recipeRules.forEach((rule) => {
    if (recommendations.length >= 3) {
      return
    }

    const matchedBaseIngredients = baseIngredients.filter((item) =>
      ingredientMatchesRule(item, rule),
    )

    if (matchedBaseIngredients.length === 0) {
      return
    }

    const matchedExtraIngredients = usableIngredients.filter((item) =>
      ingredientMatchesRule(item, rule),
    )
    const usedIngredients = mergeIngredients([
      ...matchedBaseIngredients,
      ...matchedExtraIngredients,
    ]).slice(0, 4)

    if (usedDishNames.has(rule.dishName)) {
      return
    }

    usedDishNames.add(rule.dishName)
    recommendations.push({
      id: rule.id,
      dishName: rule.dishName,
      usedIngredients,
      method: rule.method,
      reason: buildRecommendationReason(mode, matchedBaseIngredients),
    })
  })

  let genericIndex = 0

  while (recommendations.length < 3 && genericIndex < baseIngredients.length * 3) {
    const item = baseIngredients[genericIndex % baseIngredients.length]
    const availableGenericRecipes = GENERIC_RECIPES.filter((recipe) => {
      return !recipe.matches || recipe.matches(item)
    })
    const recipe =
      availableGenericRecipes[genericIndex % availableGenericRecipes.length]
    const relatedIngredients = usableIngredients
      .filter(
        (candidate) =>
          candidate.id !== item.id &&
          candidate.category &&
          candidate.category === item.category,
      )
      .slice(0, 2)
    const usedIngredients = [item, ...relatedIngredients]
    const dishName = recipe.getDishName(item)

    if (!usedDishNames.has(dishName)) {
      usedDishNames.add(dishName)
      recommendations.push({
        id: `${recipe.id}-${item.id}`,
        dishName,
        usedIngredients,
        method: recipe.getMethod(item),
        reason: buildRecommendationReason(mode, [item]),
      })
    }

    genericIndex += 1
  }

  return {
    mode,
    recommendations,
  }
}

function loadIngredients() {
  const savedValue = window.localStorage.getItem(STORAGE_KEY)

  if (!savedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(savedValue)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .filter((item) => {
        return (
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.expiryDate === 'string' &&
          typeof item.createdAt === 'string'
        )
      })
      .map((item): Ingredient => {
        return {
          id: item.id,
          name: item.name,
          quantity:
            typeof item.quantity === 'string'
              ? item.quantity
              : typeof item.note === 'string'
                ? item.note
                : '',
          unit: typeof item.unit === 'string' ? item.unit : '',
          category: typeof item.category === 'string' ? item.category : '',
          expiryDate: item.expiryDate,
          location: typeof item.location === 'string' ? item.location : '',
          createdAt: item.createdAt,
        }
      })
  } catch {
    return []
  }
}

function App() {
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [ingredients, setIngredients] = useState<Ingredient[]>(loadIngredients)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('home')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ingredients))
  }, [ingredients])

  const sortedIngredients = [...ingredients].sort((left, right) => {
    if (left.expiryDate !== right.expiryDate) {
      return left.expiryDate.localeCompare(right.expiryDate)
    }

    return right.createdAt.localeCompare(left.createdAt)
  })

  const expiredCount = sortedIngredients.filter(
    (item) => getDaysUntilExpiry(item.expiryDate) < 0,
  ).length
  const expiringSoonCount = sortedIngredients.filter((item) => {
    const diffDays = getDaysUntilExpiry(item.expiryDate)
    return diffDays >= 0 && diffDays <= 3
  }).length
  const categoryStats = Object.entries(
    sortedIngredients.reduce<Record<string, number>>((counts, item) => {
      const category = item.category.trim() || '未分类'
      counts[category] = (counts[category] ?? 0) + 1
      return counts
    }, {}),
  ).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return left[0].localeCompare(right[0], 'zh-CN')
  })
  const mealRecommendationResult = buildMealRecommendations(sortedIngredients)

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }))
  }

  function resetForm() {
    setFormState(initialFormState)
    setEditingId(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = formState.name.trim()

    if (!trimmedName || !formState.expiryDate) {
      return
    }

    const ingredientFields = {
      name: trimmedName,
      quantity: formState.quantity.trim(),
      unit: formState.unit.trim(),
      category: formState.category.trim(),
      expiryDate: formState.expiryDate,
      location: formState.location.trim(),
    }

    if (editingId) {
      setIngredients((currentItems) =>
        currentItems.map((item) =>
          item.id === editingId ? { ...item, ...ingredientFields } : item,
        ),
      )
      resetForm()
      setActiveTab('home')
      return
    }

    const nextIngredient: Ingredient = {
      id: crypto.randomUUID(),
      ...ingredientFields,
      createdAt: new Date().toISOString(),
    }

    setIngredients((currentItems) => [nextIngredient, ...currentItems])
    resetForm()
    setActiveTab('home')
  }

  function handleStartEdit(item: Ingredient) {
    setEditingId(item.id)
    setActiveTab('add')
    setFormState({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      expiryDate: item.expiryDate,
      location: item.location,
    })
  }

  function handleDelete(id: string) {
    setIngredients((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    )

    if (editingId === id) {
      resetForm()
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-slate-900">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-700/70">
          Fridge Stock
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {activeTab === 'home'
                ? '冰箱库存'
                : activeTab === 'add'
                  ? editingId
                    ? '编辑食材'
                    : '添加食材'
                  : activeTab === 'recommend'
                    ? '今天吃什么'
                    : '库存统计'}
            </h1>
            <p className="mt-2 max-w-60 text-sm leading-6 text-slate-600">
              {activeTab === 'home'
                ? '按到期时间查看食材，先处理临期和已过期。'
                : activeTab === 'add'
                  ? '把食材信息分开记录，之后查找和统计更清楚。'
                  : activeTab === 'recommend'
                    ? mealRecommendationResult.mode === 'priority'
                      ? '优先消耗临期食材，减少浪费。'
                      : '从现有库存里搭配三道快手菜。'
                    : '用简单卡片看分类占比和过期风险。'}
            </p>
          </div>

          <div className="rounded-[22px] bg-teal-700 px-4 py-3 text-right text-white shadow-lg shadow-teal-900/15">
            <p className="text-xs uppercase tracking-[0.2em] text-teal-100/80">
              当前库存
            </p>
            <p className="mt-1 text-3xl font-semibold leading-none">
              {ingredients.length}
            </p>
          </div>
        </div>
      </header>

      {activeTab === 'home' ? (
        <>
          <section className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 backdrop-blur">
              <p className="text-slate-500">总数</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {ingredients.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 backdrop-blur">
              <p className="text-slate-500">3天内</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600">
                {expiringSoonCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 backdrop-blur">
              <p className="text-slate-500">过期</p>
              <p className="mt-2 text-2xl font-semibold text-rose-600">
                {expiredCount}
              </p>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  库存列表
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  按到期时间从近到远排列
                </p>
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                {ingredients.length} 项
              </span>
            </div>

            <div className="space-y-3">
              {sortedIngredients.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-10 text-center backdrop-blur">
                  <p className="text-base font-medium text-slate-700">
                    还没有记录食材
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    点底部“添加”，先记录一条食材。
                  </p>
                </div>
              ) : (
                sortedIngredients.map((item) => {
                  const status = getIngredientStatus(item.expiryDate)
                  const amountText = getIngredientAmountText(item)

                  return (
                    <article
                      key={item.id}
                      className="rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-slate-950">
                              {item.name}
                            </h3>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${status.chipClassName}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                            {amountText ? <span>{amountText}</span> : null}
                            {item.category ? <span>{item.category}</span> : null}
                            {item.location ? <span>{item.location}</span> : null}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                              到期日 {formatExpiryDate(item.expiryDate)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                              {status.hint}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            aria-label={`编辑 ${item.name}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 transition hover:bg-teal-100 active:scale-95"
                          >
                            <Pencil size={18} strokeWidth={2.25} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            aria-label={`删除 ${item.name}`}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 active:scale-95"
                          >
                            <Trash2 size={18} strokeWidth={2.25} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>
        </>
      ) : null}

      {activeTab === 'add' ? (
        <section className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] backdrop-blur">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  食材名称
                </span>
                <input
                  required
                  type="text"
                  name="name"
                  value={formState.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  onInput={(event) =>
                    updateField('name', event.currentTarget.value)
                  }
                  placeholder="例如：牛奶、鸡蛋、菠菜"
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </label>

              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    数量
                  </span>
                  <input
                    type="text"
                    name="quantity"
                    value={formState.quantity}
                    onChange={(event) =>
                      updateField('quantity', event.target.value)
                    }
                    onInput={(event) =>
                      updateField('quantity', event.currentTarget.value)
                    }
                    placeholder="例如：1、半、500"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    单位
                  </span>
                  <input
                    type="text"
                    name="unit"
                    value={formState.unit}
                    onChange={(event) => updateField('unit', event.target.value)}
                    onInput={(event) =>
                      updateField('unit', event.currentTarget.value)
                    }
                    placeholder="盒"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    分类
                  </span>
                  <input
                    type="text"
                    name="category"
                    value={formState.category}
                    onChange={(event) =>
                      updateField('category', event.target.value)
                    }
                    onInput={(event) =>
                      updateField('category', event.currentTarget.value)
                    }
                    placeholder="例如：蔬菜"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">
                    存放位置
                  </span>
                  <input
                    type="text"
                    name="location"
                    value={formState.location}
                    onChange={(event) =>
                      updateField('location', event.target.value)
                    }
                    onInput={(event) =>
                      updateField('location', event.currentTarget.value)
                    }
                    placeholder="例如：冷藏层"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">
                  过期日期
                </span>
                <input
                  required
                  type="date"
                  name="expiryDate"
                  value={formState.expiryDate}
                  onChange={(event) =>
                    updateField('expiryDate', event.target.value)
                  }
                  onInput={(event) =>
                    updateField('expiryDate', event.currentTarget.value)
                  }
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.99]"
              >
                {editingId ? (
                  <Pencil size={18} strokeWidth={2.25} />
                ) : (
                  <Plus size={18} strokeWidth={2.25} />
                )}
                {editingId ? '保存修改' : '添加食材'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-[0.99]"
                  aria-label="取消编辑"
                >
                  <X size={18} strokeWidth={2.25} />
                </button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      {activeTab === 'recommend' ? (
        <section className="space-y-4">
          <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <ChefHat size={22} strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  今日推荐
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {mealRecommendationResult.mode === 'priority'
                    ? '已按 3 天内到期食材优先推荐。'
                    : mealRecommendationResult.mode === 'random'
                      ? '暂无临期食材，已从未过期库存中推荐。'
                      : '暂无可推荐食材。'}
                </p>
              </div>
            </div>
          </div>

          {mealRecommendationResult.recommendations.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-10 text-center backdrop-blur">
              <p className="text-base font-medium text-slate-700">
                还没有可推荐的菜品
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                添加未过期食材后，这里会显示 3 个简单菜品。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mealRecommendationResult.recommendations.map(
                (recommendation, index) => (
                  <article
                    key={recommendation.id}
                    className="rounded-[24px] border border-white/90 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-teal-700">
                          推荐 {index + 1}
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                          {recommendation.dishName}
                        </h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        快手菜
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-700">
                          使用库存
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {recommendation.usedIngredients.map((item) => {
                            const amountText = getIngredientAmountText(item)

                            return (
                              <span
                                key={item.id}
                                className="rounded-full bg-teal-50 px-3 py-1 text-teal-700 ring-1 ring-teal-100"
                              >
                                {item.name}
                                {amountText ? ` ${amountText}` : ''}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="font-medium text-slate-700">简单做法</p>
                        <p className="mt-1 leading-6 text-slate-600">
                          {recommendation.method}
                        </p>
                      </div>

                      <p className="leading-6 text-slate-500">
                        {recommendation.reason}
                      </p>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'stats' ? (
        <section className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 backdrop-blur">
              <p className="text-sm text-slate-500">已过期数量</p>
              <p className="mt-3 text-4xl font-semibold leading-none text-rose-600">
                {expiredCount}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 backdrop-blur">
              <p className="text-sm text-slate-500">3天内过期</p>
              <p className="mt-3 text-4xl font-semibold leading-none text-amber-600">
                {expiringSoonCount}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  各分类数量
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  按分类里的食材数量排序
                </p>
              </div>
            </div>

            {categoryStats.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-10 text-center backdrop-blur">
                <p className="text-base font-medium text-slate-700">
                  暂无统计数据
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  添加食材后，这里会显示分类数量。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryStats.map(([category, count]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white/85 px-4 py-4 backdrop-blur"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-950">
                        {category}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {count} 项食材
                      </p>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-lg font-semibold text-teal-700">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-white/80 bg-white/90 p-2 shadow-[0_18px_46px_-20px_rgba(15,23,42,0.4)] backdrop-blur">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-xs font-medium transition active:scale-[0.98] ${
              activeTab === 'home'
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Home size={19} strokeWidth={2.25} />
            首页
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-xs font-medium transition active:scale-[0.98] ${
              activeTab === 'add'
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Plus size={20} strokeWidth={2.35} />
            添加
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recommend')}
            className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-xs font-medium transition active:scale-[0.98] ${
              activeTab === 'recommend'
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <ChefHat size={19} strokeWidth={2.25} />
            推荐
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex h-14 flex-col items-center justify-center gap-1 rounded-[18px] text-xs font-medium transition active:scale-[0.98] ${
              activeTab === 'stats'
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={19} strokeWidth={2.25} />
            统计
          </button>
        </div>
      </nav>
    </main>
  )
}

export default App
