const itemService = require('../../services/itemService')
const recipeService = require('../../services/recipeService')

Page({
  data: {
    loading: false,
    recommendations: [],
  },

  onShow() {
    this.loadRecipes()
  },

  loadRecipes() {
    this.setData({
      loading: true,
    })

    itemService
      .getItems()
      .then((items) => {
        this.setData({
          loading: false,
          recommendations: recipeService.getRecipeRecommendations(items),
        })
      })
      .catch(() => {
        this.setData({
          loading: false,
        })
        wx.showToast({
          title: '读取失败',
          icon: 'none',
        })
      })
  },
})

