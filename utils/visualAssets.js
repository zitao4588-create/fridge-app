const FOOD_DEFAULT_IMAGE = '/images/foods/default.png'
const RECIPE_DEFAULT_IMAGE = '/images/recipe/default.png'

const CATEGORY_VISUALS = {
  '蔬菜': { image: '/images/foods/vegetable.png', className: 'vegetable' },
  '水果': { image: '/images/foods/fruit.png', className: 'fruit' },
  '肉蛋': { image: '/images/foods/egg.png', className: 'protein' },
  '乳制品': { image: '/images/foods/dairy.png', className: 'dairy' },
  '饮料': { image: '/images/foods/drink.png', className: 'drink' },
  '速冻': { image: '/images/foods/frozen.png', className: 'frozen' },
  '调料': { image: '/images/foods/seasoning.png', className: 'seasoning' },
  '主食': { image: '/images/foods/rice.png', className: 'staple' },
  '其他': { image: FOOD_DEFAULT_IMAGE, className: 'other' },
}

const INGREDIENT_EXACT_VISUALS = {
  '米饭': '/images/foods/rice.png',
  '白米饭': '/images/foods/rice.png',
  '鸡蛋': '/images/foods/egg.png',
  '鸭蛋': '/images/foods/egg.png',
  '牛肉': '/images/foods/beef.png',
  '猪肉': '/images/foods/pork.png',
  '鸡肉': '/images/foods/chicken.png',
  '鸡胸肉': '/images/foods/chicken.png',
  '虾仁': '/images/foods/shrimp.png',
  '虾': '/images/foods/shrimp.png',
  '鱼': '/images/foods/fish.png',
  '三文鱼': '/images/foods/salmon.png',
  '螃蟹': '/images/foods/crab.png',
  '蟹': '/images/foods/crab.png',
  '番茄': '/images/foods/tomato.png',
  '西红柿': '/images/foods/tomato.png',
  '苹果': '/images/foods/apple.png',
  '香蕉': '/images/foods/banana.png',
  '蓝莓': '/images/foods/blueberry.png',
  '牛奶': '/images/foods/milk.png',
  '酸奶': '/images/foods/yogurt.png',
  '奶酪': '/images/foods/cheese.png',
  '豆腐': '/images/foods/tofu.png',
  '面条': '/images/foods/noodle.png',
  '粥': '/images/foods/porridge.png',
  '饺子': '/images/foods/dumpling.png',
  '西兰花': '/images/foods/broccoli.png',
}

const INGREDIENT_FAMILY_VISUALS = [
  {
    className: 'protein',
    image: '/images/foods/beef.png',
    keywords: ['牛', '羊', '肉排', '肥牛', '牛腩'],
  },
  {
    className: 'protein',
    image: '/images/foods/pork.png',
    keywords: ['猪', '排骨', '五花', '里脊', '火腿', '午餐肉'],
  },
  {
    className: 'protein',
    image: '/images/foods/chicken.png',
    keywords: ['鸡', '鸡腿', '鸡翅', '鸡胸', '禽'],
  },
  {
    className: 'protein',
    image: '/images/foods/fish.png',
    keywords: ['鱼', '鲫', '鲈', '鳕', '金枪', '三文'],
  },
  {
    className: 'protein',
    image: '/images/foods/seafood.png',
    keywords: ['虾', '蟹', '贝', '蛤', '海鲜', '鱿鱼', '墨鱼'],
  },
  {
    className: 'dairy',
    image: '/images/foods/dairy.png',
    keywords: ['奶', '酸奶', '芝士', '奶酪', '黄油', '乳'],
  },
  {
    className: 'vegetable',
    image: '/images/foods/leafy.png',
    keywords: [
      '青菜',
      '生菜',
      '菠菜',
      '白菜',
      '油麦',
      '香菜',
      '芹菜',
      '韭菜',
      '叶菜',
    ],
  },
  {
    className: 'vegetable',
    image: '/images/foods/root.png',
    keywords: ['土豆', '萝卜', '胡萝卜', '山药', '莲藕', '红薯', '南瓜', '根茎'],
  },
  {
    className: 'vegetable',
    image: '/images/foods/mushroom.png',
    keywords: ['蘑菇', '香菇', '菌', '菇', '木耳', '银耳'],
  },
  {
    className: 'staple',
    image: '/images/foods/noodle.png',
    keywords: ['面', '粉', '米线', '河粉', '意面'],
  },
  {
    className: 'staple',
    image: '/images/foods/porridge.png',
    keywords: ['粥', '小米', '燕麦', '麦片'],
  },
  {
    className: 'staple',
    image: '/images/foods/staple.png',
    keywords: ['饭', '米', '馒头', '包子', '吐司', '面包', '主食'],
  },
  {
    className: 'drink',
    image: '/images/foods/juice.png',
    keywords: ['果汁', '茶', '饮料', '气泡水', '汽水', '椰汁'],
  },
  {
    className: 'frozen',
    image: '/images/foods/frozen.png',
    keywords: ['速冻', '冷冻', '冰淇淋', '雪糕', '冻'],
  },
]

