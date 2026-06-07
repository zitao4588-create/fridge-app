Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '冰箱',
        icon: '/images/tabbar/fridge.png',
        active: '/images/tabbar/fridge-active.png',
      },
      {
        pagePath: '/pages/calendar/calendar',
        text: '日历',
        icon: '/images/tabbar/calendar.png',
        active: '/images/tabbar/calendar-active.png',
      },
      {
        pagePath: '/pages/recipes/recipes',
        text: '菜谱',
        icon: '/images/tabbar/recipe.png',
        active: '/images/tabbar/recipe-active.png',
      },
    ],
  },

  methods: {
    switchTab(event) {
      const { path, index } = event.currentTarget.dataset

      if (index === this.data.selected) {
        return
      }

      wx.switchTab({ url: path })
    },
  },
})
