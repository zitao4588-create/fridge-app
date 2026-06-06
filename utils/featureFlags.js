// 功能开关：当前阶段优先稳定上线，AI 相关能力先收起，后续再接入。
// 重新开启 AI 时，把对应开关改为 true 即可；菜谱 Tab 的显示需另外在
// app.json 的 tabBar.list 中恢复（静态 JSON 无法读取此文件）。
const FEATURE_FLAGS = {
  // 菜谱 AI / 日历「开饭雷达」云端菜谱生成（generateRecipes 云函数）
  recipeAI: false,
  // 拍食品 / 拍包装 / 拍购物小票 识别入口（parseFoodImage 云函数）
  photoParse: false,
}

module.exports = {
  FEATURE_FLAGS,
}