const RECIPE_EXACT_VISUALS = {
  'tomato-egg': '/images/recipe/tomato-egg.png',
  'vegetable-tofu-soup': '/images/recipe/vegetable-tofu-soup.png',
  'egg-fried-rice': '/images/recipe/egg-fried-rice.png',
  'warm-noodle': '/images/recipe/warm-noodle.png',
  'yogurt-fruit-bowl': '/images/recipe/yogurt-fruit-bowl.png',
  'milk-oat-cup': '/images/recipe/milk-oat-cup.png',
  'stir-fry-greens': '/images/recipe/stir-fry-greens.png',
  'cucumber-egg-salad': '/images/recipe/cucumber-egg-salad.png',
  'blind-rice-bowl': '/images/recipe/blind-rice-bowl.png',
  'blind-soup': '/images/recipe/blind-soup.png',
  'blind-sandwich': '/images/recipe/blind-sandwich.png',
  'seasonal-mung-bean-soup': '/images/recipe/type-soup.png',
  'seasonal-lotus-pear-soup': '/images/recipe/type-soup.png',
  'seasonal-yam-congee': '/images/recipe/type-rice.png',
  'seasonal-tomato-tofu-soup': '/images/recipe/vegetable-tofu-soup.png',
  'seasonal-ginger-noodle': '/images/recipe/type-noodle.png',
  'tipsy-peach-tea': '/images/recipe/tipsy-peach-tea.png',
  'tipsy-citrus-soda': '/images/recipe/tipsy-citrus-soda.png',
  'healthy-apple-yogurt': '/images/recipe/healthy-apple-yogurt.png',
  'healthy-banana-milk': '/images/recipe/healthy-banana-milk.png',
}

const RECIPE_TITLE_EXACT_VISUALS = {
  '番茄炒蛋': '/images/recipe/tomato-egg.png',
  '西红柿炒蛋': '/images/recipe/tomato-egg.png',
  '蔬菜豆腐汤': '/images/recipe/vegetable-tofu-soup.png',
  '鸡蛋蔬菜炒饭': '/images/recipe/egg-fried-rice.png',
  '暖胃热汤面': '/images/recipe/warm-noodle.png',
  '酸奶水果碗': '/images/recipe/yogurt-fruit-bowl.png',
  '牛奶燕麦杯': '/images/recipe/milk-oat-cup.png',
  '清炒时蔬': '/images/recipe/stir-fry-greens.png',
  '黄瓜鸡蛋轻拌': '/images/recipe/cucumber-egg-salad.png',
}

const RECIPE_TITLE_VISUALS = [
  { keywords: ['番茄炒蛋', '西红柿炒蛋'], image: '/images/recipe/tomato-egg.png' },
  {
    keywords: ['蔬菜豆腐汤', '番茄豆腐'],
    image: '/images/recipe/vegetable-tofu-soup.png',
  },
  { keywords: ['鸡蛋炒饭', '炒饭'], image: '/images/recipe/egg-fried-rice.png' },
  { keywords: ['水果碗', '酸奶杯'], image: '/images/recipe/yogurt-fruit-bowl.png' },
]

const RECIPE_TYPE_VISUALS = [
  { keywords: ['汤', '羹', '煲'], image: '/images/recipe/type-soup.png' },
  { keywords: ['炒', '爆', '煎'], image: '/images/recipe/type-stir-fry.png' },
  { keywords: ['饭', '焖饭', '盖饭', '粥', '米'], image: '/images/recipe/type-rice.png' },
  { keywords: ['面', '粉', '米线', '河粉'], image: '/images/recipe/type-noodle.png' },
  { keywords: ['沙拉', '凉拌', '轻拌'], image: '/images/recipe/type-salad.png' },
  { keywords: ['蒸'], image: '/images/recipe/type-steam.png' },
  { keywords: ['炖', '烧', '焖', '卤'], image: '/images/recipe/type-braise.png' },
  {
    keywords: ['饮', '茶', '奶昔', '气泡', '汁', '杯'],
    image: '/images/recipe/type-drink.png',
  },
]

const RECIPE_FAMILY_VISUALS = [
  {
    keywords: ['虾', '蟹', '贝', '蛤', '鱼', '海鲜'],
    image: '/images/recipe/family-seafood.png',
  },
  {
    keywords: ['牛', '猪', '鸡', '肉', '排骨', '火腿'],
    image: '/images/recipe/family-meat.png',
  },
  { keywords: ['鸡蛋', '蛋', '滑蛋'], image: '/images/recipe/family-egg.png' },
  { keywords: ['豆腐'], image: '/images/recipe/vegetable-tofu-soup.png' },
  {
    keywords: [
      '青菜',
      '菠菜',
      '白菜',
      '西兰花',
      '蔬菜',
      '时蔬',
      '瓜',
      '笋',
      '藕',
      '萝卜',
    ],
    image: '/images/recipe/family-vegetable.png',
  },
  { keywords: ['菌', '菇', '木耳', '香菇'], image: '/images/recipe/family-mushroom.png' },
  {
    keywords: ['苹果', '香蕉', '水果', '酸奶', '牛奶', '乳'],
    image: '/images/recipe/family-fruit-dairy.png',
  },
]

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)))
}

function ensureImagePath(image, fallback) {
  return String(image || fallback || FOOD_DEFAULT_IMAGE)
}

function getIngredientVisual(item) {
  if (item && item.source === 'photo' && item.imageFileId) {
    return {
      type: 'photo',
      image: ensureImagePath(item.imageFileId, FOOD_DEFAULT_IMAGE),
      className: 'photo',
    }
  }

  const name = String((item && item.name) || '').trim()
  const exactImage = INGREDIENT_EXACT_VISUALS[name]

  if (exactImage) {
    return {
      type: 'icon',
      image: ensureImagePath(exactImage, FOOD_DEFAULT_IMAGE),
      className: 'ingredient',
    }
  }

  const text = normalizeText(`${name} ${(item && item.category) || ''}`)
  const family = INGREDIENT_FAMILY_VISUALS.find((entry) =>
    includesAny(text, entry.keywords),
  )

  if (family) {
    return {
      type: 'icon',
      image: ensureImagePath(family.image, FOOD_DEFAULT_IMAGE),
      className: family.className,
    }
  }

  const category = (item && item.category) || '其他'
  const categoryVisual = CATEGORY_VISUALS[category] || CATEGORY_VISUALS['其他']

  return {
    type: 'icon',
    image: ensureImagePath(categoryVisual.image, FOOD_DEFAULT_IMAGE),
    className: categoryVisual.className,
  }
}

function getRecipeText(recipe) {
  let parts = []

  if (recipe) {
    parts.push(recipe.id)
    parts.push(recipe.title)

    if (Array.isArray(recipe.ingredients)) {
      parts = parts.concat(recipe.ingredients)
    }

    if (Array.isArray(recipe.availableItems)) {
      parts = parts.concat(
        recipe.availableItems.map((item) => (item && item.name) || item),
      )
    }

    if (Array.isArray(recipe.missingItems)) {
      parts = parts.concat(recipe.missingItems)
    }
  }

  return parts.map(normalizeText).join(' ')
}

function findRecipeImage(entries, text) {
  const matched = entries.find((entry) => includesAny(text, entry.keywords))
  return matched ? matched.image : ''
}

function getRecipeVisual(recipe) {
  if (recipe && recipe.image) {
    return ensureImagePath(recipe.image, RECIPE_DEFAULT_IMAGE)
  }

  const id = recipe && recipe.id

  if (id && RECIPE_EXACT_VISUALS[id]) {
    return ensureImagePath(RECIPE_EXACT_VISUALS[id], RECIPE_DEFAULT_IMAGE)
  }

  const title = recipe && recipe.title

  if (title && RECIPE_TITLE_EXACT_VISUALS[title]) {
    return ensureImagePath(
      RECIPE_TITLE_EXACT_VISUALS[title],
      RECIPE_DEFAULT_IMAGE,
    )
  }

  const text = getRecipeText(recipe)

  return (
    ensureImagePath(
      findRecipeImage(RECIPE_TITLE_VISUALS, text) ||
        findRecipeImage(RECIPE_TYPE_VISUALS, text) ||
        findRecipeImage(RECIPE_FAMILY_VISUALS, text),
      RECIPE_DEFAULT_IMAGE,
    )
  )
}

module.exports = {
  getIngredientVisual,
  getRecipeVisual,
}
